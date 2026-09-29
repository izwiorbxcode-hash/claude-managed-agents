// Idempotent seeding for a fresh refinery: the language data contract, a
// small cohort of native-speaker experts, and the initial dialect anchors
// in the vector space. Without anchors the router would scout an empty
// index on first ingest.

import { IDIOM_CONTEXT_CONTRACT, LANGUAGE_CONTRACT } from "./contracts";
import { CONTEXTUAL_MEANING_CONTRACT, SERVICE_CONVERSATION_CONTRACT, VOCABULARY_DEVELOPMENT_CONTRACT } from "./context-contracts";
import { mockEmbedding } from "./embed";
import { ANCHOR_KIND, upsertAnchors, type AnchorVector } from "./retrieval";
import { saveContract, upsertExpert, type ExpertRow } from "./store";

const ANCHOR_SEEDS: Record<string, string> = {
  zulu: "Sawubona umuntu kukhona nje kodwa ngiyakuthanda",
  swahili: "Hakuna matata rafiki karibu asante sana",
  yoruba: "Báwo ni ọjọ́ yìí mo nílé è",
  hausa: "Ina kwana gida da aiki wani abu",
  igbo: "Nke a bụ maka anya na azu ka oge",
};

export async function seedRefinery(env: Env): Promise<{ contracts: number; experts: number; anchors: string[] }> {
  const contracts = [LANGUAGE_CONTRACT, IDIOM_CONTEXT_CONTRACT, CONTEXTUAL_MEANING_CONTRACT, SERVICE_CONVERSATION_CONTRACT, VOCABULARY_DEVELOPMENT_CONTRACT];
  for (const contract of contracts) await saveContract(env.DB, contract);

  const experts: ExpertRow[] = [
    {
      expertId: "exp_seed_zulu",
      name: "Nomusa Zulu Linguist",
      rolesJson: JSON.stringify(["annotator", "linguist", "reviewer"]),
      languagesJson: JSON.stringify(["zulu", "xhosa"]),
      taskClassesJson: JSON.stringify(["linguist", "phonetics", "semantics"]),
      statsJson: JSON.stringify({ resolved: 0, agreements: 0, avgTurnaroundMs: 0, conflicts: 0 }),
      active: 1,
      createdAtMs: Date.now(),
    },
    {
      expertId: "exp_seed_swahili",
      name: "Amara Swahili Linguist",
      rolesJson: JSON.stringify(["annotator", "linguist"]),
      languagesJson: JSON.stringify(["swahili"]),
      taskClassesJson: JSON.stringify(["linguist", "translation"]),
      statsJson: JSON.stringify({ resolved: 0, agreements: 0, avgTurnaroundMs: 0, conflicts: 0 }),
      active: 1,
      createdAtMs: Date.now(),
    },
    {
      expertId: "exp_seed_yoruba",
      name: "Tunde Yoruba Linguist",
      rolesJson: JSON.stringify(["annotator", "linguist", "reviewer"]),
      languagesJson: JSON.stringify(["yoruba"]),
      taskClassesJson: JSON.stringify(["linguist", "phonetics"]),
      statsJson: JSON.stringify({ resolved: 0, agreements: 0, avgTurnaroundMs: 0, conflicts: 0 }),
      active: 1,
      createdAtMs: Date.now(),
    },
  ];
  for (const e of experts) await upsertExpert(env.DB, e);

  const anchors: AnchorVector[] = Object.entries(ANCHOR_SEEDS).map(([language, text]) => ({
    id: `dialect_anchor_${language}`,
    values: mockEmbedding(text),
    kind: ANCHOR_KIND,
    metadata: { language, label: `${language} cluster`, source: "seed" },
  }));
  await upsertAnchors(env, anchors);

  return { contracts: contracts.length, experts: experts.length, anchors: anchors.map((a) => a.id) };
}
