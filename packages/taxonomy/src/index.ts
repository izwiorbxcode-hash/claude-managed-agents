// @izwa/taxonomy — linguistic taxonomy for Southern African languages.
// Level 1-8: family → branch → language → variety → phenomenon → domain → task → unit.
// Canonical source for Nguni / Sotho-Tswana classification used by datasets,
// annotation, evaluation and representation layers.

export type LanguageFamily = "Niger-Congo";
export type BantuBranch = "Nguni" | "Sotho-Tswana" | "Other-Bantu";

export type NguniLanguage = "isiZulu" | "isiXhosa" | "siSwati" | "isiNdebele";
export type SothoTswanaLanguage = "Sesotho" | "Setswana" | "Sepedi";
export type IzwaLanguage = NguniLanguage | SothoTswanaLanguage;

export interface LanguageNode {
  code: string; // e.g. "zu", "xh", "ss", "nr", "st", "tn", "nso"
  name: IzwaLanguage;
  family: LanguageFamily;
  branch: BantuBranch;
}

export const NGUNI_LANGUAGES: LanguageNode[] = [
  { code: "zu", name: "isiZulu", family: "Niger-Congo", branch: "Nguni" },
  { code: "xh", name: "isiXhosa", family: "Niger-Congo", branch: "Nguni" },
  { code: "ss", name: "siSwati", family: "Niger-Congo", branch: "Nguni" },
  { code: "nr", name: "isiNdebele", family: "Niger-Congo", branch: "Nguni" },
];

export const SOTHO_TSWANA_LANGUAGES: LanguageNode[] = [
  { code: "st", name: "Sesotho", family: "Niger-Congo", branch: "Sotho-Tswana" },
  { code: "tn", name: "Setswana", family: "Niger-Congo", branch: "Sotho-Tswana" },
  { code: "nso", name: "Sepedi", family: "Niger-Congo", branch: "Sotho-Tswana" },
];

export const IZWA_LANGUAGES: LanguageNode[] = [...NGUNI_LANGUAGES, ...SOTHO_TSWANA_LANGUAGES];

export type LinguisticPhenomenon =
  | "phonetics"
  | "morphology"
  | "syntax"
  | "semantics"
  | "dialect_variation"
  | "code_switching"
  | "translation"
  | "ner"
  | "sentiment"
  | "intent";

// Every data unit carries machine-readable context (vision doc §23).
export interface TaxonomyContext {
  family: LanguageFamily;
  branch: BantuBranch;
  language: IzwaLanguage;
  variety?: string;
  phenomenon?: LinguisticPhenomenon;
  domain?: string;
  task?: string;
}
