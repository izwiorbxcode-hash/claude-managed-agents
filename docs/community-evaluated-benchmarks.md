# IzwaAI Community-Evaluated Evals and Benchmarks

## Purpose

IzwaAI benchmarks whether a system understands African vernacular speech, not
only whether its output resembles a reference sentence. Community evaluation
connects every score to qualified human judgment, source evidence, language
context, and documented uncertainty.

The first benchmark family is **Izwa Community Speech Understanding**. It can
contain poems, songs, speeches, oral histories, sermons, lessons, interviews,
podcasts, debates, stories, jokes, conversations, performances, community
meetings, field recordings, voice notes, and professional explanations.

## Evaluation unit

Every item is derived from a rights-cleared Learned Data Unit and includes:

- an immutable audio excerpt and timestamps;
- language, variety, source type, and source-group identity;
- the task prompt shown to the evaluated system;
- speaker- or community-attested references;
- the dimensions required for that item;
- reviewer judgments, rationales, evidence, and uncertainty; and
- an evaluation-only identifier that does not expose private contributor data.

The benchmark retains the model's response verbatim. Human judgments are
append-only records; corrections create a new benchmark version rather than
silently rewriting an old score.

## Scored dimensions

| Dimension | What the community evaluates |
|---|---|
| Transcription | Whether the words, speakers, boundaries, and relevant delivery are represented correctly |
| Literal meaning | Whether the direct propositional content is preserved |
| Intended meaning | Whether the response captures attested speaker or author intent |
| Cultural context | Whether references and community-scoped knowledge are understood without invented claims |
| Social function | Whether the response understands what the speech is doing: warning, teasing, refusing, honouring, persuading, and so on |
| Performance cues | Whether tone, pause, rhythm, laughter, emphasis, or pronunciation changes the interpretation |
| Uncertainty handling | Whether the system asks, abstains, or presents alternatives when the evidence does not support certainty |

Not every item uses every dimension. The required dimensions must be declared
before a model response is scored.

## Community rubric

Each required dimension uses a five-point anchored rubric:

| Score | Meaning |
|---:|---|
| 0 | Contradicts the evidence, fabricates meaning, or entirely misses the required capability |
| 1 | Recognises a small part but makes a major harmful or meaning-changing error |
| 2 | Partially correct; important meaning or context remains missing |
| 3 | Substantially correct with only a limited omission or imprecision |
| 4 | Fully supported by the available evidence for this task |

`4` means fully supported, not universally true. A system can earn full credit
by preserving two valid readings and their scopes. It should lose credit for
collapsing legitimate ambiguity into a confident single answer.

## Who evaluates

Evaluation is a paid assignment. Reviewer roles include:

- the speaker or source author, where available, for intended meaning;
- a community reviewer for usage and cultural scope;
- a language reviewer for transcript and linguistic interpretation;
- a domain reviewer when specialized subject matter is involved; and
- an adjudicator when reviews conflict in a way that must be resolved.

One person may hold several qualifications, but a release cannot count that
person as several independent reviewers. Reviewer identity is private to the
operations system while qualifications and relevant scope travel with the
evaluation record.

## Release gate

The initial default gate for each item is:

- at least two independent reviewers;
- at least one community reviewer;
- at least one language reviewer;
- a community median of at least 3/4 across required dimensions;
- a judgment and rationale for every required dimension;
- adjudication of conflicting accept/reject judgments;
- complete source rights and review provenance; and
- no source group shared between training and held-out evaluation.

Passing these gates gives an item **100% verification completion**. It does
not overwrite field-level confidence or remove recorded ambiguity.

The benchmark release itself additionally requires:

- every included item to have 100% verification completion;
- explicit rights clearance for every included audio item and derived record;
- contributor and reviewer payments approved for the completed batch;
- frozen evaluation prompts and frozen baseline outputs;
- complete provenance from source audio through every correction and review;
- zero speaker, work, or source-group leakage across dataset splits;
- no unresolved required review or adjudication;
- completed privacy and disclosure-risk review;
- a complete benchmark card covering composition, methods, limitations,
  disagreement, contamination risk, and known coverage gaps; and
- an immutable benchmark version and reproducible evaluation configuration.

Release is all-or-nothing for the declared item set. An item that fails the
gate is removed into the candidate pool or repaired before the release is
versioned; it is never silently counted as complete.

## Benchmark slices

Headline scores must never hide weak communities or source types. Every run
reports the aggregate together with slices for:

- language and language variety;
- broad language phylum, where useful and responsibly assigned;
- country or community scope where contributors permit it;
- source type;
- speech condition and recording quality;
- code-switching pattern;
- meaning phenomenon;
- speaker/source familiarity; and
- reviewer agreement and unresolved rate.

A slice is suppressed when it is too small to protect contributors or support
a meaningful claim.

## Benchmark integrity

Source groups—not individual clips—are assigned to train, development, or
evaluation. All excerpts from the same speech, conversation, work, episode,
speaker series, or closely linked source remain together. Public benchmark
items may expose prompts, but private test audio and community references
remain access-controlled when disclosure would enable memorisation or violate
permissions.

Every leaderboard entry declares model and prompt versions, inference
settings, data access, evaluation date, benchmark version, and whether the
system may have trained on related material. IzwaAI reports contamination
risk instead of treating an unverifiable claim as clean.

## First release: `izwa-community-speech-v0.1`

The first release is a private research benchmark designed to validate the
process before making comparative claims. Its target is:

- 100 rights-cleared audio items;
- four or more source types;
- initial language cohorts within the Nguni family, evaluated separately;
- at least two independent paid reviews per item;
- creator/speaker and source-group isolation;
- frozen baseline model outputs; and
- a benchmark card documenting gaps, disagreement, costs, and limitations.

The release is ready only when all included items pass the release gate. Items
that do not pass remain valuable annotation work but do not enter the scored
benchmark.

## Pursuit sequence

1. Recruit and compensate the initial contributor and reviewer cohorts.
2. Collect rights-cleared audio and contributor corrections.
3. Convert complete Learned Data Units into candidate benchmark items.
4. Freeze item prompts and required dimensions before evaluating models.
5. Capture baseline outputs without showing reviewers model identity.
6. Run independent community and language review.
7. Adjudicate conflicts and publish an internal benchmark card.
8. Improve a system with training data that excludes every evaluation source
   group.
9. Re-run the frozen evaluation and report improvements and regressions by
   slice.
10. Version the benchmark and repeat without silently changing past results.

The implementation contract and scoring primitives live in
`packages/evaluation`. Reproducible model runners and result artifacts belong
in `ml/evaluation`.
