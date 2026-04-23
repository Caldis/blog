type SpaceName = "thoughts" | "projects" | "albums" | "about";

const SPACES: SpaceName[] = ["thoughts", "projects", "albums", "about"];
const PATHS: Record<SpaceName, string> = {
  thoughts: "/thoughts",
  projects: "/projects",
  albums: "/albums",
  about: "/about",
};

const EASE = "cubic-bezier(0.05, 1.0, 0.34, 1.0)";
const DUR_ADJACENT = 760;
const DUR_FAR = 1000;
const SNAP_MIN = 340;
const SNAP_MAX = 760;
const COMMIT_RATIO = 0.25;
const COMMIT_VELOCITY = 0.5; // px/ms
const WHEEL_DOMINANCE = 1.5;
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
}

export function indexFromPath(pathname: string): number {
  if (pathname.startsWith("/projects")) return 1;
  if (pathname.startsWith("/albums")) return 2;
  if (pathname.startsWith("/about")) return 3;
  return 0;
}

export function pathFromIndex(i: number): string {
  return PATHS[SPACES[i] ?? "thoughts"];
}

function applyTransform(state: State, px: number, anim: { dur: number } | null) {
  if (anim) {
    state.track.style.transition = `transform ${anim.dur}ms ${EASE}`;
    state.track.style.transform = `translate3d(${px}px, 0, 0)`;
  } else {
    state.track.style.transition = "none";
    state.track.style.transform = `translate3d(${px}px, 0, 0)`;
    // Force the "no transition" baseline to commit so a subsequent
    // animated transform transitions from it instead of batching together
    // and snapping to the final value.
    void state.track.offsetWidth;
  }
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
  const dur = distance >= 2 ? DUR_FAR : DUR_ADJACENT;
  state.phase = "settling";
  state.index = clamped;
  emitChange(state);
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
  const velocityCommit =
    Math.abs(velocity) > COMMIT_VELOCITY &&
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
  const dur = Math.max(
    SNAP_MIN,
    Math.min(SNAP_MAX, Math.round(ratio * DUR_ADJACENT))
  );

  state.phase = "settling";
  state.index = clamped;
  emitChange(state);
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
  }, dur);
}

function updateDragVisual(state: State) {
  let dx = state.dragDx;
  if (state.index === 0 && dx < 0) dx *= EDGE_DAMP;
  if (state.index === SPACES.length - 1 && dx > 0) dx *= EDGE_DAMP;
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
  };

  applyTransform(state, baseOffset(state), null);
  emitChange(state);

  window.addEventListener("resize", () => {
    if (state.phase === "idle") {
      applyTransform(state, baseOffset(state), null);
    }
  });

  // Nav-link clicks are captured and preventDefault'd by the inline early
  // script in SpacesLayout (so pre-module clicks can't escape into a real
  // navigation). It forwards them via a custom event we handle here.
  window.addEventListener("spaces:nav", (e) => {
    const href = (e as CustomEvent).detail?.href as string | undefined;
    if (typeof href !== "string") return;
    goToSpace(state, indexFromPath(href), { push: true });
  });

  // Drain any click that fired before initSpaces ran.
  const pending = (window as unknown as { __spacesPending?: string })
    .__spacesPending;
  if (typeof pending === "string") {
    (window as unknown as { __spacesPending?: string }).__spacesPending =
      undefined;
    goToSpace(state, indexFromPath(pending), { push: true });
  }

  window.addEventListener("popstate", (e) => {
    const targetIndex =
      e.state && typeof e.state.space === "number"
        ? e.state.space
        : indexFromPath(location.pathname);
    goToSpace(state, targetIndex, { push: false });
  });

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

}
