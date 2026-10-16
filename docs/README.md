# Izwa documentation

This directory contains current Izwa documentation and archived material from
the repository template. Use this page to avoid treating legacy infrastructure
guides as current company direction.

## Start here

1. [`vision.md`](vision.md) — canonical company direction, definitions, product
   boundaries, evaluation standard, and build sequence.
2. [`product-guide.md`](product-guide.md) — how users, records, datasets,
   experiments, and products fit together.
3. [`system-map.md`](system-map.md) — runtime topology and repository ownership.
4. [`developer-guide.md`](developer-guide.md) — local development and safe
   feature workflow.

If another document conflicts with `vision.md`, the vision is authoritative.
Implementation code and migrations remain authoritative for shipped behaviour.

## Company and product

| Document | Purpose |
|---|---|
| [`vision.md`](vision.md) | Canonical direction and operating principles |
| [`mission-commerce.md`](mission-commerce.md) | Commercial outputs, rights, and delivery sequence |
| [`product-guide.md`](product-guide.md) | Product objects, users, flows, and current maturity |
| [`community-evaluated-benchmarks.md`](community-evaluated-benchmarks.md) | Evaluation integrity and first benchmark programme |

## Engineering

| Document | Purpose |
|---|---|
| [`developer-guide.md`](developer-guide.md) | Setup, commands, tests, and change workflow |
| [`system-map.md`](system-map.md) | Applications, packages, workers, and persistence |
| [`web-deployment.md`](web-deployment.md) | Canonical full-stack deployment and verification |
| [`stack/`](stack/) | Stack-specific implementation notes |
| [`stack-ARCHITECTURE.md`](stack-ARCHITECTURE.md) | Unsung Stack dependency rules |

## Legacy sandbox documentation

The following files describe the archived Claude Managed Agents sandbox and
are retained as historical or reusable technical reference. They do not define
Izwa’s product direction or canonical deployment:

- `about.md`
- `adding-custom-tools.md`
- `agent-email.md`
- `applying-egress-policies.md`
- `architecture.md`
- `browser-rendering-tools.md`
- `connecting-to-private-services.md`
- `customizing-sandboxes.md`
- `isolate-vs-vm-sandboxes.md`
- `securing-access.md`
- `snapshots-and-state-persistence.md`

The associated implementation is under `legacy/sandbox/`. Do not add new Izwa
features there.

## Documentation rules

- Describe shipped foundations separately from proposed capabilities.
- Scope model claims by language, task, model revision, dataset, and evaluation.
- Never use a combined Nguni result as a substitute for per-language evidence.
- Keep source permissions, contributor labour, and commercial licences distinct.
- Update API examples when route contracts change.
- Update `vision.md` first when company direction changes, then align the
  product and public documentation.

