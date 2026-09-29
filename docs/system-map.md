# IzwaAI System Map

## Runtime topology

```text
Web / Annotator / Mobile
          │ typed HTTP contracts
          ▼
   apps/api (Hono)
          │ per-request Effect services
   ┌──────┼──────────┬──────────────┐
   ▼      ▼          ▼              ▼
  D1      R2     Vectorize      Workers AI
metadata assets  retrieval      inference
   │                 │
   └────────┬────────┘
            ▼
 ingestion → refinery Durable Objects → workflows
            │
            ▼
      annotation / evaluation
```

Cloudflare is the control plane: HTTP, identity, metadata, object storage, retrieval, stateful coordination, and workflows. GPU training and research stay under `ml/`; they are not forced into the Workers runtime.

## Repository ownership

| Path | Responsibility | Status |
|---|---|---|
| `apps/api` | Canonical Hono + Effect API Worker | Active |
| `apps/web` | Vite/React operations and documentation SPA | Active |
| `apps/annotator` | Human review and adjudication | Scaffold |
| `apps/admin` | Identity and platform administration | Scaffold |
| `apps/mobile` | Field collection and offline annotation | Scaffold |
| `packages/domain/src/izwa` | Refinery rules, contracts, routing, quality, and export | Active |
| `packages/db` | Drizzle schema, repositories, and D1 migrations | Active |
| `packages/taxonomy` | Language and domain taxonomy | Active |
| `packages/datasets` | Dataset, version, and LDU types | Active |
| `packages/annotation` | Task, review, and resolution types | Active |
| `packages/embeddings` | Representation and lineage types | Active |
| `packages/evaluation` | Benchmarks, runs, and quality gates | Active |
| `packages/api` | Shared client-facing API contracts | Active |
| `packages/effect` | Request context, runtime, and logging support | Active |
| `workers/ingestion` | Intake and routing edge worker | Emerging |
| `workers/refinery` | Stateful coordinator and specialists | Emerging |
| `workers/workflows` | Long-running orchestration | Emerging |
| `workers/agent-session` | Agent session state | Emerging |
| `legacy/sandbox` | Archived Claude Managed Agents implementation | Archived; do not extend |

## Dependency direction

```text
domain ← application services ← infrastructure adapters ← Hono/API
   ↑                                                     ↑
   └──────────────── client contracts ───────────────────┘
```

The domain layer must not import Hono, React, Drizzle, Better Auth, or Cloudflare bindings. Infrastructure receives bindings at the request boundary; request-scoped I/O objects must not be cached globally.

## Persistence

- **D1:** control-plane metadata, tasks, proposals, records, escalations, provenance, users, and projects.
- **R2 (`IZWA_ASSETS`):** immutable source artifacts and large derived objects.
- **Vectorize (`IZWA_INDEX`):** semantic routing and retrieval. D1 retains representation lineage.
- **Durable Objects:** refinery coordination, specialists, and stateful sessions.
- **Queues/Workflows:** retryable and long-running processing.

The canonical D1 migrations live in `packages/db/src/migrations`. The root `migrations/` and root Worker configuration belong to the archived sandbox lineage and are not the canonical API migration path.

## Important boundaries

- `apps/api/wrangler.jsonc` is the canonical API Worker configuration.
- `apps/web/wrangler.jsonc` deploys only the built SPA and cannot provision backend resources.
- Secrets never belong in committed `vars`; use Wrangler secrets for production.
- A proposal is not a canonical record until it passes quality gates or human review.
- Raw assets are immutable; corrections create new records and lineage.

