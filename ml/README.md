# Izwa ML — research layer (Python, GPU)

TypeScript control plane lives in `apps/` + `packages/` + `workers/`.
This `ml/` tree is the GPU research side: PyTorch + Hugging Face.

- `datasets/` — dataset build scripts, versioned R2 exports
- `training/` — fine-tuning (LoRA/PEFT), configs
- `evaluation/` — benchmark harnesses, WER/CER, cross-lingual tests
- `embeddings/` — representation experiments (Nguni vector space)
- `notebooks/` — Jupyter exploration
- `research/` — Wits PGDip → MSc experiment logs

Keep ML experimentation out of the TypeScript app architecture.
