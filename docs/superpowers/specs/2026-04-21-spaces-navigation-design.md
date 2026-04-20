---
title: Spaces Navigation — Thoughts / Projects / About
date: 2026-04-21
status: approved
---

# Spaces Navigation

Refactor the three top-level routes (`/thoughts`, `/projects`, `/about`) into a
single macOS-desktop-spaces-style horizontal container with trackpad / touch /
keyboard / click driven transitions. The article detail route
(`/thoughts/[slug]`) stays outside the spaces system and uses a fade transition.

## Goals

- Switching between Thoughts / Projects / About feels like dragging between
  macOS desktop spaces — real-time finger-follow, snap-on-release, elegant
  curve.
- URLs remain `/thoughts`, `/projects`, `/about`. Refresh, deep-link, SEO all
  behave like normal Astro static pages.
- Detail page (`/thoughts/[slug]`) fades in/out against its originating
  Thoughts space; returning preserves Thoughts scroll position.
- Thoughts list page no longer renders the Footer. Detail page keeps it.

## Non-Goals

- No SPA routing library. Native `history.pushState` + Astro's built-in
  `<ClientRouter />` only.
- No realtime Nav active-state interpolation during drag — integer switching
  when a space commits is enough.
- No changes to `/thoughts/[slug]`, Header styling, typography, or colors.

## Architecture

A new `src/layouts/SpacesLayout.astro` replaces `Layout.astro` for the three
top-level routes. All three spaces are rendered server-side in a single flex
track; the route prop `activeIndex` sets the initial `translateX` with no
animation. Client JS takes over after mount.

```
<body>
  <Header currentPath={...} />              ← stays in normal flow at top
  <div class="spaces-viewport">             ← height: calc(100vh - header); overflow: hidden
    <div class="spaces-track"               ← display: flex; width: 300%;
         data-active-index={activeIndex}
         style="transform: translate3d(-{activeIndex}*100%, 0, 0)">
      <section class="space" data-space="thoughts" data-index="0"> …Thoughts list… </section>
      <section class="space" data-space="projects" data-index="1"> …Projects… </section>
      <section class="space" data-space="about"    data-index="2"> …About… </section>
    </div>
  </div>
</body>
```

- Each `.space` is an independent vertical scroll container
  (`overflow-y: auto; overscroll-behavior: contain`). Scroll position is
  preserved per space for the lifetime of the page.
- Space order is fixed: `thoughts=0, projects=1, about=2`.
- All three space contents are always in the DOM. The content volume is
  trivial (one list, one sentence, one bio) so cost is negligible.
- The three route files (`src/pages/thoughts/index.astro`,
  `src/pages/projects/index.astro`, `src/pages/about/index.astro`) each import
  `SpacesLayout` and pass their `activeIndex`. The content for all three
  spaces lives inside `SpacesLayout` itself (or small partial components) so
  every route renders identical space DOM.

## Interaction Model

A single client module `src/scripts/spaces.ts` runs on `SpacesLayout` mount
(`<script>` in the Astro component). State machine: `idle → dragging →
settling → idle`.

### Trackpad horizontal / touch swipe (realtime follow)

- `wheel` listener on `.spaces-viewport`. When `Math.abs(deltaX) >
  Math.abs(deltaY)`, `preventDefault()` and accumulate into `dragDx`. Apply
  `translate3d(-(activeIndex * vpWidth + dragDx), 0, 0)` live.
- Touch via `pointerdown/move/up/cancel` with `touch-action: pan-y` on
  `.spaces-viewport` so vertical scroll inside a space passes through.
- Edge rubber-band: at index 0 dragging right or index 2 dragging left, apply
  `dragDx *= 0.35` damping.
- Release decision:
  - Commit to next space if `|dragDx| > 0.25 * vpWidth` **or** trailing
    velocity `> 0.5 px/ms` (sampled over last ~80ms of input).
  - Otherwise snap back to current.
- During settle (up to 480ms) input is ignored.

### Nav click (including cross-jumps)

- Intercept clicks on Header `<a href="/thoughts|/projects|/about">`:
  `e.preventDefault()`, call `goToSpace(targetIndex)`.
- Distance-scaled animation duration: adjacent = 480ms, 2-away = 640ms.
- `history.pushState({ space: targetIndex }, '', targetHref)` fires at the end
  of the animation.

### Keyboard

- `ArrowLeft` / `ArrowRight` switch when `document.activeElement` is `body` or
  one of the `.space` elements (skip when typing in inputs / contenteditable).

### Browser back/forward

- `popstate` reads `event.state?.space ?? indexFromPath(location.pathname)` →
  `goToSpace(target)` with full animation. No real navigation.

### Nav active state

- Listen for a custom `spaces:change` event dispatched on commit. Header nav
  updates `aria-current` and `.active` class via integer swap. No partial
  interpolation during drag.

## Animation

Single shared easing token:

```css
--ease-spaces: cubic-bezier(0.32, 0.72, 0, 1);
```

- Nav click / keyboard / popstate / drag-release snap all use this curve.
- Durations: adjacent 480ms, 2-away 640ms, release-snap scaled to remaining
  distance, clamped to `[220ms, 480ms]`.
- `prefers-reduced-motion: reduce` → durations set to 0ms across the board;
  URL / state logic still runs.

## URL / history

- Route → index map: `/thoughts → 0`, `/projects → 1`, `/about → 2`. A helper
  `indexFromPath` and `pathFromIndex` lives in `spaces.ts`.
- `history.pushState` is called **only after commit** (animation end). Drag
  in progress does not update URL.
- Fresh load / refresh: Astro SSR produces the correct `activeIndex`, the
  track is rendered at the right `translateX` with no JS animation needed.

## Detail page fade (`/thoughts/[slug]`)

- Enable Astro `<ClientRouter />` in both `SpacesLayout.astro` and the
  existing `Layout.astro` (which the detail route still uses).
- Assign `transition:name="page"` to the Spaces viewport container and to the
  detail page's `<article>` element.
- Override the default cross-document slide with opacity-only animation:

```css
::view-transition-old(page),
::view-transition-new(page) {
  animation-duration: 320ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
::view-transition-old(page) { animation-name: spaces-fade-out; }
::view-transition-new(page) { animation-name: spaces-fade-in; }
@keyframes spaces-fade-out { to { opacity: 0; } }
@keyframes spaces-fade-in  { from { opacity: 0; } }
```

- Scroll preservation: before leaving Thoughts list (link click handler in the
  list), store `sessionStorage.thoughtsScroll = space.scrollTop`. On Thoughts
  space mount, if `sessionStorage.thoughtsScroll` exists, restore it and
  clear.

## Footer rule

- `SpacesLayout` (= `/thoughts`, `/projects`, `/about`): no Footer.
- `Layout` + `/thoughts/[slug]`: Footer unchanged.

## Constraints inherited from AGENTS.md

- Accent Prussian Blue, Newsreader + Geist, Prussian Blue.
- No BEM double-hyphens in scoped CSS.
- Self-hosted fonts, no CDN.
- Detail page keeps existing flex layout.

## File Touch List

- NEW `src/layouts/SpacesLayout.astro`
- NEW `src/scripts/spaces.ts` (client module, imported by `SpacesLayout`)
- NEW `src/components/spaces/ThoughtsSpace.astro`
- NEW `src/components/spaces/ProjectsSpace.astro`
- NEW `src/components/spaces/AboutSpace.astro`
- MOD `src/pages/thoughts/index.astro` → delegate to `SpacesLayout` with
  `activeIndex=0`, drop `Footer` import
- MOD `src/pages/projects/index.astro` → delegate with `activeIndex=1`
- MOD `src/pages/about/index.astro` → delegate with `activeIndex=2`
- MOD `src/layouts/Layout.astro` → add `<ClientRouter />`, fade keyframes
- MOD `src/pages/thoughts/[slug].astro` → `transition:name="page"` on
  `<article>`, restore scroll logic for Thoughts list on back navigation

## Open Risks

- Astro `<ClientRouter />` swaps documents on navigation, but the three
  spaces routes share identical markup except `activeIndex`. Animated
  transitions between them are handled by the spaces JS, not ClientRouter.
  Need to either (a) prevent ClientRouter from handling nav links inside the
  Header (via `data-astro-reload="false"` + our own `preventDefault`) or
  (b) scope ClientRouter to only apply to detail-page transitions. **Chosen:
  (a)** — intercept first, ClientRouter never sees the click.
- `wheel` events from touchpad pinch or Shift-scroll can produce horizontal
  deltas that aren't user intent. Mitigation: require `Math.abs(deltaX) >
  1.5 * Math.abs(deltaY)` before engaging horizontal drag.
- iOS Safari `touch-action: pan-y` + custom horizontal pointer tracking
  generally works, but requires `overflow-x: hidden` on the viewport to
  prevent accidental bounce.
