const ALBUMS_INDEX = 2;
const DWELL_MS = 380;

let loaded = false;
let dwellTimer: number | null = null;
let revealStarted = false;

function swapInImages() {
  if (loaded) return;
  loaded = true;
  document
    .querySelectorAll<HTMLImageElement>(
      '.space[data-space="albums"] [data-album-src]'
    )
    .forEach((img) => {
      const src = img.dataset.albumSrc;
      if (!src) return;
      const absolute = new URL(src, location.origin).href;
      if (img.src === absolute) return;

      const markLoaded = () => {
        img.closest<HTMLElement>(".cover")?.classList.add("is-loaded");
      };
      if (img.complete && img.naturalHeight > 0) {
        markLoaded();
      } else {
        img.addEventListener("load", markLoaded, { once: true });
        img.addEventListener("error", markLoaded, { once: true });
      }
      img.src = src;
    });
}

function setupReveal() {
  if (revealStarted) return;

  const scroller = document.querySelector<HTMLElement>(
    '.space[data-space="albums"]'
  );
  // If the scroller isn't in the DOM yet, bail without latching — a later
  // call (e.g. on the next spaces:change) can retry.
  if (!scroller) return;
  revealStarted = true;

  // CSS transitions drive the fade-in. IO only flips a class. No tweens,
  // no frame loops — the browser composites a single opacity transition
  // per cover, which is cheap and never collides with hover tweens.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    },
    { root: scroller, threshold: 0.04 }
  );

  scroller
    .querySelectorAll<HTMLElement>("[data-album-entry]")
    .forEach((el) => io.observe(el));
}

// Hover scale is driven by CSS `:hover` + `transition` on .cover-img.
// See AlbumsSpace.astro. Using CSS avoids a class of GSAP quirks around
// individual-transform CSS properties (`scale`/`rotate`/`translate`)
// leaving stale `scale: none` inline state on cleanup.

function activate() {
  if (loaded && revealStarted) return;
  // Both swapInImages and setupReveal are idempotent — they guard their
  // own state — so calling activate() after a partial prior run safely
  // completes whichever step was missing.
  swapInImages();
  requestAnimationFrame(() => {
    setupReveal();
  });
}

function scheduleDwellLoad() {
  // Gate on BOTH flags: if loaded latched true but reveal setup failed
  // (e.g. scroller not in DOM yet during hydration), a later dwell pass
  // can retry the IO wiring.
  if (loaded && revealStarted) return;
  if (dwellTimer) window.clearTimeout(dwellTimer);
  dwellTimer = window.setTimeout(() => {
    dwellTimer = null;
    activate();
  }, DWELL_MS);
}

function cancelDwell() {
  if (dwellTimer) {
    window.clearTimeout(dwellTimer);
    dwellTimer = null;
  }
}

export function initAlbums(): void {
  const onAlbums = () => {
    const active = document.querySelector<HTMLAnchorElement>(
      "header nav a.active"
    );
    return active?.getAttribute("href") === "/albums";
  };

  // Direct URL landing on /albums: commit immediately (the user has
  // already declared intent). We still wait one RAF so layout settles.
  if (onAlbums()) {
    requestAnimationFrame(activate);
  }

  window.addEventListener("spaces:change", (e) => {
    const idx = (e as CustomEvent).detail?.index;
    if (idx === ALBUMS_INDEX) {
      scheduleDwellLoad();
    } else {
      cancelDwell();
    }
  });
}
