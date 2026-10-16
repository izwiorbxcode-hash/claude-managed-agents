# Izwa

**Learned-data infrastructure and applied AI.**

Izwa turns raw observations into verified datasets, specialised models, and
deployable intelligence. African languages—beginning with siSwati, isiZulu,
isiXhosa, and isiNdebele in the Nguni family—are the first research and
commercial focus.

> We are not trying to build the biggest model. We are making more of the
> world learnable.

## What the system does

```text
collect and preserve
  → validate and route
  → create machine drafts
  → review and adjudicate with people
  → publish versioned datasets
  → train or adapt models
  → evaluate independently
  → deploy demonstrated capabilities
  → turn failures into the next data priorities
```

The logical record connecting source evidence, permissions, annotations,
review history, representations, model behaviour, and releases is the
**Learned Data Unit (LDU)**.

## Product status

| Area | Current status |
|---|---|
| Collection and human review | Working foundation |
| Versioned datasets and evaluation cases | Working foundation; no public dataset release yet |
| Dataset licensing and evaluation services | Commercial foundation; demand still to be validated |
| LoRA adapter licensing | Proposed; requires a reproducible improvement result |
| Custom model adaptation | Proposed |
| Private deployment | Proposed |
| Hosted model API | Proposed |

“Foundation” means supporting workflow code exists. It does not mean a
sellable product or model capability has been demonstrated.

## Repository map

| Path | Responsibility |
|---|---|
| `apps/api` | Canonical Hono API Worker and same-origin web delivery |
| `apps/web` | Public site, contribution studio, product and contributor pages |
| `apps/annotator` | Human correction, review, and adjudication surface |
| `apps/mobile` | Voice-first and field contribution surface |
| `packages/domain/src/izwa` | LDU, quality, provenance, and refinery domain logic |
| `packages/datasets` | Dataset and release contracts |
| `packages/annotation` | Human task and review contracts |
| `packages/evaluation` | Protected evaluations and benchmark logic |
| `packages/embeddings` | Representation lineage and retrieval support |
| `packages/taxonomy` | Language, variety, task, and phenomenon taxonomy |
| `packages/db` | D1 schemas and migrations |
| `workers` | Background ingestion, refinery, session, and workflow workers |
| `legacy/sandbox` | Archived template worker; do not extend |

## Start locally

Requirements: Bun, a supported Node.js runtime, and Wrangler authentication for
Cloudflare-backed operations.

```sh
bun install
bun run typecheck
bun run test
bun run dev
```

Useful focused commands:

```sh
bun run dev:api
bun run dev:web
bun run build
bunx wrangler dev --cwd apps/api
```

Local services use the bindings declared in `apps/api/wrangler.jsonc`. D1
migrations live in `packages/db/src/migrations`.

## API

The full-stack deployment serves the SPA and Hono API from one origin.

| Endpoint | Purpose |
|---|---|
| `GET /api/izwa` | Discover the API and current Nguni focus |
| `GET /api/izwa/direction` | Canonical direction and operating stages |
| `GET /api/izwa/capabilities` | Foundation and proposed offering status |
| `GET /api/izwa/languages` | Current Nguni focus languages |
| `GET /api/izwa/languages?scope=research` | Wider research taxonomy |
| `GET /api/izwa/contract` | Active language quality contract |
| `GET /api/openapi.json` | OpenAPI 3.1 document |
| `GET /redoc` | Browser API reference |

Live deployment: [izwa-api.mkfixpro.workers.dev](https://izwa-api.mkfixpro.workers.dev)

## Deploy

The canonical full-stack target is `izwa-api`. It packages the current
`apps/web/dist` assets and runs API routes first for `/api/*` and `/health`.

```sh
bun run typecheck
bun run build
bunx wrangler deploy --cwd apps/api
```

Apply remote D1 migrations separately when a release contains migration files:

```sh
bunx wrangler d1 migrations apply izwa-db --remote --cwd apps/api
```

Do not deploy `legacy/sandbox` as part of Izwa.

## Documentation

Start with the [documentation index](docs/README.md).

- [Canonical company direction](docs/vision.md)
- [Product guide](docs/product-guide.md)
- [Product and commerce](docs/mission-commerce.md)
- [System map](docs/system-map.md)
- [Developer guide](docs/developer-guide.md)
- [Evaluation programme](docs/community-evaluated-benchmarks.md)
- [Deployment guide](docs/web-deployment.md)

## Release standard

Izwa does not claim a capability because a route, model call, or demo exists.
A product claim requires permitted data, a versioned dataset, a protected
evaluation, reproducible configuration, comparison with an unchanged baseline,
and results reported for the specific language and task.

## License

MIT. Dataset, model, source-material, and contributor rights are governed by
their own explicit terms and are not granted by the repository licence.

