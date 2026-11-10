# Hosting GamedIn

GamedIn is a static site: `npm run build` writes everything to `dist/`, with no server code. Any static host works. All links are relative and routes live after `#`, so it runs at a domain root or under a sub-path, with no rewrite rules.

## Recommended: GitHub Pages (free)

`.github/workflows/deploy.yml` tests, builds and publishes the app on every push to `main`.

1. Create a repository on GitHub and push this folder to it. On the free plan, Pages needs the repository to be **public**, which makes the source code public.
2. In the repository, go to Settings, then Pages, and set Source to **GitHub Actions**.
3. Push to `main`. The site appears at `https://<account>.github.io/<repository>/` within about a minute.

The workflow passes the site's address to the build as `SITE_URL`, so link previews (on LinkedIn, iMessage, WhatsApp, X) show `og.png`.

## Other hosts

| Host | Build command | Output folder | Notes |
|---|---|---|---|
| Netlify | `npm run build` | `dist` | Reads the cache rules in `public/_headers` |
| Cloudflare Pages | `npm run build` | `dist` | Reads the cache rules in `public/_headers` |
| Vercel | `npm run build` | `dist` | Framework preset: Vite |

On every host, set the environment variable `SITE_URL` to the final address, for example `https://gamedin.app/`, so link previews work.

## Custom domain

Buy the domain, point it at the host as the host's docs describe, then change `SITE_URL` to it. For GitHub Pages, add the domain under Settings, then Pages, and add a `public/CNAME` file containing the domain.

## Before each release

```bash
npm test             # engines
npm run build
npm run check:dist   # serves dist/ under /gamedin/: install, offline play, previews
npm run e2e          # plays all five games (needs `npm run dev -- --port 5183`)
```

## Updates reach players

The page itself is always fetched from the network first, so a new release shows up on the next visit. The service worker only serves its cached copy when the player is offline. Built assets have content hashes in their names, so they can be cached forever.

## Regenerating images

- `npm run icons` renders the app icons from `public/icon.svg`.
- `npm run og` renders `public/og.png`, the link-preview image. It needs the dev server running on port 5183.
