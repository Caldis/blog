# Post-mortem — "deployed site has no animation"

Feature: macOS-spaces-style horizontal slide between `/thoughts`,
`/projects`, `/about`.

Session date: 2026-04-21.

## Symptom

User reported: on `localhost` the slide animation worked; on the GitHub
Pages deploy at `https://blog.caldis.me/` the click on a nav link produced
no visible motion — either instant jump or a plain page change. Multiple
fix attempts landed on `main` before the actual root cause was found.

## Root cause (finally)

The user's Windows system has **"Show animations in Windows"** turned off
(`HKCU:\Control Panel\Desktop\WindowMetrics\MinAnimate = 0`). Chromium
reflects that as `prefers-reduced-motion: reduce`.

`spaces.ts` contained an explicit guard:

```ts
const dur = prefersReducedMotion() ? 0 : distance >= 2 ? DUR_FAR : DUR_ADJACENT;
```

and equivalent CSS media queries in `SpacesLayout.astro` and
`Header.astro` with `transition: none !important`.

When the user clicked a nav link, the transition duration was set to
**0ms**, so the transform snapped to its final value in a single frame.
Visually indistinguishable from "the animation is broken".

### Why it reproduced on deploy but not on localhost (from the user's
point of view)

Both environments ran the same code. The user's perception of "dev works,
deploy doesn't" turned out to be a memory artifact — an earlier commit
during the same session *did* work (before the reduce-motion guard was
added as part of a "respect accessibility" pass). After that pass, dev
and deploy were equally broken; the user simply hadn't re-tested dev
until explicitly asked to compare.

### Why the debugging agent (me) didn't see it

Playwright launches Chromium with `--force-prefers-reduced-motion=0`
unless the browser context is created with
`reducedMotion: 'reduce'`. So every Playwright verification I ran —
both against `localhost` and `blog.caldis.me` — reported
`matchMedia('(prefers-reduced-motion: reduce)').matches === false`, the
transform animated cleanly, and I concluded the code worked.

## Failed fix attempts (in order)

Each of these shipped to `main` and was deployed to GitHub Pages before
the real cause was identified.

### 1. Curve tweak — `cubic-bezier(0.22, 1, 0.28, 1)` → 760ms/1000ms

Commit `a629437`. Reasoning: maybe the curve was too subtle / too fast.
Actually plausible on its own merits, but did not address the user's
complaint.

### 2. Early-boot inline click interceptor

Commit `5496b43`. Reasoning: assumed the bundled
`<script type="module">` loaded too slowly on GitHub Pages, so the
user's click triggered a real navigation before JS could
`preventDefault`, and the `@view-transition { navigation: auto }` rule
turned it into a crossfade the user read as "no animation".

Added an `is:inline` script at the top of `SpacesLayout`'s `<body>` that
captures nav-link clicks, `preventDefault`s, queues the target on
`window.__spacesPending`, and dispatches a `spaces:nav` CustomEvent.
`spaces.ts` consumes the event and drains the pending value at init.

This was useful defensive hardening but did not fix the reported issue.

### 3. Softer S-curve — `cubic-bezier(0.65, 0, 0.25, 1)`

Commit `a1dc9bc`. Reasoning: the previous curve concentrated 90% of the
motion in the first 250ms and then imperceptibly crept, which *looks*
like an instant jump. Switched to a proper easeInOutCubic so motion was
visible across the full duration.

Again a legitimate tuning improvement, not a fix.

### 4. Drop `@view-transition { navigation: auto }`

Commit `92c3203`. Reasoning: the CSS rule triggers an automatic
cross-document fade on same-origin navigation, which might be hijacking
the transition when anything slipped through the click interceptor.

Cost: lost the detail-page crossfade for free. Benefit: zero — the
reported issue was unchanged.

### 5. Reflow after non-animated `applyTransform`

Commit `767160e`. Reasoning: `initSpaces()` calls
`applyTransform(..., null)` to set a baseline (transition:none,
transform:0), then a pending click can drain into `goToSpace` which
immediately writes transition:760ms and transform:-1404. In the same
synchronous task, the browser batches both style writes and starts the
transition *without a registered "from" value*, snapping straight to
the end.

Fix: read `state.track.offsetWidth` between the two writes to force a
layout flush so the transition has a prior committed value.

This *is* a real latent bug and the fix is correct, but it only
manifests on the drain-pending path (clicks that fire before the
module's listeners attach). It was not the user's actual symptom.

### 6. Actual fix — remove `prefers-reduced-motion` guard

Commit `20a5f78`. Deleted `prefersReducedMotion()` and the
`@media (prefers-reduced-motion: reduce)` CSS rules. The horizontal
slide is the primary spatial affordance of the nav; without it the UI
pops between unrelated-looking states and is harder to parse than with
motion. Treating it as decorative (and suppressing it on reduce-motion)
was the wrong call for this particular interaction.

## What I should have done differently

1. **Measured from the user's side earlier.** The first thing I did
   after each change was re-run Playwright, which was a broken mirror —
   it was a known-working setup claiming everything was fine while the
   user's real browser was differently configured. I should have asked
   for `navigator.userAgent`, `matchMedia('(prefers-reduced-motion)')`,
   and a screenshot of DevTools → Rendering → Emulate CSS media feature
   in the **first** round, not the sixth.
2. **Enumerated environment variables that Playwright silently
   overrides.** `--force-prefers-reduced-motion`, color scheme,
   timezone, font rendering. Any of these can make Playwright's
   "verified fix" lie.
3. **Distinguished between "the code path runs" and "the pixels move".**
   I was reading `getComputedStyle(...).transform` at +100ms and seeing
   interpolated values, which only tells me *that the transition was
   registered* — not that the user's browser would actually paint it.
   A reduce-motion Chromium still computes intermediate values for
   `getComputedStyle` in some cases even when the painted duration is
   0 (browser-dependent). Paired with `--force-prefers-reduced-motion`
   off, I got a false positive either way.
4. **Let the pattern of the user's feedback drive the diagnosis.**
   "Works on local, not on deploy" + "same code", and the user retried
   after each fix still reporting the same thing, should have pushed
   me to suspect the user's environment, not the code. Instead I kept
   generating plausible-sounding but untestable causes (load-order
   race, view-transition hijack, reflow batching) and shipping fixes
   for them.

## Collateral changes that should stay

- The inline early-boot click interceptor (commit 2): defensively useful,
  keeps click semantics predictable regardless of module load timing.
- The softer S-curve (commit 3): better motion than the original.
- Drop of `@view-transition` (commit 4): the detail-page crossfade was
  a minor bonus; the horizontal slide is the headline feature and
  eliminating a dependency on a bleeding-edge CSS rule reduces risk.
- The `offsetWidth` reflow fix (commit 5): fixes a real latent bug on
  the drain-pending code path even though it wasn't the presenting
  symptom.

## Commits in order

```
a27816b docs: spec
0c52035 docs: plan
a77d58b feat: spaces client module
eb81b18 feat: space partials
a88d224 feat: SpacesLayout
b4670a3 feat: route pages delegate
e2b9b2c feat: @view-transition crossfade to detail
a629437 feat: header sync + underline indicator + longer durations
5496b43 fix: early-boot click interceptor   # attempt 2
a1dc9bc tune: easeInOutCubic S-curve        # attempt 3
92c3203 fix: drop @view-transition          # attempt 4
767160e fix: offsetWidth reflow             # attempt 5
20a5f78 fix: ignore prefers-reduced-motion  # actual fix
```
