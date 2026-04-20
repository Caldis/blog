# Spaces Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `/thoughts`, `/projects`, `/about` into a macOS-desktop-spaces-style horizontal container with drag/wheel/keyboard/click navigation. `/thoughts/[slug]` stays separate and uses an Astro View Transition fade.

**Architecture:** One new `SpacesLayout.astro` renders all three spaces in a flex track with `translate3d`-based positioning. Route files pass `activeIndex`. A client module (`spaces.ts`) takes over after mount for gestures, keyboard, nav clicks, `popstate`, and `history.pushState`. For the spaces ↔ detail-page transition we use the native CSS `@view-transition { navigation: auto; }` rule — Chromium does a cross-document opacity fade for free when both pages mark the relevant element with `view-transition-name: page`. No Astro `<ClientRouter />`, no SPA routing.

**Tech Stack:** Astro 5, vanilla TypeScript, native CSS. No frameworks added. No test runner in repo — verification uses `npm run build` (catches type/template errors) and `npm run dev` manual check.

**Spec:** `docs/superpowers/specs/2026-04-21-spaces-navigation-design.md`

---

## File Structure

- NEW `src/scripts/spaces.ts` — client module: state machine, gesture/keyboard handlers, history sync.
- NEW `src/components/spaces/ThoughtsSpace.astro` — Thoughts list content (post list).
- NEW `src/components/spaces/ProjectsSpace.astro` — Projects placeholder content.
- NEW `src/components/spaces/AboutSpace.astro` — About bio content.
- NEW `src/layouts/SpacesLayout.astro` — fixed Header + viewport + 3-space track.
- MOD `src/pages/thoughts/index.astro` — use `SpacesLayout`, `activeIndex=0`, drop local list/Footer.
- MOD `src/pages/projects/index.astro` — use `SpacesLayout`, `activeIndex=1`.
- MOD `src/pages/about/index.astro` — use `SpacesLayout`, `activeIndex=2`.
- MOD `src/layouts/Layout.astro` — add `<ClientRouter />`, fade keyframes, `transition:name="page"` on `<main>`.
- MOD `src/pages/thoughts/[slug].astro` — add `transition:name="page"` to `<article>`, store list scroll on outbound link click, restore on inbound from spaces.

Order rationale: `spaces.ts` is pure logic → content partials are pure Astro → `SpacesLayout` wires them → routes delegate → View Transitions is the last cross-cutting concern.

---

## Task 1: Client module `spaces.ts`

**Files:**
- Create: `src/scripts/spaces.ts`

This file exports a single `initSpaces()` function that finds `.spaces-track` and `.spaces-viewport` in the DOM, installs listeners, and manages state. It is called from `SpacesLayout`'s `<script>` block (which Astro bundles with TS support).

### Step 1.1: Write the module

- [ ] Create `src/scripts/spaces.ts` with this exact content:

```ts
type SpaceName = "thoughts" | "projects" | "about";

const SPACES: SpaceName[] = ["thoughts", "projects", "about"];
const PATHS: Record<SpaceName, string> = {
  thoughts: "/thoughts",
  projects: "/projects",
  about: "/about",
};

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const DUR_ADJACENT = 480;
const DUR_FAR = 640;
const SNAP_MIN = 220;
const SNAP_MAX = 480;
const COMMIT_RATIO = 0.25;
const COMMIT_VELOCITY = 0.5; // px/ms
const WHEEL_DOMINANCE = 1.5; // deltaX must exceed deltaY by this factor
const EDGE_DAMP = 0.35;

type Phase = "idle" | "dragging" | "settling";

interface State {
  viewport: HTMLElement;
  track: HTMLElement;
  index: number;
  phase: Phase;
  dragDx: number;
  samples: { t: number; dx: number }[];
  settleTimer: number | null;
  pointerId: number | null;
  startX: number;
  startY: number;
  lockedHorizontal: boolean;
}

export function indexFromPath(pathname: string): number {
  if (pathname.startsWith("/projects")) return 1;
  if (pathname.startsWith("/about")) return 2;
  return 0;
}

export function pathFromIndex(i: number): string {
  return PATHS[SPACES[i] ?? "thoughts"];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyTransform(state: State, px: number, anim: { dur: number } | null) {
  if (anim) {
    state.track.style.transition = `transform ${anim.dur}ms ${EASE}`;
  } else {
    state.track.style.transition = "none";
  }
  state.track.style.transform = `translate3d(${px}px, 0, 0)`;
}

function baseOffset(state: State): number {
  return -state.index * state.viewport.clientWidth;
}

function emitChange(state: State) {
  window.dispatchEvent(
    new CustomEvent("spaces:change", { detail: { index: state.index } })
  );
}

function goToSpace(state: State, target: number, opts: { push: boolean }) {
  const clamped = Math.max(0, Math.min(SPACES.length - 1, target));
  if (clamped === state.index && state.phase === "idle") return;
  const distance = Math.abs(clamped - state.index);
  const dur = prefersReducedMotion()
    ? 0
    : distance >= 2
      ? DUR_FAR
      : DUR_ADJACENT;
  state.phase = "settling";
  state.index = clamped;
  applyTransform(state, -clamped * state.viewport.clientWidth, { dur });
  if (state.settleTimer) window.clearTimeout(state.settleTimer);
  state.settleTimer = window.setTimeout(() => {
    state.phase = "idle";
    state.dragDx = 0;
    if (opts.push) {
      const targetPath = pathFromIndex(clamped);
      if (location.pathname !== targetPath) {
        history.pushState({ space: clamped }, "", targetPath);
      }
    }
    emitChange(state);
  }, dur);
}

function settleFromDrag(state: State) {
  const vw = state.viewport.clientWidth;
  const lastTwo = state.samples.slice(-2);
  let velocity = 0;
  if (lastTwo.length === 2) {
    const dt = lastTwo[1].t - lastTwo[0].t;
    if (dt > 0) velocity = (lastTwo[1].dx - lastTwo[0].dx) / dt;
  }
  const direction = state.dragDx > 0 ? -1 : state.dragDx < 0 ? 1 : 0;
  const magnitudeCommit = Math.abs(state.dragDx) > vw * COMMIT_RATIO;
  const velocityCommit = Math.abs(velocity) > COMMIT_VELOCITY &&
    Math.sign(velocity) === Math.sign(state.dragDx);
  let target = state.index;
  if ((magnitudeCommit || velocityCommit) && direction !== 0) {
    target = state.index + direction;
  }
  const clamped = Math.max(0, Math.min(SPACES.length - 1, target));

  const startPx = baseOffset(state) - state.dragDx;
  const endPx = -clamped * vw;
  const remaining = Math.abs(endPx - startPx);
  const ratio = vw === 0 ? 0 : remaining / vw;
  const dur = prefersReducedMotion()
    ? 0
    : Math.max(SNAP_MIN, Math.min(SNAP_MAX, Math.round(ratio * DUR_ADJACENT)));

  state.phase = "settling";
  state.index = clamped;
  applyTransform(state, endPx, { dur });
  if (state.settleTimer) window.clearTimeout(state.settleTimer);
  state.settleTimer = window.setTimeout(() => {
    state.phase = "idle";
    state.dragDx = 0;
    state.samples = [];
    const targetPath = pathFromIndex(clamped);
    if (location.pathname !== targetPath) {
      history.pushState({ space: clamped }, "", targetPath);
    }
    emitChange(state);
  }, dur);
}

function updateDragVisual(state: State) {
  const vw = state.viewport.clientWidth;
  let dx = state.dragDx;
  // Rubber-band at edges
  if (state.index === 0 && dx > 0) dx *= EDGE_DAMP;
  if (state.index === SPACES.length - 1 && dx < 0) dx *= EDGE_DAMP;
  applyTransform(state, baseOffset(state) - dx, null);
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable
  );
}

export function initSpaces(): void {
  const viewport = document.querySelector<HTMLElement>(".spaces-viewport");
  const track = document.querySelector<HTMLElement>(".spaces-track");
  if (!viewport || !track) return;

  const activeFromDom = Number(track.dataset.activeIndex ?? "0") || 0;
  const state: State = {
    viewport,
    track,
    index: activeFromDom,
    phase: "idle",
    dragDx: 0,
    samples: [],
    settleTimer: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    lockedHorizontal: false,
  };

  // Ensure initial transform matches SSR value (in case of resize).
  applyTransform(state, baseOffset(state), null);
  emitChange(state);

  // Resize re-aligns to current index without animation.
  window.addEventListener("resize", () => {
    if (state.phase === "idle") {
      applyTransform(state, baseOffset(state), null);
    }
  });

  // Nav link interception.
  document.addEventListener("click", (e) => {
    const anchor = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
      "a[href]"
    );
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    if (!/^\/(thoughts|projects|about)\/?$/.test(href)) return;
    // Let modifier-clicks (cmd/ctrl/shift/middle) open a new tab normally.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((e as MouseEvent).button !== 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const target = indexFromPath(href);
    goToSpace(state, target, { push: true });
  }, { capture: true });

  // popstate (browser back/forward).
  window.addEventListener("popstate", (e) => {
    const targetIndex =
      (e.state && typeof e.state.space === "number")
        ? e.state.space
        : indexFromPath(location.pathname);
    goToSpace(state, targetIndex, { push: false });
  });

  // Keyboard.
  window.addEventListener("keydown", (e) => {
    if (isTypingTarget(e.target)) return;
    if (state.phase !== "idle") return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToSpace(state, state.index - 1, { push: true });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToSpace(state, state.index + 1, { push: true });
    }
  });

  // Wheel (trackpad horizontal).
  let wheelReleaseTimer: number | null = null;
  viewport.addEventListener(
    "wheel",
    (e) => {
      if (state.phase === "settling") return;
      const ax = Math.abs(e.deltaX);
      const ay = Math.abs(e.deltaY);
      if (ax <= ay * WHEEL_DOMINANCE) return;
      e.preventDefault();
      if (state.phase === "idle") {
        state.phase = "dragging";
        state.dragDx = 0;
        state.samples = [{ t: performance.now(), dx: 0 }];
      }
      state.dragDx += e.deltaX;
      state.samples.push({ t: performance.now(), dx: state.dragDx });
      if (state.samples.length > 8) state.samples.shift();
      updateDragVisual(state);

      if (wheelReleaseTimer) window.clearTimeout(wheelReleaseTimer);
      wheelReleaseTimer = window.setTimeout(() => {
        if (state.phase === "dragging") settleFromDrag(state);
      }, 120);
    },
    { passive: false }
  );

  // Pointer / touch.
  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (state.phase === "settling") return;
    state.pointerId = e.pointerId;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.lockedHorizontal = false;
    state.dragDx = 0;
    state.samples = [{ t: performance.now(), dx: 0 }];
  });

  viewport.addEventListener("pointermove", (e) => {
    if (state.pointerId !== e.pointerId) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (!state.lockedHorizontal) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        state.lockedHorizontal = true;
        state.phase = "dragging";
        viewport.setPointerCapture(e.pointerId);
      } else {
        // Vertical intent — release capture, let native scroll take over.
        state.pointerId = null;
        return;
      }
    }
    if (!state.lockedHorizontal) return;
    state.dragDx = -dx; // dragging right (positive dx) should pull prev space in
    state.samples.push({ t: performance.now(), dx: state.dragDx });
    if (state.samples.length > 8) state.samples.shift();
    updateDragVisual(state);
  });

  const endPointer = (e: PointerEvent) => {
    if (state.pointerId !== e.pointerId) return;
    state.pointerId = null;
    if (state.phase === "dragging") settleFromDrag(state);
    state.lockedHorizontal = false;
  };
  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);
}
```

### Step 1.2: Verify build

- [ ] Run `npm run build` from `D:/Code/blog`.
- [ ] Expected: build succeeds (the file is not yet imported anywhere but TS should still type-check — Astro only compiles it when referenced, so this step may no-op until Task 3).
- [ ] If errors: fix inline.

### Step 1.3: Commit

```bash
git add src/scripts/spaces.ts
git commit -m "feat: add spaces client module (state + gestures + history)"
```

---

## Task 2: Space partial components

**Files:**
- Create: `src/components/spaces/ThoughtsSpace.astro`
- Create: `src/components/spaces/ProjectsSpace.astro`
- Create: `src/components/spaces/AboutSpace.astro`

These extract existing per-page markup so `SpacesLayout` can render all three. Styles are scoped to each component.

### Step 2.1: Create `ThoughtsSpace.astro`

- [ ] Write this exact content:

```astro
---
import { getCollection } from "astro:content";

const posts = (await getCollection("thoughts")).sort(
  (a, b) => b.data.date.getTime() - a.data.date.getTime()
);

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
---

<ol class="index" role="list">
  {posts.map((post) => (
    <li>
      <a href={`/thoughts/${post.id}/`} class="entry" data-thoughts-link>
        <time datetime={post.data.date.toISOString()}>
          {fmt(post.data.date)}
        </time>
        <h2>{post.data.title}</h2>
        {post.data.summary && <p>{post.data.summary}</p>}
      </a>
    </li>
  ))}
</ol>

<style>
  .index {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .entry {
    display: grid;
    gap: 0.5rem;
    color: inherit;
    text-decoration: none;
  }

  time {
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--ink-faint);
    font-feature-settings: "tnum";
  }

  h2 {
    font-size: clamp(1.5rem, 3vw, 1.875rem);
    font-weight: 460;
    line-height: 1.25;
    letter-spacing: -0.015em;
    font-variation-settings: "opsz" 36;
    transition: color 180ms ease;
  }

  p {
    color: var(--ink-soft);
    font-size: 0.9375rem;
    line-height: 1.65;
    max-width: 34rem;
    margin-top: 0.25rem;
  }

  .entry:hover h2 {
    text-decoration: underline;
    text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
    text-underline-offset: 0.18em;
    text-decoration-thickness: 1px;
  }
</style>
```

### Step 2.2: Create `ProjectsSpace.astro`

- [ ] Write this exact content:

```astro
---
---

<section class="projects">
  <h1>Projects</h1>
  <p>Nothing on the shelf yet — come back later.</p>
</section>

<style>
  .projects {
    display: grid;
    gap: 1.25rem;
  }

  h1 {
    font-size: clamp(2.25rem, 5vw, 3rem);
    font-weight: 460;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-variation-settings: "opsz" 60;
  }

  p {
    color: var(--ink-soft);
    max-width: 30rem;
  }
</style>
```

### Step 2.3: Create `AboutSpace.astro`

- [ ] Write this exact content:

```astro
---
---

<section class="about">
  <h1>Caldis</h1>
  <p>
    Writing sometimes, building often. These pages collect whatever felt
    worth keeping.
  </p>
  <ul class="links" role="list">
    <li>
      <a
        href="https://x.com/Caldis_Chen"
        target="_blank"
        rel="noopener"
        aria-label="X (formerly Twitter)"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
    </li>
    <li>
      <a
        href="https://github.com/Caldis"
        target="_blank"
        rel="noopener"
        aria-label="GitHub"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      </a>
    </li>
  </ul>
</section>

<style>
  .about {
    display: grid;
    gap: 1.25rem;
  }

  h1 {
    font-size: clamp(2.25rem, 5vw, 3rem);
    font-weight: 460;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-variation-settings: "opsz" 60;
  }

  p {
    max-width: 32rem;
    font-size: 1rem;
    line-height: 1.6;
    color: var(--ink);
  }

  .links {
    list-style: none;
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .links a {
    display: inline-flex;
    color: var(--accent);
    transition: color 180ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .links a:hover {
    color: var(--accent-strong);
    transform: translateY(-1px);
  }

  .links svg {
    width: 1.125rem;
    height: 1.125rem;
    display: block;
  }
</style>
```

### Step 2.4: Commit

```bash
git add src/components/spaces/
git commit -m "feat: extract thoughts/projects/about content into space partials"
```

---

## Task 3: `SpacesLayout.astro`

**Files:**
- Create: `src/layouts/SpacesLayout.astro`

This replaces `Layout.astro` for the three top-level routes. It renders Header, a viewport, and a track containing all three space partials. It also imports `spaces.ts` so it runs after mount, and wires a `spaces:change` listener to update Header active state without reloading.

### Step 3.1: Write the file

- [ ] Create `src/layouts/SpacesLayout.astro`:

```astro
---
import "../styles/global.css";
import Header from "../components/Header.astro";
import ThoughtsSpace from "../components/spaces/ThoughtsSpace.astro";
import ProjectsSpace from "../components/spaces/ProjectsSpace.astro";
import AboutSpace from "../components/spaces/AboutSpace.astro";

interface Props {
  title?: string;
  activeIndex: 0 | 1 | 2;
}

const { title = "Caldis's Blog", activeIndex } = Astro.props;
const currentPath = Astro.url.pathname;
const translate = `translate3d(-${activeIndex * 100}%, 0, 0)`;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <link
      rel="preload"
      as="font"
      type="font/woff2"
      href="/fonts/newsreader-var.woff2"
      crossorigin
    />
    <link
      rel="preload"
      as="font"
      type="font/woff2"
      href="/fonts/geist-var.woff2"
      crossorigin
    />
    <script
      is:inline
      async
      src="https://www.googletagmanager.com/gtag/js?id=G-HGYPWSLD0Y"></script>
    <script is:inline>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());
      gtag("config", "G-HGYPWSLD0Y");
    </script>
  </head>
  <body data-spaces-body>
    <div class="container header-slot">
      <Header currentPath={currentPath} />
    </div>
    <main class="spaces-viewport" style="view-transition-name: page;">
      <div
        class="spaces-track"
        data-active-index={activeIndex}
        style={`transform: ${translate};`}
      >
        <section class="space" data-space="thoughts" data-index="0">
          <div class="space-inner">
            <ThoughtsSpace />
          </div>
        </section>
        <section class="space" data-space="projects" data-index="1">
          <div class="space-inner">
            <ProjectsSpace />
          </div>
        </section>
        <section class="space" data-space="about" data-index="2">
          <div class="space-inner">
            <AboutSpace />
          </div>
        </section>
      </div>
    </main>

    <script>
      import { initSpaces } from "../scripts/spaces";

      function syncNavActive(index: number) {
        const paths = ["/thoughts", "/projects", "/about"];
        const activePath = paths[index];
        document.querySelectorAll<HTMLAnchorElement>("header nav a").forEach((a) => {
          const href = a.getAttribute("href") ?? "";
          const isActive = href === activePath;
          if (isActive) {
            a.classList.add("active");
            a.setAttribute("aria-current", "page");
          } else {
            a.classList.remove("active");
            a.removeAttribute("aria-current");
          }
        });
      }

      window.addEventListener("spaces:change", (e) => {
        const idx = (e as CustomEvent).detail?.index ?? 0;
        syncNavActive(idx);
      });

      initSpaces();

      // Restore Thoughts scroll position after returning from a detail page.
      const saved = sessionStorage.getItem("thoughtsScroll");
      if (saved !== null) {
        const el = document.querySelector<HTMLElement>('.space[data-space="thoughts"]');
        if (el) el.scrollTop = Number(saved) || 0;
        sessionStorage.removeItem("thoughtsScroll");
      }

      // Save Thoughts scroll on outbound click to a post.
      document.addEventListener("click", (e) => {
        const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
          "a[data-thoughts-link]"
        );
        if (!a) return;
        const el = document.querySelector<HTMLElement>('.space[data-space="thoughts"]');
        if (el) sessionStorage.setItem("thoughtsScroll", String(el.scrollTop));
      });
    </script>

    <style is:global>
      /* Body locked so only spaces scroll inside. */
      body[data-spaces-body] {
        overflow: hidden;
        height: 100vh;
      }

      @keyframes spaces-fade-out {
        to { opacity: 0; }
      }
      @keyframes spaces-fade-in {
        from { opacity: 0; }
      }
      ::view-transition-old(page),
      ::view-transition-new(page) {
        animation-duration: 320ms;
        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      }
      ::view-transition-old(page) { animation-name: spaces-fade-out; }
      ::view-transition-new(page) { animation-name: spaces-fade-in; }
    </style>

    <style>
      .header-slot {
        max-width: var(--max-width);
        margin: 0 auto;
        padding: 0 clamp(1.25rem, 4vw, 2rem);
      }

      .spaces-viewport {
        position: relative;
        width: 100%;
        height: calc(100vh - var(--header-height, 0px));
        overflow: hidden;
        touch-action: pan-y;
        flex: 1 1 auto;
      }

      .spaces-track {
        display: flex;
        width: 300%;
        height: 100%;
        will-change: transform;
      }

      .space {
        width: calc(100% / 3);
        height: 100%;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }

      .space-inner {
        max-width: var(--max-width);
        margin: 0 auto;
        padding: 0 clamp(1.25rem, 4vw, 2rem) clamp(4rem, 10vw, 8rem);
      }

      @media (prefers-reduced-motion: reduce) {
        .spaces-track { transition: none !important; }
      }
    </style>

    <script>
      // Measure header height after layout so viewport fills remainder cleanly.
      function setHeaderHeight() {
        const h = document.querySelector<HTMLElement>("header");
        if (!h) return;
        document.documentElement.style.setProperty(
          "--header-height",
          `${h.getBoundingClientRect().height}px`
        );
      }
      setHeaderHeight();
      window.addEventListener("resize", setHeaderHeight);
      // In case fonts reflow the header.
      if (document.fonts?.ready) {
        document.fonts.ready.then(setHeaderHeight);
      }
    </script>
  </body>
</html>
```

### Step 3.2: Commit

```bash
git add src/layouts/SpacesLayout.astro
git commit -m "feat: SpacesLayout with horizontal track + client wiring"
```

---

## Task 4: Route files delegate to `SpacesLayout`

**Files:**
- Modify: `src/pages/thoughts/index.astro`
- Modify: `src/pages/projects/index.astro`
- Modify: `src/pages/about/index.astro`

### Step 4.1: Replace `src/pages/thoughts/index.astro` entirely

- [ ] Overwrite file contents with:

```astro
---
import SpacesLayout from "../../layouts/SpacesLayout.astro";
---

<SpacesLayout title="Thoughts" activeIndex={0} />
```

### Step 4.2: Replace `src/pages/projects/index.astro` entirely

- [ ] Overwrite file contents with:

```astro
---
import SpacesLayout from "../../layouts/SpacesLayout.astro";
---

<SpacesLayout title="Projects" activeIndex={1} />
```

### Step 4.3: Replace `src/pages/about/index.astro` entirely

- [ ] Overwrite file contents with:

```astro
---
import SpacesLayout from "../../layouts/SpacesLayout.astro";
---

<SpacesLayout title="About" activeIndex={2} />
```

### Step 4.4: Build + manual smoke

- [ ] Run `npm run build`. Expected: succeeds with no TS errors.
- [ ] Run `npm run dev`. Open `http://localhost:4321/thoughts`. Verify:
  - Thoughts list renders.
  - No Footer on thoughts list.
  - Clicking "Projects" in nav smoothly slides the container left; URL becomes `/projects`.
  - Back button slides right, URL becomes `/thoughts`.
  - Arrow left/right on keyboard switches spaces.
  - Trackpad horizontal two-finger scroll switches spaces in realtime with rubber-band at edges.
- [ ] If anything is broken, fix it before commit.

### Step 4.5: Commit

```bash
git add src/pages/thoughts/index.astro src/pages/projects/index.astro src/pages/about/index.astro
git commit -m "feat: route pages delegate to SpacesLayout"
```

---

## Task 5: Cross-document fade between spaces and detail page

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/thoughts/[slug].astro`

Chromium's native `@view-transition { navigation: auto; }` triggers a view transition automatically on every same-origin navigation. By giving the `<main>` in `SpacesLayout` and `<article>` in the detail page the same `view-transition-name: page`, we get a cross-fade for free. `SpacesLayout` already sets `view-transition-name: page` on its `<main>` in Task 3. Firefox/Safari fall back to normal navigation (acceptable for a personal blog).

### Step 5.1: Append global view-transition rules to `src/styles/global.css`

- [ ] Append the following block at the end of `src/styles/global.css`:

```css
@view-transition {
  navigation: auto;
}

@keyframes spaces-fade-out {
  to { opacity: 0; }
}
@keyframes spaces-fade-in {
  from { opacity: 0; }
}

::view-transition-old(page),
::view-transition-new(page) {
  animation-duration: 320ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
::view-transition-old(page) { animation-name: spaces-fade-out; }
::view-transition-new(page) { animation-name: spaces-fade-in; }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(page),
  ::view-transition-new(page) {
    animation-duration: 0ms;
  }
}
```

### Step 5.2: Remove the duplicate `<style is:global>` block from `SpacesLayout.astro`

- [ ] Delete the `<style is:global>` block in `src/layouts/SpacesLayout.astro` that was added in Task 3 (it duplicates the fade keyframes now in `global.css`). Keep `body[data-spaces-body]` in a regular scoped style block, or move it into the existing scoped `<style>` block below. Final shape:

Replace the two `<style>` blocks in `SpacesLayout.astro` with a single scoped one:

```astro
<style is:global>
  body[data-spaces-body] {
    overflow: hidden;
    height: 100vh;
  }
</style>

<style>
  .header-slot {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 4vw, 2rem);
  }

  .spaces-viewport {
    position: relative;
    width: 100%;
    height: calc(100vh - var(--header-height, 0px));
    overflow: hidden;
    touch-action: pan-y;
  }

  .spaces-track {
    display: flex;
    width: 300%;
    height: 100%;
    will-change: transform;
  }

  .space {
    width: calc(100% / 3);
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .space-inner {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 4vw, 2rem) clamp(4rem, 10vw, 8rem);
  }

  @media (prefers-reduced-motion: reduce) {
    .spaces-track { transition: none !important; }
  }
</style>
```

### Step 5.3: Modify `src/pages/thoughts/[slug].astro`

- [ ] Edit the article opening tag. Change:

```astro
<article data-layout={layout}>
```

to:

```astro
<article data-layout={layout} style="view-transition-name: page;">
```

Keep everything else (Layout, Footer, prose) unchanged.

### Step 5.4: Build + verify

- [ ] Run `npm run build`. Expected: success.
- [ ] Run `npm run dev`. Flow in a Chromium browser (fade feature requires it):
  - `/thoughts` → click a post → cross-document fade to the detail page.
  - Browser back → fade back to `/thoughts` with Thoughts scroll position preserved (via `sessionStorage`).
  - In Firefox/Safari: regular hard navigation, no fade. Functionality still works.

### Step 5.5: Commit

```bash
git add src/styles/global.css src/layouts/SpacesLayout.astro src/pages/thoughts/[slug].astro
git commit -m "feat: native @view-transition cross-fade between spaces and detail"
```

---

## Task 6: Final verification

- [ ] Run `npm run build` one more time from a clean state.
- [ ] Run `npm run dev`. Walk through the full list in `AGENTS.md` scenarios:
  - Refresh on `/about` — renders with About visible, no animation.
  - Nav click between all pairs — smooth.
  - `Thoughts → scroll halfway → Projects → Thoughts` — scroll preserved.
  - `Thoughts → click post → back button` — scroll preserved.
  - Arrow keys cycle spaces. Focused inside an input (if any) does not trigger.
  - `prefers-reduced-motion` (DevTools rendering tab) — no animation, functionality intact.
  - Edge rubber-band at Thoughts (leftmost) and About (rightmost).
- [ ] If all good, no commit needed (already committed per task).
