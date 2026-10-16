# Learned data and applied AI — product and commerce

Izwa turns raw observations into verified datasets, specialised models, and
deployable intelligence. African languages are the first vertical, beginning
with separate, evidence-led work in siSwati, isiZulu, isiXhosa, and isiNdebele.
The engine may propose transcripts and annotations; qualified people correct,
contextualise, review, and adjudicate them.

The core business is a repeatable learned-data loop: collect for a defined
purpose, verify with people, release a versioned dataset, adapt a specified
model, evaluate independently, and use observed failures to improve the next
dataset. Commercial outputs can include datasets, adapters, custom adaptation,
evaluation, private deployments, and eventually hosted APIs. Each becomes a
product only when Izwa can demonstrate its promised outcome.

Public access through language remains an important application of this
capability. A person should eventually be able to speak the language they know
best and receive the same quality of help as someone speaking polished
English. Accent, schooling, writing confidence, and ability to pay should not
determine whether a system understands them. Public-service conversation is
therefore an expansion domain, not the initial commercial wedge.

## Contributor production model

IzwaAI operates managed, funded batches. Each batch has a defined language,
phenomenon, source-rights policy, contributor qualification, review plan,
acceptance standard, budget, and delivery target.

Contributor intake may be continental, but paid production and release happen in
reviewable cohorts. IzwaAI does not publish an annotation merely because the
engine generated it or a contributor submitted it; qualified independent review
and the applicable quality contract determine release readiness.

Creators explain intent. Language annotators correct and contextualise.
Cultural contributors document community-scoped interpretations. Reviewers
and adjudicators check the evidence. Evaluation contributors create and score
tasks on held-out material. These roles may overlap for a qualified person,
but approvals remain independent where the quality contract requires them.

Payment for performed work remains separate from licensing or revenue sharing
for source material. No submission silently grants unrestricted training,
redistribution, or derivative-model rights. The accepted rights contract must
travel with every dataset version and delivery entitlement.

## What the collection system must represent

| Layer | Collection target |
|---|---|
| Everyday service requests | How people describe documents, water, housing, schools, payments, applications, and appointments |
| Natural conversation | Interruptions, corrections, hesitation, incomplete sentences, and follow-up questions |
| Mixed language | Local languages mixed with English, abbreviations, names, and official terms |
| Speech diversity | Varieties, ages, speeds, devices, and noisy environments |
| Administrative meaning | Official terms explained in ordinary local language |
| Repair | Clarification, confirmation, correction, and graceful human handoff |
| Social context | Respect, indirectness, frustration, embarrassment, humour, and cultural expression |

Coverage cells track language variety, service situation, speech condition, and consented contributor group. Gaps create collection assignments. Counts are not enough: an abundance of clean scripted audio must not hide the absence of older speakers or spontaneous noisy conversations.

## Contextual meaning, not an idiom silo

`idiom-context-v1` remains a useful release contract, but the general record is `MeaningRecord`. A record can carry several overlapping phenomena: idiom, proverb, humour, wordplay, slang, irony, indirect speech, respect, code-switching, oral performance, or ordinary literal conversation.

Optional versioned modules add task-specific evidence:

- `humour-v1`: setup, punchline, mechanism, references, and explanation;
- `figurative-v1`: literal and figurative readings plus usage conditions;
- `slang-v1`: community scope, variants, and dated observations;
- `pragmatics-v1`: intended social action, relationship cues, and ambiguity;
- `performance-v1`: timing, pauses, emphasis, reactions, and gesture references;
- `translation-v1`: rendering, preserved meaning, lost wordplay, and reviewer notes.

Observed audience reaction and an explanation of why something may be funny are different annotations. Community claims remain scoped: “used in this circle at this time” must never become “what everyone means.”

## Public-service conversation contract

`service-conversation-v1` records original words/audio, intent, target outcome, known facts, remaining ambiguity, the next local-language response, acceptable alternatives, assumptions to avoid, and human-handoff conditions.

Approvals remain separate even when one person has multiple qualifications:

1. A community speaker validates authentic language and meaning.
2. A language reviewer validates transcript, interpretation, and translation.
3. A service practitioner validates administrative reasoning and the next step.

Language knowledge and government procedure are separate assets. Procedures carry authority, jurisdiction, effective dates, source, snapshot/hash, and verification time. Current answers must cite current procedure evidence; cultural knowledge must not silently inherit volatile administrative claims.

When IzwaAI expands into public-service language, the first field programme
should choose one language and one service journey. Its success measures are:
Was the person understood? Did they understand the response? Was the next step
correct? Was human help available when required?

## Vocabulary development

Izwa can help communities discover, borrow, adapt, and develop vocabulary across Nguni and other languages. Embeddings can surface neighbouring concepts, but people—not a model—establish usage.

Every vocabulary record has one honest state:

- `attested`: documented existing use in a specific community;
- `proposed`: a borrowing or new term with origin and intended meaning;
- `observed_adoption`: dated evidence that speakers use or adapt it.

Pronunciation, origin, examples, community scope, disagreement, and adaptation history remain visible. A proposal is never presented as established vocabulary.

## Commercial model

| Revenue stream | Product | Model |
|---|---|---|
| Dataset licensing | Ready-made versioned releases | Paid licence by release and permitted use |
| Commissioned datasets | Customer-defined collection and quality scope | Project fees and milestones; exclusivity separate |
| Adapter licensing | Task-specific weights and deployment documentation | Version licence and support |
| Custom adaptation | Model improvement for an agreed task | Project fee with acceptance criteria |
| Specialized editions | Speech, translation, humour, service conversation, evaluation | Packages or bundles |
| Annotation/enrichment | Review of customer-owned data | Project or volume fees |
| Evaluation/benchmarking | Native-speaker tests and private held-out sets | Assessment or recurring testing |
| Private refinery deployment | Institution-operated production workflow | Setup, annual licence, support |
| Hosted API | Managed access to a demonstrated capability | Usage or reserved capacity |
| Sponsored datasets | Funded collection for approved public/research access | Sponsorship or funded contract |

These are planned revenue models and target segments, not claims of secured customers, revenue, or traction.

## One commerce layer

All revenue models share customers, versioned licence templates, commercial contracts, orders, subscriptions, projects, milestones, deliveries, verified payment events, and entitlements. Linguistic quality contracts remain separate from commercial contracts.

An entitlement is the delivery gate. It identifies the organization, accepted commercial contract, resource, permission, term, and status. Legal rights—training, redistribution, derivative models, exclusivity—live in the versioned commercial contract. Download permission and usage rights are related but not identical.

Payment never exposes storage directly. A verified provider event is deduplicated and recorded with an outbox item; idempotent fulfillment activates the contract and entitlement. Institutional invoices and verified manual settlement use the same durable path. Browser “payment successful” pages cannot grant access.

Every delivery authenticates organization membership, checks an active entitlement and released artifact, records the delivery, and then proxies or signs short-lived private R2 access. Commissioned material remains private unless its contract explicitly permits catalogue reuse.

## Commercial delivery sequence

1. **Prove one dataset:** one Nguni language and task → verified release → protected evaluation.
2. **Prove one model intervention:** baseline → reproducible adaptation → independently measured improvement.
3. **Sell one outcome:** licence or paid pilot → acceptance → entitlement or private delivery.
4. **Add recurring access:** qualifying future releases, deployments, or hosted capability when demand and economics support them.

The intended advantage is the combination of community participation, human-verified cultural meaning, traceable evidence, and a repeatable production system. Reuse always depends on contributor permissions and customer agreements.
