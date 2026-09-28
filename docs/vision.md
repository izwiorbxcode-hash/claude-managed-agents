# IzwaAI — Canonical Vision (condensed)

> “We are not trying to build the biggest model. We are trying to make more of the world learnable.”
> **IZWAAI — The Learned Data Layer for Specialized Intelligence.**

## What IzwaAI is

IzwaAI is an AI research and infrastructure company turning underrepresented
real-world information into high-value machine-learnable data,
representations, evaluations, and specialized models.

It is **not fundamentally a language-model company**. It is a
**learned-data company whose first frontier is African language intelligence.**

## Central thesis

As foundation models become increasingly capable, **specialized data,
representations, evaluation and domain-specific feedback become increasingly
valuable**. General intelligence + specialized information → specialized
capability — and specialized information compounds into a moat.

## Learned Data Unit (LDU)

The atomic object. Raw observation + structured metadata + human annotation +
machine representation + model interaction + human feedback + evaluation +
provenance + representation lineage. Implemented as:

- `packages/datasets` — Dataset / DatasetVersion / LearnedDataUnit
- `packages/taxonomy` — Nguni (isiZulu, isiXhosa, siSwati, isiNdebele) → Sotho-Tswana
- `packages/annotation` — tasks, reviews, human-in-the-loop queue
- `packages/embeddings` — Representation + lineage (vectors in R2/Vectorize)
- `packages/evaluation` — benchmarks, runs, quality gates
- `packages/domain/src/izwa` — refinery kernel (profile → route → analyze → evaluate → crystallize/escalate)
- `packages/db` — D1 control plane (`izwa_assets`, `izwa_tasks`, `izwa_proposals`, `izwa_records`, `izwa_escalations`, `izwa_provenance`, …)

## Flywheel

```
DATA → MODEL → PREDICTIONS → ERRORS → HUMAN/EXPERT FEEDBACK
→ BETTER DATA → BETTER REPRESENTATION → BETTER MODEL → NEW ERRORS → …
```

Every engagement makes the next one easier. The moat is the accumulated
learning around the data — corrections, representations, evaluations,
provenance, error histories — not the model alone.

## First frontier

Nguni vector-space research: to what extent can specialized, human-curated
linguistic data improve shared representations and cross-lingual transfer
across low-resource Southern African languages vs general multilingual models?
`ml/embeddings` + `ml/evaluation` own this question.

## Stack (this repo)

| Layer | Technology |
|---|---|
| Monorepo | Bun + TypeScript + Turborepo |
| App logic | Effect (typed errors, services) |
| API | Hono (+ Hono RPC contracts in `packages/api`) |
| Web | `apps/web` (Vite SPA today → TanStack) · `apps/annotator` · `apps/admin` |
| Mobile | `apps/mobile` (Expo field/annotation, offline-first) |
| Auth | Better Auth (`packages/auth`) |
| Metadata | D1 + Drizzle (`packages/db`) |
| Lake | R2 (`packages/storage`, `IZWA_ASSETS`) |
| Vectors | Vectorize `izwa-refinery` + lineage in D1 |
| Stateful | Durable Objects (`workers/refinery`, `workers/agent-session`) |
| Pipelines | Workflows (`workers/workflows`) + Queues |
| ML | Python/PyTorch/HF in `ml/` (GPU infra, never forced into Workers) |

Cloudflare is the **control plane** (edge, APIs, identity, state,
orchestration, storage, metadata, product infra). GPUs do training.
Expo puts collection/annotation in people's hands. Effect makes the control
plane reliable. **Unsung Stack → IzwaAI domain.**
