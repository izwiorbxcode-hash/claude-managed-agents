# Izwa ML — evaluation

This directory owns reproducible model-facing runners and artifacts for the
[IzwaAI community-evaluated benchmark programme](../../docs/community-evaluated-benchmarks.md).

The TypeScript contracts and release-gate scoring live in
`packages/evaluation`. Model adapters in this directory must preserve raw
responses, model and prompt versions, inference settings, benchmark version,
and run timestamps. They must not contain community reference answers in the
model prompt or mix a held-out source group into training data.

The first planned release is `izwa-community-speech-v0.1`: a private process-
validation benchmark with 100 rights-cleared audio items and paid independent
community review.
