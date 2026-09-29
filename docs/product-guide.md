# IzwaAI Product Guide

IzwaAI is a learned-data platform. It turns underrepresented real-world information—starting with Southern African languages—into versioned datasets, representations, evaluations, and feedback that can reliably improve specialized AI systems.

## The core object: a Learned Data Unit

A Learned Data Unit (LDU) is more than a row of text. It connects the original evidence to everything learned from it:

- the immutable source asset and its provenance;
- language, dialect, domain, consent, and licensing metadata;
- human annotation and reviewer decisions;
- embeddings and other machine representations;
- model outputs, errors, and evaluation results;
- correction history and representation lineage.

This lineage is the product. A model can be replaced; the accumulated evidence, corrections, and quality signals continue to compound.

## The refinery loop

```text
ingest → profile → route → specialist analysis → evaluate
       → crystallize trusted knowledge OR escalate to a human
       → embed the resolution → improve the next routing decision
```

1. **Ingest.** Audio, text, documents, images, or structured records enter through the API and are stored without overwriting their source.
2. **Profile.** The refinery identifies language, dialect, domain, risk, and likely task type.
3. **Route.** Vector similarity and taxonomy metadata select the appropriate specialist path.
4. **Analyze.** Specialists produce structured proposals rather than silently mutating canonical data.
5. **Evaluate.** Quality gates score confidence, agreement, provenance, and policy compliance.
6. **Crystallize or escalate.** High-confidence work becomes a versioned record; uncertain work enters the annotation queue.
7. **Learn.** Human resolutions are embedded and linked back to the decision that needed correction.

## Primary users

| User | What they need | Product surface |
|---|---|---|
| Data contributor | Safe, low-friction collection with consent | Mobile app and ingestion API |
| Annotator or linguist | Context-rich tasks and review queues | Annotator app |
| Researcher | Reproducible datasets and evaluations | Dataset, embedding, and evaluation packages |
| AI team | Stable contracts and traceable exports | API and generated dataset versions |
| Operator | Health, routing, quality, and cost visibility | Web and admin apps |

## Current product state

The repository contains a working TypeScript domain kernel and an evolving Cloudflare control plane. Some surfaces are intentionally placeholders. Treat package names and APIs as the source of truth; phase labels in older template documentation describe direction, not necessarily shipped functionality.

The canonical strategy is in [`docs/vision.md`](./vision.md), while the implementation map is in the [System Map](/docs/system-map).

