# Izwa product guide

Izwa is a learned-data infrastructure and applied AI company. It turns raw,
permitted observations into verified datasets, specialised models, and
deployable intelligence. The first focus is the Nguni language family:
siSwati, isiZulu, isiXhosa, and isiNdebele.

This guide explains the product system. The canonical strategy and operating
principles remain in [`vision.md`](vision.md).

## Product thesis

A recording is evidence, not a dataset. A transcript is an interpretation, not
automatically a reliable training example. A model output is a proposal, not a
verified fact.

Izwa becomes valuable by preserving the links between those objects:

```text
source → machine proposal → human correction → review decision
       → dataset release → model experiment → evaluation result
       → failure evidence → next collection priority
```

## Core product objects

### Source asset

An immutable original observation such as audio, text, a conversation, or a
document. It carries provenance, source grouping, permissions, and relevant
collection context. Cleaned or normalised derivatives never replace it.

### Learned Data Unit

The LDU is the logical record connecting:

- stable identity and version;
- original source evidence;
- provenance and permissions;
- language, variety, domain, and conditions;
- transcripts, translations, timestamps, and task annotations;
- machine proposals and human corrections;
- review, disagreement, adjudication, and uncertainty;
- quality evidence;
- embeddings with model lineage;
- model outputs and observed failures; and
- dataset and training-manifest membership.

An LDU spans linked records and files. It is not one database row.

### Dataset release

An immutable, documented selection of verified LDUs. A release includes a
manifest, schema, data card, annotation guidance, coverage, checksums, known
limitations, usage terms, changelog, and split policy.

### Experiment

A reproducible model intervention tying together the exact dataset version,
base-model revision, adapter or training configuration, prompts where
relevant, runtime configuration, and resulting artefacts.

### Evaluation

A protected set of tasks and evidence used to compare the experiment with an
unchanged baseline. Results are reported by language, task, and relevant slice.
Related speakers, documents, recordings, and near duplicates must not cross
protected split boundaries.

### Offering

A customer-facing outcome backed by the objects above. Izwa does not promote a
technical artefact to an offering until its intended outcome can be tested.

## Users and interfaces

| User | Primary need | Surface |
|---|---|---|
| Contributor | Clear purpose, permission, submission status, and payment terms | Web/mobile contribution flow |
| Annotator | Source playback, correction, labels, uncertainty, and guidelines | Annotator workspace |
| Reviewer | Independent evidence review and disagreement handling | Review queues |
| Adjudicator | Resolve or preserve disputed interpretations | Adjudication workspace |
| Researcher | Dataset filters, manifests, experiments, and comparisons | Packages, API, and research tooling |
| Release owner | Quality, rights, coverage, and release approval | Admin operations |
| Customer | Documentation, samples, licences, versions, and delivery | Web/API customer surface |

## First complete product path

The first release should select one Nguni language and one task. For example, a
siSwati speech-transcription programme would:

1. define the target recording conditions and success measure;
2. collect permitted audio with source-group identity;
3. preserve a machine transcript as a draft;
4. pay annotators to correct it;
5. obtain independent review for selected records;
6. adjudicate disagreements;
7. publish a versioned training release and protected evaluation;
8. establish an unchanged model baseline;
9. run one reproducible adaptation;
10. measure transcription error and human correction effort; and
11. use the remaining errors to determine the next collection.

The same workflow may later support translation, retrieval, classification,
speech generation, and conversational speech, but each is a separate product
track requiring its own evidence.

## Contributor compensation

The proposed pilot formula is:

```text
payment = base task pay + approved correction bonus + discovery reward
```

Base pay compensates the act of listening and checking, including correct
confirmation. Correction bonuses reward verified error events rather than
characters changed. Discovery rewards cover recurring patterns that improve
many records or the annotation guidance. Human review of material bonuses and
an appeal route remain mandatory.

Annotation evidence and the payment ledger are separate. Every approved amount
links back to one correction, rubric version, and decision so retries cannot
pay the same work twice.

## Offerings and maturity

| Offering | Current maturity | Evidence required to advance |
|---|---|---|
| Dataset licensing | Workflow foundation | First rights-cleared, documented release |
| Evaluation services | Workflow foundation | Protected evaluation and repeatable report |
| Adapter licensing | Proposed | Improvement over a fixed base on independent data |
| Custom adaptation | Proposed | Paid scope with measurable acceptance criteria |
| Private deployment | Proposed | Demonstrated model, security scope, and support economics |
| Hosted API | Proposed | Demand, reliability, latency, cost, and margin evidence |

“Foundation” is an implementation status, not a traction or revenue claim.

## API contract

The API exposes direction and maturity explicitly:

- `/api/izwa` — discovery and current focus;
- `/api/izwa/direction` — operating stages and proof standard;
- `/api/izwa/capabilities` — foundation versus proposed offerings;
- `/api/izwa/languages` — current Nguni focus;
- `/api/izwa/languages?scope=research` — wider taxonomy;
- `/api/izwa/contract` — active language quality contract; and
- `/api/openapi.json` — OpenAPI 3.1 description.

Collection, annotation, dataset, and evaluation endpoints represent workflow
foundations. Their existence does not establish product readiness.

## Current product state

The repository contains a working TypeScript domain kernel, a Hono API on
Cloudflare Workers, source storage and metadata bindings, contribution and
review foundations, dataset-version construction, evaluation-case management,
and a public web surface.

There is no published public dataset, demonstrated commercial adapter, private
model deployment, or hosted inference product yet. Those milestones require
the evidence described above.

