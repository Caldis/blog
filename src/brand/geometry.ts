/**
 * Caldis brand — logo mark geometry.
 *
 * Single source of truth for the mark's shape. Every surface that
 * renders the logo (Astro SSR component, canvas rasteriser for the
 * interactive About hero, standalone favicon.svg) reads its numbers
 * from here so iterations stay consistent without hunting through
 * component files.
 *
 * To iterate the mark:
 *   1. Edit values below.
 *   2. Manually sync `public/favicon.svg` — it's a static file the
 *      browser fetches directly; no build step generates it yet.
 *      Its top comment flags the dependency.
 */

/** Source viewBox is square, edge length in abstract units. */
export const MARK_VIEWBOX = 32;

/** Outer square frame — the "page" container. */
export const FRAME = {
  x: 5,
  y: 5,
  w: 22,
  h: 22,
  stroke: 1.75,
} as const;

/** Interior diagonal — the italic gesture, runs bottom-left to top-right. */
export const DIAGONAL = {
  x1: 11,
  y1: 22,
  x2: 22,
  y2: 11,
  stroke: 3.25,
} as const;

/**
 * Alpha fade applied along the diagonal only. Bottom terminal is full
 * ink; top terminal is {@link DIAGONAL_FADE.minAlpha}. Interior serif
 * italics use the same bottom-heavy fade to read as "lifting off the
 * page".
 */
export const DIAGONAL_FADE = {
  topY: 11,
  bottomY: 22,
  minAlpha: 0.5,
  maxAlpha: 1.0,
} as const;

/** Hex ink used in the default (background-bearing) favicon tile.
 *  In-context (Header, About) inline SVG uses `currentColor` so the
 *  mark inherits whatever color the surrounding type uses. */
export const BRAND_INK_HEX = "#1b1917";
export const BRAND_PAPER_HEX = "#e6e0d2";
