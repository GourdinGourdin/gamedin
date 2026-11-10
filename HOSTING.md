# Hosting GamedIn

GamedIn is a static site: `npm run build` writes everything to `dist/`, with no server code. Any static host works. All links are relative and routes live after `#`, so it runs at a domain root or under a sub-path, with no rewrite rules.

## Recommended: GitHub Pages (free)

`.github/workflows/deploy.yml` tests, builds and publishes the app on every push to `main`.

1. Create a repository on GitHub and push this folder to it. On the free plan, Pages needs the repository to be **public**, which makes the source code public.
2. In the repository, go to Settings, then Pages, and set Source to **GitHub Actions**.
3. Push to `main`. The site appears at `https://<account>.github.io/<repository>/` within about a minute.

The workflow passes the site's address to the build as `SITE_URL`. With it the build fills in canonical links, `og:image` (link previews on LinkedIn, iMessage, WhatsApp, X), structured data, `sitemap.xml` and `robots.txt`.

## Pages the build writes

- `index.html`: the app and the home page.
- `trace/index.html`, `crowns/`, `pairs/`, `plots/`, `wind/`: one real page per game, each with its own title, description, canonical, preview image (`og-<game>.png`) and JSON-LD. They load the same app, one folder deeper (assets are `../assets/...`); the app leaves the game page for the site root as soon as you start a puzzle.
- `404.html`: sends people home. GitHub Pages and Vercel serve it for unknown paths.
- `sitemap.xml`, `robots.txt`: absolute URLs, only when `SITE_URL` is set.

A project site on GitHub Pages cannot serve a `robots.txt` at the domain root, so crawlers ignore it there; submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools instead.

## Other hosts

| Host | Build command | Output folder | Notes |
|---|---|---|---|
| Netlify | `npm run build` | `dist` | Reads the cache rules in `public/_headers` |
| Cloudflare Pages | `npm run build` | `dist` | Reads the cache rules in `public/_headers` |
| Vercel | `SITE_URL=https://gourdingourdin.github.io/gamedin/ npm run build` (already in `vercel.json`) | `dist` | Framework preset: Vite. `vercel.json` sets `trailingSlash` so `/trace` goes to `/trace/`, which the relative asset paths need |

On every host, set the environment variable `SITE_URL` to the final address, for example `https://gamedin.app/`. A mirror, like the Vercel one, sets it to the primary site's address so its pages name that site as canonical and search engines index only one copy. Netlify and Cloudflare Pages need the same `trailingSlash` behaviour, which they have by default.

## Custom domain

Buy the domain, point it at the host as the host's docs describe, then change `SITE_URL` to it. For GitHub Pages, add the domain under Settings, then Pages, and add a `public/CNAME` file containing the domain.

## Before each release

```bash
npm test             # engines
SITE_URL=https://gourdingourdin.github.io/gamedin/ npm run build
SITE_URL=https://gourdingourdin.github.io/gamedin/ npm run check:dist   # serves dist/ under /gamedin/: install, offline play, game pages, SEO tags
npm run e2e          # plays all five games (needs `npm run dev -- --port 5183`)
```

## Updates reach players

The page itself is always fetched from the network first, so a new release shows up on the next visit. The service worker only serves its cached copy when the player is offline. Built assets have content hashes in their names, so they can be cached forever.

## Regenerating images

- `npm run icons` renders the app icons from `public/icon.svg`.
- `npm run og` renders `public/og.png` and `public/og-<game>.png`, the link-preview images. It needs the dev server running on port 5183. The game images are drawn by `scripts/og.tsx`.
