# IzwaAI media-to-learned-dataset workflow

This document follows one audio or video contribution from upload, through automated analysis and human-in-the-loop (HITL) review, to a versioned learned-dataset export. It describes the refinery implemented in `packages/domain/src/izwa` and the reference orchestration in `workers/refinery`.

> **Current implementation boundary:** the canonical API Worker in `apps/api` now mounts the consent-gated media, Workers AI transcription, idiom task, blind field-review, evaluation-partition, and immutable dataset-version routes. The reviewer UI is available at `/idiom-review`. Video demux, resumable/signed uploads, long-media orchestration, and full account authentication remain deployment boundaries.

## Outcome

The upload itself is not the learned dataset. It becomes one immutable source asset. The refinery derives one or more auditable records from it, records the decisions and corrections that produced them, and then materializes eligible records as JSONL plus a manifest in R2.

```text
raw media
  + metadata and consent
  + machine proposals
  + quality evidence
  + human correction when required
  + full provenance
  = learned data record

many learned data records + a versioned contract = learned dataset export
```

## Cultural meaning is a first-class output

Linguistic structure is not enough for culturally situated expressions. The refinery therefore has a separate `idiom-context-v1` contract. It can link to a detailed `language-v1` record, but it does not require full phonetic and syntactic analysis before meaning can be reviewed.

| Field | Required evidence |
|---|---|
| `expression_span` | Exact words plus start/end milliseconds |
| `context` | Surrounding conversation and real-world situation |
| `literal_meaning` | What the words describe literally |
| `meaning_in_source_language` | Natural explanation in the original language |
| `speaker_intent` | Value plus `speaker_attested`, `inferred`, or `unknown` basis |
| `social_function` | Advice, criticism, teasing, warning, refusal, etc. |
| `usage_conditions` | When the expression is appropriate |
| `alternative_readings` | Other readings and their supporting context |
| `translations` | Target-language renderings with register |
| `known_bad_translation` | Observed or constructed failure, explicitly labelled |
| `failure_explanation` | What the bad translation loses or gets wrong |
| `review_evidence` | Field, reviewer, role, verdict, basis, evidence IDs, and time |

For trust-critical fields, approval requires both a speaker and a different fluent reviewer (or adjudicator). `human_verified` is derived from those field approvals; editing one field never implies that every other field was checked.

Model agreement is only a routing signal. It is not correctness evidence, and the `0.78` machine threshold is an operational value until calibrated against reviewed data. Idiom releases require human verification even when machines agree. Machine-only records remain a separately labelled tier.

Machine precedents and human anchors have distinct trust tiers and retain a root source ID. Several derivatives of one source cannot masquerade as independent evidence. Likewise, evaluations are partitioned into:

- `retrieval_regression`: corrections may become reusable anchors and test known-knowledge reuse;
- `held_out`: answers are ineligible for retrieval and training and test generalization.

## End-to-end flow

```mermaid
flowchart TD
    U[Contributor selects audio/video] --> V[Client validates file + captures metadata/consent]
    V --> R2[(R2 immutable source asset)]
    R2 --> A[D1 asset row + content hash + provenance]
    A --> T[Transcribe / segment / extract audio]
    T --> P[Deterministic profiling]
    P --> E[Embed transcript and retrieve anchors/precedents]
    E --> RT[Compose task-specific specialist team]
    RT --> S[Independent specialist proposals]
    S --> Q[Merge consensus + composite quality evaluation]
    Q -->|contract passes| C[Auto-crystallize record]
    Q -->|contract fails| H[Create HITL escalation]
    H --> X[Qualified expert reviews source, proposals, and failure reasons]
    X --> Y[Expert submits correction]
    Y --> HV[Human-verified crystallized record]
    Y --> HA[Human anchor + regression evaluation case]
    C --> M[Semantic memory for future routing]
    HV --> M
    C --> D[(D1 learned records)]
    HV --> D
    D --> EX[Select eligible records by tenant/contract/version]
    EX --> J[(R2 JSONL dataset + manifest)]
```

## 1. Upload and intake

### User experience

The contributor selects an audio or video file and supplies the context needed to use it responsibly:

- tenant or project;
- source and collection method;
- language/dialect hints, if known;
- speaker and recording metadata;
- consent, license, usage restrictions, and retention policy;
- optional transcript or field notes.

The client should validate type, size, duration, and required consent before upload. Large files should upload directly to R2 using a signed URL; the Worker should receive the resulting object key rather than proxying the entire file.

### Current API shape

The canonical idiom API accepts:

1. `PUT /api/izwa/media/:key` for consented `audio/*` or `video/*` bytes;
2. `POST /api/izwa/media/:assetId/transcribe` for audio transcription and WebVTT captions;
3. `POST /api/izwa/idioms/tasks` to mark an expression and open mandatory review.

The general reference refinery endpoints remain in `workers/refinery/api.ts` while they are progressively folded into the canonical Hono API.

### Persisted artifacts

- The media bytes live in R2 under `audio/<key>`.
- D1 receives an `izwa_assets` row containing `asset_id`, modality, tenant, source, SHA-style content hash, byte size, MIME type, optional text, R2 key, profile, metadata, and creation time.
- An `ingest` provenance event links the source asset to subsequent work.

The content hash gives the system a stable deduplication signal. The source bytes should be immutable: corrections create new derived records rather than overwriting evidence.

### Required media-processing seam

The canonical API transcribes short audio with Workers AI Whisper and stores text plus WebVTT. It does **not** yet extract audio from video, identify speakers, or split long recordings. Production still needs this media-preparation stage:

```text
video → demux audio → normalize codec/sample rate
audio → voice activity detection → segments → speech-to-text
                                  ↘ timestamps / speaker labels / confidence
```

Its transcript and time-aligned segments should become derived assets linked to the original source. Short audio can use the implemented transcription endpoint; video must first be demuxed into a linked audio asset.

## 2. Deterministic profiling

`profileInput` performs cheap, non-generative inspection before any specialist-model spend. It determines or estimates:

- modality (`audio`, `video`, `text`, and other supported values);
- language and script hints;
- public versus sensitive content based on basic PII signals;
- low/medium/high complexity;
- duration and text-length indicators;
- a duplicate/content-hash signal.

These are routing hints, not facts. For example, language detection uses small heuristic word banks and must never replace expert verification.

The system resolves the active versioned quality contract at this point. The built-in `language-v1` contract requires a non-empty transcription, phonetic annotation, morphology, syntax, and language. Optional fields include dialect, English alignment, and code-switch spans.

## 3. Retrieval and routing

The transcript (or fallback hint text) is embedded with the configured embedding model. Vectorize is queried twice:

- nearest `dialect_anchor` and `human_anchor` vectors provide routing evidence;
- nearest `semantic` vectors provide precedents from previously crystallized records.

The router then composes a specialist team for this specific task. Potential roles are:

| Specialist | Primary output |
|---|---|
| Phonetics | IPA/segment-level phonetic evidence; included for audio/video |
| Morphology | Morpheme boundaries, roots, affixes, and tags |
| Syntax | Clause/constituent structure |
| Semantics | Meaning units and alignment |
| Dialect variation | Dialect/variant attribution |
| Code-switching | Language boundaries and spans |
| Translation | Faithful gloss and register notes |

Low-complexity text can use a reduced team. Audio/video includes phonetics. Every seat receives a distinct prompt version and a slice of retrieved evidence; this “independence vector” prevents several identical model calls from being mistaken for independent agreement.

A D1 `izwa_tasks` row is created with status `routing`, the selected contract, and the serialized team. One `SwarmCoordinator` Durable Object instance owns the task lifecycle.

## 4. Independent specialist analysis

The coordinator changes the task to `analyzing` and fans out to specialist Durable Objects in parallel. Each specialist returns a structured proposal:

```json
{
  "proposalId": "proposal_…",
  "specialistRole": "morphology",
  "modelId": "…",
  "promptVersion": "morphology:v1:1",
  "confidence": 0.88,
  "uncertainty": [],
  "payload": {},
  "evidenceIds": []
}
```

Every proposal, its model/prompt identity, evidence slice, uncertainty, and provenance is stored in D1. A failed specialist does not abort the whole task; it becomes a zero-confidence empty proposal so the quality engine sees the missing coverage.

Proposals are advisory. They cannot write canonical learned records directly.

## 5. Consensus and quality gates

The coordinator fills a consensus payload from the independent proposals. It then checks that payload against the active data contract and calculates a composite quality score from:

- semantic agreement between proposal embeddings;
- deterministic schema/rule validation;
- retrieved-evidence coverage;
- consistency with dialect/human anchors;
- historical evaluator performance;
- domain constraints;
- similarity-weighted human-verification history.

For the built-in language contract, the overall threshold is `0.78`. It also has hard minimums: model agreement `0.70`, deterministic validation `0.90`, and evidence coverage `0.60`. A high weighted average cannot hide a failed hard gate.

The decision and every component score are persisted. From here the workflow branches.

## 6A. Straight-through crystallization

When the contract threshold and every hard gate pass:

1. The task becomes `crystallized`.
2. D1 receives an `izwa_records` row with the consensus payload, quality breakdown, `verification_status: "auto"`, model/prompt versions, schema version, and provenance.
3. The record starts with `export_status: "pending"`.
4. The payload is embedded and written to Vectorize as `semantic_<recordId>`.
5. Similar future inputs can retrieve this accepted precedent.

“Auto” means contract-verified by the automated gates, not human-verified.

For `idiom-context-v1`, this branch creates at most a machine-tier candidate. It cannot enter a human-verified idiom release until the mandatory two-person, field-level review is complete. Other contracts may also send deterministic samples of passing records to review so the system can discover confident shared model errors.

## 6B. Human-in-the-loop escalation

When the score is too low or a hard gate fails, the system does not discard the work and does not silently accept it.

### Escalation package

An `izwa_escalations` row captures:

- overall score, threshold, and failed gates;
- component scores;
- every specialist payload, confidence, and uncertainty;
- source asset and task references;
- status (`open`, `claimed`, `resolved`, or `rejected`).

The expert router attempts to pre-claim the escalation for a qualified active linguist, using task class, language coverage, load, and historical resolution statistics.

### Expert review experience

The annotator should see the original playable media beside:

- time-aligned transcript/segments;
- machine consensus;
- individual specialist proposals and disagreements;
- retrieved precedents and anchor evidence;
- contract violations and exact failed quality gates;
- editable fields for transcription, language/dialect, phonetics, morphology, syntax, alignment, and code-switching;
- an explicit resolution note.

The expert submits `taskId`, `escalationId`, `expertId`, a structured `correction`, and `resolutionText` to `POST /api/izwa/resolve`.

### Resolution and learning

The correction is layered over the machine consensus and crystallized with `verification_status: "human_verified"` and `verified_by: <expertId>`. Resolution then produces three learning effects:

1. **Routing learns:** the resolution is embedded as a `human_anchor` in Vectorize, making similar future inputs easier to route.
2. **Evaluation learns:** the failed input and human-verified expected output become an active regression evaluation case.
3. **Organizational memory learns:** an episodic HITL resolution event and complete provenance chain are stored.

The escalation closes, its resolved record ID is attached, and the task becomes `crystallized` with phase `resolved`.

## 7. Provenance and lineage

At every material transition, `izwa_provenance` records the step, referenced object, and details. A learned record can therefore be traced through:

```text
source asset
  → ingest/profile
  → retrieved evidence and routing team
  → specialist proposals and model versions
  → quality decision
  → automatic crystallization OR expert correction
  → final record
  → dataset export
```

`GET /api/izwa/tasks/:taskId/lineage` is the reference read path. This lineage is required for audit, deletion/consent requests, dataset cards, and debugging model regressions.

## 8. Learned-dataset export

`POST /api/izwa/export` selects crystallized records for a tenant (currently up to 200 by default, capped at 500), joins each record to its source asset and lineage, and writes two R2 objects:

```text
exports/<exportId>.jsonl
exports/<exportId>.manifest.json
```

Each JSONL row follows the language contract and includes:

- `record_id` and `source_id`;
- R2 audio reference;
- transcription, language, and dialect;
- phonetic annotation and semantic alignment;
- composite quality score;
- automatic or human-verification status and verifier;
- specialist model/prompt versions;
- schema version;
- provenance summary.

The manifest contains the export ID, format, contract ID/version, tenant, record count, field list, and creation time. Exported D1 records are marked `exported`.

The idiom exporter can project the same approved record into `speech-transcription`, `idiom-detection`, `contextual-interpretation`, `translation`, `translation-correction`, `contrastive`, or `full` products. All derivatives preserve their common `source_group_id` and are assigned to the same train/validation/test split, preventing source leakage.

### Production versioning requirement

The current exporter materializes a batch, but a production learned dataset should also have a durable dataset/version entity with:

- immutable version ID and content hash;
- exact record IDs and inclusion query;
- contract and taxonomy versions;
- train/validation/test split policy;
- license/consent policy and data card;
- quality distributions and language/dialect coverage;
- parent version and changelog;
- revocation/tombstone handling.

That prevents a later export from silently changing what “version 1” meant.

## State model

```mermaid
stateDiagram-v2
    [*] --> routing: asset + task created
    routing --> analyzing: team composed
    analyzing --> crystallized: quality contract passes
    analyzing --> escalated: threshold or hard gate fails
    escalated --> crystallized: expert correction accepted
    routing --> failed: orchestration error
    analyzing --> failed: unrecoverable error
    crystallized --> exported: included in dataset batch
```

## Storage map

| Artifact | Store | Purpose |
|---|---|---|
| Original audio/video | R2 `IZWA_ASSETS` | Immutable evidence |
| Dataset JSONL and manifest | R2 `IZWA_ASSETS` | Distribution artifact |
| Assets, tasks, proposals, records | D1 | Transactional control-plane metadata |
| Escalations, experts, eval cases | D1 | HITL and evaluation state |
| Provenance and memory | D1 | Auditability and learning history |
| Dialect/human/semantic anchors | Vectorize `IZWA_INDEX` | Routing and precedent retrieval |
| Task negotiation state | Durable Object | Single-owner orchestration |
| Embeddings/specialist inference | Workers AI or configured provider | Machine representations and proposals |

## Remaining production boundaries

The narrow, fully reviewed audio-to-idiom-export path is implemented. These deployment-grade capabilities remain before the platform should accept unrestricted public production traffic:

1. Replace the interim signed reviewer credentials with Better Auth sessions, managed tenant membership, reviewer qualifications, and authorization for every contributor and administrative route.
2. Add direct resumable/signed R2 uploads, quotas, malware/media validation, and upload finalization rather than proxying large bodies through one request.
3. Add video demux, audio normalization, diarization, voice-activity segmentation, and queued/workflow-based processing for long media.
4. Add reviewer assignment locks, deadlines, notifications, and a dedicated adjudication comparison view; conflicting values already stop crystallization and route to adjudication.
5. Add consent withdrawal, retention enforcement, PII redaction, record revocation, and deletion propagation into published versions.
6. Add signed dataset downloads, richer data cards, quality/coverage distributions, parent-version changelogs, and revocation manifests.
7. Add idempotency keys, queue retries, dead-letter handling, and end-to-end operational telemetry.
8. Calibrate machine routing thresholds against labeled human-reviewed data; they must never be presented as probabilities of cultural correctness.

## One-sentence mental model

IzwaAI preserves the user's media as evidence, asks independent specialists to propose structured interpretations, uses a versioned quality contract to decide what can be trusted, sends uncertainty to the right human, turns that correction into both a verified record and future learning, and exports only crystallized records as an auditable learned dataset.

The broader contextual-language, public-service, vocabulary-development, and commercial model is specified in [`docs/mission-commerce.md`](docs/mission-commerce.md).
## Reviewer access

Review queues and submissions require a tenant-scoped, expiring reviewer token.
Set `REVIEW_AUTH_SECRET` as a Worker secret, then create a token locally:

```sh
cd apps/api
REVIEW_AUTH_SECRET='your-local-secret' bun run review:token reviewer_01 speaker default 8
```

Paste the generated credential into the reviewer screen. It is kept in browser
session storage and removed when the browser session ends. `IZWA_DEV_AUTH=true`
enables header-based identities for local automation only and must not be set in
production.
