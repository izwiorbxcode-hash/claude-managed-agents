// biome-ignore-all lint/style/useFilenamingConvention: matches the existing view component convention.
import { Button } from "@cloudflare/kumo/components/button";
import { Translate } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { type IdiomReviewItem, idiomApi } from "../api";
import { PageHeader } from "../components/PageHeader";

const REQUIRED_FIELDS = [
  "expression_span",
  "context",
  "meaning_in_source_language",
  "speaker_intent",
  "usage_conditions",
  "translations",
];

interface Draft {
  alternativeReadings: string;
  badTranslation: string;
  context: string;
  endMs: string;
  expression: string;
  failureExplanation: string;
  intent: string;
  intentBasis: "speaker_attested" | "inferred" | "unknown";
  literalMeaning: string;
  register: string;
  socialFunction: string;
  sourceMeaning: string;
  startMs: string;
  targetLanguage: string;
  transcript: string;
  translation: string;
  usageConditions: string;
}

const emptyDraft: Draft = {
  alternativeReadings: "",
  badTranslation: "",
  context: "",
  endMs: "0",
  expression: "",
  failureExplanation: "",
  intent: "",
  intentBasis: "unknown",
  literalMeaning: "",
  register: "neutral",
  socialFunction: "",
  sourceMeaning: "",
  startMs: "0",
  targetLanguage: "English",
  transcript: "",
  translation: "",
  usageConditions: "",
};

function draftFrom(item: IdiomReviewItem): Draft {
  return {
    ...emptyDraft,
    context: item.seed?.context ?? "",
    endMs: String(item.seed?.expression_span?.end_ms ?? 0),
    expression: item.seed?.expression_span?.text ?? "",
    startMs: String(item.seed?.expression_span?.start_ms ?? 0),
    transcript: item.seed?.transcript ?? item.transcript,
  };
}

export function IdiomReviewView() {
  const [reviewerToken, setReviewerToken] = useState(
    () => sessionStorage.getItem("izwa-reviewer-token") ?? ""
  );
  const [role, setRole] = useState<
    "speaker" | "fluent_reviewer" | "adjudicator"
  >("speaker");
  const [verdict, setVerdict] = useState<
    "verified" | "rejected" | "alternative" | "insufficient_context"
  >("verified");
  const [items, setItems] = useState<IdiomReviewItem[]>([]);
  const [selected, setSelected] = useState<IdiomReviewItem | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!reviewerToken.trim()) {
      return;
    }
    sessionStorage.setItem("izwa-reviewer-token", reviewerToken.trim());
    setBusy(true);
    try {
      const response = await idiomApi.queue(reviewerToken.trim());
      setItems(response.items);
      const first = response.items[0] ?? null;
      setSelected(first);
      if (first) {
        setDraft(draftFrom(first));
      }
      setMessage(
        response.items.length ? "" : "No open reviews for this reviewer."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load review queue"
      );
    } finally {
      setBusy(false);
    }
  }, [reviewerToken]);

  useEffect(() => {
    if (reviewerToken) {
      load().catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load review queue");
      });
    }
  }, [load, reviewerToken]);

  const update = (field: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    if (!(selected && reviewerToken.trim())) {
      return;
    }
    setBusy(true);
    try {
      const payload = {
        alternative_readings: draft.alternativeReadings
          ? [
              {
                reading: draft.alternativeReadings,
                supporting_context: draft.context,
              },
            ]
          : [],
        context: draft.context,
        expression_span: {
          end_ms: Number(draft.endMs),
          start_ms: Number(draft.startMs),
          text: draft.expression,
        },
        literal_meaning: draft.literalMeaning,
        meaning_in_source_language: draft.sourceMeaning,
        social_function: draft.socialFunction
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        source_asset_id: selected.assetId,
        source_group_id: selected.sourceGroupId,
        speaker_intent: { basis: draft.intentBasis, value: draft.intent },
        transcript: draft.transcript,
        translations: [
          {
            register: draft.register,
            targetLanguage: draft.targetLanguage,
            text: draft.translation,
          },
        ],
        usage_conditions: draft.usageConditions,
        ...(draft.badTranslation
          ? {
              failure_explanation: draft.failureExplanation,
              known_bad_translation: {
                provenance: "observed",
                text: draft.badTranslation,
              },
            }
          : {}),
      };
      const result = await idiomApi.submit(reviewerToken.trim(), selected.taskId, {
        basis: role === "speaker" ? "speaker_attested" : "reviewer_attested",
        evidenceIds: [selected.assetId],
        payload,
        reviewerRole: role,
        verdict,
        verifiedFields: REQUIRED_FIELDS,
      });
      setMessage(
        result.recordId
          ? `Approved record ${result.recordId}`
          : `Saved. Still needs: ${(result.missing ?? []).join(", ")}`
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to submit review"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        description="Listen in context, interpret before seeing machine suggestions, and verify meaning field by field."
        icon={Translate}
        title="Idiom review"
      />
      <section className="idiom-review-toolbar">
        <label>
          Reviewer token
          <input
            autoComplete="off"
            onChange={(event) => setReviewerToken(event.target.value)}
            placeholder="Signed review credential"
            type="password"
            value={reviewerToken}
          />
        </label>
        <label>
          Role
          <select
            onChange={(event) => setRole(event.target.value as typeof role)}
            value={role}
          >
            <option value="speaker">Speaker</option>
            <option value="fluent_reviewer">Fluent reviewer</option>
            <option value="adjudicator">Adjudicator</option>
          </select>
        </label>
        <label>
          Verdict
          <select
            onChange={(event) =>
              setVerdict(event.target.value as typeof verdict)
            }
            value={verdict}
          >
            <option value="verified">Verified</option>
            <option value="alternative">Valid regional alternative</option>
            <option value="insufficient_context">Insufficient context</option>
            <option value="rejected">Reject interpretation</option>
          </select>
        </label>
        <Button
          disabled={busy || !reviewerToken.trim()}
          onClick={() => {
            load().catch((error: unknown) => {
              setMessage(error instanceof Error ? error.message : "Unable to load review queue");
            });
          }}
        >
          Load queue
        </Button>
      </section>
      {message ? (
        <p className="idiom-review-message" role="status">
          {message}
        </p>
      ) : null}
      <div className="idiom-review-layout">
        <aside aria-label="Review queue" className="idiom-review-queue">
          {items.map((item) => (
            <button
              className={selected?.taskId === item.taskId ? "active" : ""}
              key={item.taskId}
              onClick={() => {
                setSelected(item);
                setDraft(draftFrom(item));
              }}
              type="button"
            >
              <strong>
                {item.seed?.expression_span?.text || "Unmarked expression"}
              </strong>
              <span>{item.phase.replaceAll("_", " ")}</span>
            </button>
          ))}
        </aside>
        {selected ? (
          <section className="idiom-review-form">
            <audio
              controls
              preload="metadata"
              src={`/api/izwa/media/${encodeURIComponent(selected.assetId)}/content`}
            >
              <track
                default
                kind="captions"
                src={`/api/izwa/media/${encodeURIComponent(selected.assetId)}/captions`}
                srcLang="und"
              />
            </audio>
            <p className="blind-review-note">
              {selected.blind
                ? "Blind first pass: machine suggestions stay hidden until you submit your own interpretation."
                : "Your first interpretation is recorded; machine evidence may now be revealed."}
            </p>
            <div className="idiom-form-grid">
              <Field
                label="Expression"
                onChange={(v) => update("expression", v)}
                value={draft.expression}
              />
              <Field
                label="Start (ms)"
                onChange={(v) => update("startMs", v)}
                type="number"
                value={draft.startMs}
              />
              <Field
                label="End (ms)"
                onChange={(v) => update("endMs", v)}
                type="number"
                value={draft.endMs}
              />
              <TextArea
                label="Corrected transcript"
                onChange={(v) => update("transcript", v)}
                value={draft.transcript}
                wide
              />
              <TextArea
                label="Context and situation"
                onChange={(v) => update("context", v)}
                value={draft.context}
                wide
              />
              <TextArea
                label="Literal meaning"
                onChange={(v) => update("literalMeaning", v)}
                value={draft.literalMeaning}
              />
              <TextArea
                label="Meaning in source language"
                onChange={(v) => update("sourceMeaning", v)}
                value={draft.sourceMeaning}
              />
              <TextArea
                label="Speaker intent"
                onChange={(v) => update("intent", v)}
                value={draft.intent}
              />
              <label>
                Intent basis
                <select
                  onChange={(e) => update("intentBasis", e.target.value)}
                  value={draft.intentBasis}
                >
                  <option value="speaker_attested">Speaker attested</option>
                  <option value="inferred">Inferred</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <Field
                label="Social functions (comma separated)"
                onChange={(v) => update("socialFunction", v)}
                value={draft.socialFunction}
              />
              <TextArea
                label="Usage conditions"
                onChange={(v) => update("usageConditions", v)}
                value={draft.usageConditions}
              />
              <TextArea
                label="Alternative or regional reading"
                onChange={(v) => update("alternativeReadings", v)}
                value={draft.alternativeReadings}
              />
              <Field
                label="Target language"
                onChange={(v) => update("targetLanguage", v)}
                value={draft.targetLanguage}
              />
              <TextArea
                label="Acceptable translation"
                onChange={(v) => update("translation", v)}
                value={draft.translation}
              />
              <Field
                label="Register"
                onChange={(v) => update("register", v)}
                value={draft.register}
              />
              <TextArea
                label="Known bad translation (optional)"
                onChange={(v) => update("badTranslation", v)}
                value={draft.badTranslation}
              />
              <TextArea
                label="What the bad translation loses"
                onChange={(v) => update("failureExplanation", v)}
                value={draft.failureExplanation}
              />
            </div>
            <Button
              disabled={busy}
              onClick={() => {
                submit().catch((error: unknown) => {
                  setMessage(error instanceof Error ? error.message : "Unable to submit review");
                });
              }}
            >
              Submit field-level review
            </Button>
          </section>
        ) : null}
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "wide" : ""}>
      {label}
      <textarea
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        value={value}
      />
    </label>
  );
}
