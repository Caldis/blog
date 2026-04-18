# Blog — Agent Instructions

Astro 5 static blog deployed to GitHub Pages (caldis.me).

## Creating a New Article

### 1. File

Create `src/content/thoughts/{YYYY-MM-DD}-{topic-slug}.md`.

### 2. Frontmatter

```yaml
---
title: "标题"                      # required
subtitle: "副标题"                  # optional — italic under h1
date: 2026-01-23                   # required
summary: "列表页摘要"               # optional — shown on /thoughts list
image: /images/xxx.jpg             # optional — hero header image
imageAlt: "description"            # optional — screen reader alt text
heroLayout: stacked                # optional — stacked (default) | spread
---
```

### 3. Hero Image (optional)

Place image in `public/images/`. Reference via `/images/filename` in frontmatter `image` field. No image field = no hero rendered.

### 4. Supported Prose Elements

p, h2, h3, a, strong, em, blockquote, ul, ol, hr, code, pre, img — all styled in `[slug].astro`.

### 5. Deploy

```bash
git add -A src public
git commit -m "post: title"
git push origin main
```

GitHub Actions auto-builds and deploys to Pages (~40s).

### 6. URLs

- List: `/thoughts/`
- Detail: `/thoughts/{filename-without-extension}/`

## Writing Style

- Casual, direct, no padding or melodrama
- State facts, use short sentences
- Use `[]` to label app names / cited content
- Keep technical terms in English (ADB, scancode, RFC)
- Tone like a Reddit share post — not formal, not literary
- Titles should feel like a "weekend research" — no academic thesis titles

## Design Constraints

- Accent color: Prussian Blue `oklch(32% 0.07 245)`
- Fonts: Newsreader (serif, headings + masthead + prose) / Geist (sans, metadata + UI)
- Self-hosted woff2 in `public/fonts/` — do NOT add Google Fonts CDN links
- Nav active state: font-weight only (400 → 540), same font family, ghost-label grid for layout stability
- No BEM double-hyphen `--` in Astro scoped CSS (parser drops them) — use single hyphen
- Article detail uses `display: flex; flex-direction: column` (NOT grid) to allow hero breakout positioning
- Footer component on thoughts list + detail pages only (not About / Projects)
