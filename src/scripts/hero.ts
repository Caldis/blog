/**
 * iOS-style tap-to-zoom routing.
 *
 * Architecture:
 *   1. Forward nav (list → detail): on the user's click, synchronously
 *      tag the clicked <a> with `data-hero="true"`. Scoped CSS promotes
 *      that (or a nested element) into a view-transition-name of `hero`.
 *      The detail page's target element has the same name statically.
 *      Browser sees one named element on each side → one morph group.
 *
 *   2. Return nav (detail → list): before the new list DOM is snapshot
 *      by the view-transition machinery, we must re-apply `data-hero` to
 *      the card that corresponds to the slug being returned from. The
 *      canonical handler lives as an `is:inline` early script in
 *      SpacesLayout.astro's <head> so it runs before `pagereveal`.
 *
 *   3. Single source of truth: at most one element carries `data-hero`
 *      at any time. Click handler clears siblings before setting.
 *
 *   4. Single sessionStorage key, `kind:slug` encoded. Prevents the
 *      cross-collection race where clicking a thought card then rapidly
 *      an album card could leave both keys present and the pagereveal
 *      handler consuming both.
 */

type HeroKind = "albums" | "thoughts";

type HeroConfig = {
  kind: HeroKind;
  /** CSS selector for clickable list entries that want a hero morph. */
  linkSelector: string;
  /** Path prefix used to match the detail URL. Must end with `/`. */
  pathPrefix: string;
};

/** Canonical sessionStorage key. Value format: `${kind}:${slug}`. */
export const HERO_STORAGE_KEY = "heroLast";

const configs: readonly HeroConfig[] = [
  {
    kind: "albums",
    linkSelector: "a[data-album-link]",
    pathPrefix: "/albums/",
  },
  {
    kind: "thoughts",
    linkSelector: "a[data-thoughts-link]",
    pathPrefix: "/thoughts/",
  },
];

function clearAllHero(root: ParentNode = document): void {
  root
    .querySelectorAll<HTMLElement>('[data-hero="true"]')
    .forEach((el) => el.removeAttribute("data-hero"));
}

function markHero(el: HTMLElement): void {
  clearAllHero();
  el.setAttribute("data-hero", "true");
}

function slugFromHref(href: string, prefix: string): string | null {
  if (!href.startsWith(prefix)) return null;
  const tail = href.slice(prefix.length).replace(/\/$/, "");
  return tail.length > 0 && !tail.includes("/") ? tail : null;
}

export function initHero(): void {
  // Forward nav: runs synchronously inside the click event so the
  // browser picks up the new `view-transition-name` when capturing the
  // "old" snapshot right before navigation.
  document.addEventListener(
    "click",
    (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if ((e as MouseEvent).button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      for (const cfg of configs) {
        const link = target.closest<HTMLAnchorElement>(cfg.linkSelector);
        if (!link) continue;
        const href = link.getAttribute("href") ?? "";
        const slug = slugFromHref(href, cfg.pathPrefix);
        if (!slug) return;
        markHero(link);
        sessionStorage.setItem(HERO_STORAGE_KEY, `${cfg.kind}:${slug}`);
        return;
      }
    },
    { capture: true }
  );
}
