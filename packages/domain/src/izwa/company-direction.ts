export const IZWA_COMPANY_DIRECTION = {
  category: "learned-data infrastructure and applied AI",
  focus: {
    languageFamily: "Nguni",
    languages: ["ss", "zu", "xh", "nr"],
    vertical: "African languages",
  },
  positioning:
    "Izwa turns raw observations into verified datasets, specialised models, and deployable intelligence.",
  proofStandard:
    "Capabilities are claimed only after language-specific, task-specific independent evaluation.",
  version: "2026-10-12",
} as const;

export const IZWA_OPERATING_STAGES = [
  "collect_and_preserve",
  "validate_and_route",
  "draft_transcripts_and_labels",
  "human_review_and_adjudication",
  "versioned_dataset_release",
  "train_or_adapt",
  "independent_evaluation",
  "release_or_deploy",
  "feed_failures_back",
] as const;

export type OfferingMaturity = "foundation" | "proposed";

export interface IzwaOffering {
  id: string;
  maturity: OfferingMaturity;
  outcome: string;
}

export const IZWA_OFFERINGS: readonly IzwaOffering[] = [
  {
    id: "dataset_licensing",
    maturity: "foundation",
    outcome: "A documented, permitted, versioned dataset release.",
  },
  {
    id: "evaluation_services",
    maturity: "foundation",
    outcome: "Language- and task-specific capability assessment.",
  },
  {
    id: "adapter_licensing",
    maturity: "proposed",
    outcome:
      "Tested adapter weights tied to an exact base model, dataset, task, and evaluation.",
  },
  {
    id: "custom_adaptation",
    maturity: "proposed",
    outcome: "A model improved against agreed acceptance criteria.",
  },
  {
    id: "private_deployment",
    maturity: "proposed",
    outcome: "A demonstrated capability in customer-controlled infrastructure.",
  },
  {
    id: "hosted_api",
    maturity: "proposed",
    outcome: "Managed access to a demonstrated model capability.",
  },
] as const;
