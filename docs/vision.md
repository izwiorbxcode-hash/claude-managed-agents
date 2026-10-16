# Izwa — Canonical Company Direction

> We are not trying to build the biggest model. We are making more of the
> world learnable.

**Izwa is a learned-data infrastructure and applied AI company that turns raw
observations into verified datasets, specialised models, and deployable
intelligence. African languages—beginning with the Nguni family—are our first
research and commercial focus.**

This is the company direction. The capabilities described below are an
operating plan until Izwa builds, evaluates, and demonstrates them.

## The problem

A recording, a transcript, and a useful training example are different things.
A recording may contain several languages, noise, private information, and
culturally specific expressions. A transcript may omit words, replace the
original speech with a translation, or erase uncertainty. Even an accurate
transcript may lack the context required to train or evaluate a model.

Izwa makes raw observations usable and trustworthy. We collect permitted
source material, organise it, involve knowledgeable humans, train or adapt
models, measure their weaknesses, and use those weaknesses to improve the next
dataset.

Our first language family is Nguni: siSwati, isiZulu, isiXhosa, and isiNdebele.
Shared research may help these languages, but each requires its own coverage
and evaluation. A strong isiZulu result is not evidence of a strong siSwati
result. African languages are the first vertical; the infrastructure may later
serve other domains where Izwa can establish the necessary expertise and data
access.

## Learned data

**Learned data is data whose usefulness improves through structured
annotation, human correction, representation learning, and evidence from model
behaviour.**

The source does not learn by itself. Its surrounding record accumulates
evidence about what it contains, how it may be used, how reliable it is, and
where models succeed or fail.

The logical unit connecting that evidence is the **Learned Data Unit (LDU)**:

| Element | What it preserves |
|---|---|
| Identity | Stable record ID and version |
| Original observation | Audio, text, conversation, or other source material |
| Provenance | Origin, time, and collection process |
| Usage permissions | Permitted training, redistribution, and other uses |
| Context | Language, domain, conditions, and relevant contributor information |
| Annotations | Transcript, translation, timestamps, linguistic labels, or task labels |
| Review history | Machine proposals, human corrections, disagreement, and resolution |
| Quality evidence | Checks, uncertainty, and acceptance decisions |
| Representations | Optional embeddings with their generating model and version |
| Model interactions | Outputs, errors, and preference judgments linked to the record |
| Release membership | Dataset versions and training manifests containing the record |

An LDU is a logical structure across linked records and files. It is not one
enormous database row, and every record does not require every field.

## The operating loop

```text
collect and preserve sources
  → validate and route
  → draft transcripts and labels
  → human review and adjudication
  → versioned dataset releases
  → train or adapt models
  → independent evaluation
  → release adapters or services
  → find data and model weaknesses
  → improve collection and review
```

There are two connected improvement cycles: one improves the data, and the
other improves models using that data. Collection begins with a defined task,
such as siSwati speech recognition, customer-service translation, natural
code-switching, conversational turn-taking, or an independent evaluation set.
The purpose determines what to collect, what humans review, and what quality
means.

Preserve the original separately from cleaned derivatives. Public availability
alone does not establish permission for commercial use. Commissioned,
contributed, licensed, partner, and synthetic sources must remain distinguishable.

## Humans create the verified layer

“Human in the loop” means defined work, not an approval button.

| Role | Responsibility |
|---|---|
| Contributor | Supplies permitted recordings, text, or contextual knowledge |
| Annotator | Produces or corrects transcripts and labels |
| Reviewer | Checks accuracy and guideline compliance |
| Adjudicator | Resolves difficult cases and disagreements |
| Researcher | Designs tasks, experiments, and evaluation |
| Release owner | Approves a documented dataset or model version |

One person may hold several roles initially, but the system must preserve which
action they performed. Guidelines must cover dialect, uncertain words,
borrowed terms, code-switching, punctuation, overlapping speech, and
unintelligible segments. “Uncertain” and “cannot determine” are valid outcomes.
Selected records require independent annotation before adjudication.

### Compensation

Pay for review effort even when the machine transcript needs no change. A
practical pilot model is:

**payment = agreed base task pay + approved correction bonus + verified
discovery reward**

The base rate reflects expected time, audio quality, overlap, and task
complexity. A published pilot rubric may award one point for an ordinary
correction, three for a meaning-changing correction, and five for a critical
or specialist correction. These are starting weights, not wage rates. Count
distinct error events, apply only the highest category to the same error, and
have a human verify material bonuses against the source evidence.

Recurring error patterns that improve guidelines or many records may receive a
separate discovery reward. Contributors must see the rate, rules, decisions,
payment timing, and appeal route before accepting work. Keep annotation records
and an immutable payment ledger separate so retries cannot pay the same work
twice.

## Quality and rights

Quality is multidimensional. Track acoustic quality, transcription accuracy,
semantic fidelity, annotation consistency, coverage, permissions, and task
usefulness separately. Do not hide them inside one unexplained score.

Permissions for collection, annotation, training, redistribution, and voice
uses are distinct. Separate contributor identity from released identifiers,
restrict sensitive material, log access, and provide withdrawal and dispute
processes. Track which releases and training runs used a record. Never promise
that deleting a source automatically removes its influence from trained
weights.

## Dataset products

Datasets are products before Izwa trains its own model. Potential releases
include verified speech transcription, parallel text, instruction examples,
classification data, preference data, conversational speech, and protected
evaluation collections.

Every release needs a data card, schema, annotation guidelines, coverage
statistics, known limitations, usage terms, checksums, and changelog. Related
speakers, recordings, documents, and near duplicates must not leak across
training and evaluation splits. Maintain a protected final test set.

## Model products

Models convert learned data into defined capabilities. Izwa may produce LoRA
adapters, custom adaptations, private deployments, and eventually hosted APIs.
A model product must identify its base-model revision, language combination,
task, dataset version, configuration, and evaluation results.

Treat text, speech recognition, speech generation, conversational speech, and
embeddings as separate tracks requiring separate evidence. A “Nguni model” or
single adapter does not establish all those capabilities.

Embeddings can organise records, support retrieval, and surface candidate
duplicates; they do not certify truth. Record the embedding model and version.
A shared Nguni representation space is a hypothesis to test.

Start model work with reviewed data and supervised adaptation. Preference
optimisation comes later, when a specific remaining failure can be described
and reviewers can compare outputs meaningfully. Conversational-speech research
also comes later and requires preserving separate speakers, overlaps, pauses,
acknowledgements, and timing at collection time.

## Evaluation makes the product claim

Always compare an adapted model with its unchanged base under equivalent
conditions. Report outcomes by language, task, and relevant slice—not only as
one average—and check regressions outside the target task.

Useful measures include transcription error and correction time; translation
fidelity, omissions, terminology, and fluency; classification precision,
recall, and calibration; retrieval success; conversational comprehension and
latency; and commercial cost, reliability, and human work saved.

An improvement claim requires a versioned dataset, protected evaluation data,
reproducible settings, and recorded results. If an intervention does not
improve the target capability, that is evidence to change the collection or
training strategy.

## What customers can buy

| Offering | Customer outcome |
|---|---|
| Dataset licensing | A documented, permitted dataset version |
| Adapter licensing | Tested weights and deployment documentation |
| Custom adaptation | A model improved for an agreed task and acceptance test |
| Evaluation services | Independent assessment of a language capability |
| Private deployment | Integration into customer-controlled infrastructure |
| Hosted API | Managed access to a demonstrated model capability |

These are proposed commercial routes, not established demand or guaranteed
revenue. Sell a measurable outcome, such as reducing correction effort for
siSwati transcripts, rather than a broad promise of “African-language
intelligence.” Establish ownership and reuse rights before client data or
resulting artefacts enter a general Izwa product.

## Operating economics

Measure collection payments, reviewer time, adjudication, storage,
transcription, training experiments, failed jobs, deployment, and support.
Track cost per accepted recording hour, reviewer minutes per corrected audio
minute, acceptance rate, cost per verified example, improvement per training
investment, and margin per product or completed API task.

## Technical boundary

The application layer manages people, projects, permissions, records, tasks,
releases, and customer access. A replaceable model-compute layer handles
transcription, embeddings, training, and inference. Jobs reference immutable
inputs and processing configuration, remain idempotent on retry, record
failures, support cancellation, and cap retries.

The repository implements this through the Izwa domain packages, dataset and
annotation systems, evaluation and embedding packages, application surfaces,
and Cloudflare control plane. Infrastructure supports the company direction;
it is not the product story by itself.

## Practical sequence

| Phase | Deliverable | Evidence before expansion |
|---|---|---|
| 1 | One collection-and-review workflow for one Nguni language and task | Reliable permissions, annotations, and traceability |
| 2 | One documented, versioned dataset release | Appropriate coverage and quality |
| 3 | Reproducible baseline and adapter experiment | Measurable improvement on independent data |
| 4 | Paid deployment or licence pilot | Useful outcome and workable economics |
| 5 | Additional languages and tasks | Per-language evidence and repeatable operations |
| 6 | Targeted preference optimisation | Defined failure mode and useful preference data |
| 7 | Hosted API and conversational research | Demand, performance, and sustainable cost |

The first release demonstrates one complete path. Expansion follows evidence.

## Operating principles

1. People are experts, not raw material.
2. Source rights and labour are separate.
3. The original observation remains recoverable.
4. Disagreement and uncertainty are data.
5. Provenance travels with every release and experiment.
6. Communities and Nguni languages are not interchangeable.
7. Independent evaluation precedes capability claims.
8. Demand funds sustainable contributor work.
9. Models and vendors are replaceable; trusted learning compounds.
10. Say what exists, distinguish what is proposed, and prove improvement task by task.

**Izwa’s durable assets are its contributor relationships, permitted and
well-described data, annotation expertise, protected evaluations,
reproducible experiments, and demonstrated model improvements. Tools can be
replaced. What Izwa consistently produces with them is the company.**
