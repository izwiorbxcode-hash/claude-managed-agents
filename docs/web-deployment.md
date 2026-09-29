# Deploy the Web App to Cloudflare Workers

The web app is a standalone static-assets Worker. Its configuration is `apps/web/wrangler.jsonc`, its build output is `apps/web/dist`, and SPA fallback allows deep links such as `/docs/system-map` to load correctly.

## Deploy

```sh
bun run build:web
bun run deploy:web
```

The deploy task depends on the web build, so `bun run deploy:web` is sufficient during routine releases. The explicit two-command form is useful in CI because the build can be inspected before release.

## Preview with the Workers runtime

```sh
bun run build:web
bun --cwd apps/web run preview
```

## What this deploy includes

- the React SPA;
- the in-app Markdown documentation;
- the standalone Redoc page and other files under `apps/web/static`.

It does **not** deploy the API, create D1/R2/Vectorize resources, or deploy the archived sandbox Worker. That separation is deliberate: a documentation/UI release should not mutate backend infrastructure.

## Backend connectivity

During local development Vite proxies same-origin API paths to `localhost:8787`. In production, the UI currently expects `/api/*` on the same origin. Before enabling operational views on a standalone domain, route `/api/*` to the deployed `izwa-api` Worker using a Cloudflare Worker route or service-binding proxy and set the API's allowed origin to the web hostname.

The documentation routes remain fully functional without the API; the header reports a configuration error when the backend is unavailable.

## Release checks

```sh
bun run typecheck
bun run build:web
```

After deployment, verify `/`, `/docs/product-guide`, `/docs/system-map`, and `/redoc.html`. Also confirm that an arbitrary client-side route returns the SPA shell instead of a 404.

