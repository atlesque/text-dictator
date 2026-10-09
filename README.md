# text-dictator

Nuxt 4 + Nuxt UI single-page app for dictating any text back to the user.

## Features

- Letter-by-letter or sentence-by-sentence dictation
- Adjustable speech rate and voice
- Repeat counts or continuous looping
- Light-bar visualizer that reacts to the dictated text
- Reset and clear controls

## Development

```bash
pnpm install
pnpm dev
```

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## SEO

Canonical, Open Graph, robots.txt and sitemap URLs use `https://text-dictator.pages.dev` by default. Set `NUXT_PUBLIC_SITE_URL` at build time when the app is served from another domain.
