// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: a four-stage
// wizard guarded by `stage === "..."`. Splitting the panels into components
// would mean threading a dozen pieces of stage state through props and would
// break up the wizard's left-to-right reading order.
// biome-ignore-all lint/performance/noJsxPropsBind: this view is a single
// multi-stage form whose handlers close over stage-local state. Wrapping ~18
// inline handlers in useCallback would add dep arrays without changing render
// behaviour, and every dep list would have to track the stage machine. The
// handlers are not passed to memoized children, so the identity churn this
// rule guards against never reaches a component that would care.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AnnotationDraft,
  type HealthResponse,
  richAudioApi,
  type UploadResult,
} from "../api";

type Stage = "source" | "transcript" | "meaning" | "submitted";

const SOURCE_TYPES = [
  "Conversation or voice note",
  "Poem or song",
  "Speech or sermon",
  "Story or oral history",
  "Interview or podcast",
  "Lesson or professional explanation",
] as const;

const EMPTY_DRAFT: AnnotationDraft = {
  alternativeReadings: "",
  context: "",
  culturalMeaning: "",
  intendedMeaning: "",
  literalMeaning: "",
  socialFunction: "",
  uncertainty: "",
};

const stageNumber = (stage: Stage): number =>
  ({ meaning: 3, source: 1, submitted: 4, transcript: 2 })[stage];

// Step state is mutually exclusive, so pick the class with early returns rather
// than a nested ternary.
function stepClass(current: boolean, complete: boolean): string {
  if (current) {
    return "current";
  }
  return complete ? "complete" : "";
}

function engineLabel(
  health: HealthResponse | null,
  healthError: boolean
): string {
  if (health) {
    return "Engine connected";
  }
  return healthError ? "Engine unavailable" : "Connecting";
}

export function StudioPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [stage, setStage] = useState<Stage>("source");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("");
  const [sourceType, setSourceType] = useState<string>(SOURCE_TYPES[0]);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [machineTranscript, setMachineTranscript] = useState("");
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<AnnotationDraft>(EMPTY_DRAFT);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    richAudioApi
      .health()
      .then((response) => {
        setHealth(response);
        setHealthError(false);
      })
      .catch(() => setHealthError(true));
  }, []);

  const transcriptChanged =
    machineTranscript.trim() !== transcript.trim() &&
    transcript.trim().length > 0;
  const progress = `${stageNumber(stage) * 25}%`;
  const fileSize = useMemo(() => {
    if (!file) {
      return null;
    }
    return `${(file.size / 1_048_576).toFixed(1)} MB`;
  }, [file]);

  const selectFile = useCallback((selected: File | null) => {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.type.startsWith("audio/")) {
      setError("Choose an audio file so IzwaAI can listen and transcribe it.");
      return;
    }
    setFile(selected);
  }, []);

  const uploadAndTranscribe = async () => {
    if (!(file && language.trim() && rightsConfirmed)) {
      setError(
        "Add the language, choose audio, and confirm your rights first."
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = await richAudioApi.upload(file, {
        language: language.trim(),
        sourceType,
      });
      setUpload(uploaded);
      const result = await richAudioApi.transcribe(uploaded.assetId);
      setMachineTranscript(result.transcript);
      setTranscript(result.transcript);
      setStage("transcript");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The audio could not be processed."
      );
    } finally {
      setBusy(false);
    }
  };

  const saveTranscript = async () => {
    if (!(upload && transcript.trim())) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await richAudioApi.correctTranscript(upload.assetId, transcript.trim());
      setStage("meaning");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The correction could not be saved."
      );
    } finally {
      setBusy(false);
    }
  };

  const submitMeaning = async () => {
    if (!(upload && draft.intendedMeaning.trim() && draft.context.trim())) {
      setError(
        "Tell us what the speech means and the context in which it was said."
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await richAudioApi.createMeaningTask({
        assetId: upload.assetId,
        draft,
        transcript,
      });
      setTaskId(result.taskId);
      setStage("submitted");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The meaning record could not be submitted."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={`service-status ${healthError ? "offline" : ""}`}>
        <span aria-hidden="true" className="status-dot" />
        {engineLabel(health, healthError)}
      </div>

      <section className="hero">
        <div className="eyebrow">Learned data → specialised capability</div>
        <h1>Raw observations become deployable intelligence.</h1>
        <p>
          Izwa is a learned-data infrastructure and applied AI company. We turn
          permitted source material into verified datasets, specialised models,
          and measurable capabilities—beginning with Nguni languages.
        </p>
        <ol aria-label="How izwa works" className="hero-proof">
          <li>siSwati</li>
          <li>isiZulu</li>
          <li>isiXhosa</li>
          <li>isiNdebele</li>
        </ol>
      </section>

      <section className="prose-section">
        <div className="section-kicker">What Izwa does</div>
        <h2 className="section-heading">
          One evidence loop. Several products.
        </h2>
        <div className="card-grid">
          <article className="info-card">
            <h3>Build trusted data</h3>
            <p>
              Collect with permission, preserve the source, add human
              correction and context, and release a documented dataset version.
            </p>
          </article>
          <article className="info-card">
            <h3>Train defined capabilities</h3>
            <p>
              Adapt a named base model for a named language and task. A broad
              “Nguni model” is not a product claim.
            </p>
          </article>
          <article className="info-card">
            <h3>Measure what changed</h3>
            <p>
              Compare against the unchanged baseline on independent data, find
              the weaknesses, and use them to improve the next collection.
            </p>
          </article>
        </div>
        <p className="fine-print">
          This is the operating direction. Dataset licences, adapters, custom
          adaptation, private deployments, and hosted APIs become products only
          after Izwa demonstrates the relevant capability.
        </p>
      </section>

      <section aria-labelledby="workspace-title" className="workspace">
        <div className="workspace-head">
          <div>
            <span className="section-kicker">Contribution studio</span>
            <h2 id="workspace-title">Turn one recording into learned data</h2>
          </div>
          <span className="privacy-note">Private until reviewed</span>
        </div>

        <ol aria-label="Contribution progress" className="steps">
          {["Audio", "Transcript", "Meaning", "Review"].map((label, index) => {
            const number = index + 1;
            const current = number === stageNumber(stage);
            const complete = number < stageNumber(stage);
            return (
              <li className={stepClass(current, complete)} key={label}>
                <span>{complete ? "✓" : String(number)}</span>
                {label}
              </li>
            );
          })}
        </ol>
        <div className="progress-track">
          <span style={{ width: progress }} />
        </div>

        {stage === "source" ? (
          <div className="panel-grid">
            <div className="form-panel">
              <label className="field">
                <span>Language or variety</span>
                <input
                  autoComplete="off"
                  onChange={(event) => setLanguage(event.target.value)}
                  placeholder="e.g. siSwati, Wolof, Amharic, isiZulu"
                  value={language}
                />
                <small>Use the name your community uses.</small>
              </label>
              <label className="field">
                <span>What kind of audio is this?</span>
                <select
                  onChange={(event) => setSourceType(event.target.value)}
                  value={sourceType}
                >
                  {SOURCE_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className={`drop-zone ${file ? "has-file" : ""}`}>
                <input
                  accept="audio/*"
                  onChange={(event) =>
                    selectFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
                <span aria-hidden="true" className="upload-icon">
                  ↥
                </span>
                <strong>
                  {file ? file.name : "Choose an audio recording"}
                </strong>
                <small>
                  {file
                    ? `${file.type || "audio"} · ${fileSize}`
                    : "MP3, WAV, M4A, OGG or WebM"}
                </small>
              </label>
              <label className="consent-row">
                <input
                  checked={rightsConfirmed}
                  onChange={(event) => setRightsConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I have permission to contribute this audio for transcription
                  and review.
                </span>
              </label>
              <button
                className="primary-button"
                disabled={busy}
                onClick={uploadAndTranscribe}
                type="button"
              >
                {busy
                  ? "Listening and transcribing…"
                  : "Upload and let IzwaAI listen"}
              </button>
            </div>
            <aside className="context-panel">
              <span className="context-number">01</span>
              <h3>Start with a defined purpose.</h3>
              <p>
                The task determines which voices to collect, what reviewers
                annotate, and what a useful result must prove.
              </p>
              <p>
                The machine starts the work. Knowledgeable people remain the
                authority on what was said and what it means.
              </p>
            </aside>
          </div>
        ) : null}

        {stage === "transcript" ? (
          <div className="form-panel wide-panel">
            <div className="result-meta">
              <span>Machine transcript</span>
              <span>
                {transcriptChanged
                  ? "Human correction detected"
                  : "Review every word"}
              </span>
            </div>
            <label className="field">
              <span>Correct what IzwaAI heard</span>
              <textarea
                className="transcript-area"
                onChange={(event) => setTranscript(event.target.value)}
                value={transcript}
              />
              <small>
                Mistakes are useful. Your edits teach us where the speech model
                failed.
              </small>
            </label>
            <div className="actions">
              <button
                className="secondary-button"
                onClick={() => setStage("source")}
                type="button"
              >
                Back
              </button>
              <button
                className="primary-button compact"
                disabled={busy || !transcript.trim()}
                onClick={saveTranscript}
                type="button"
              >
                {busy ? "Saving correction…" : "Transcript is correct"}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "meaning" ? (
          <div className="form-panel wide-panel">
            <div className="meaning-intro">
              <span className="context-number">03</span>
              <div>
                <h3>Now teach the meaning behind the words.</h3>
                <p>
                  Answer naturally. Different readings and uncertainty are
                  valuable.
                </p>
              </div>
            </div>
            <div className="field-grid">
              <MeaningField
                label="What was happening?"
                onChange={(context) =>
                  setDraft((current) => ({ ...current, context }))
                }
                placeholder="The setting, people, moment, or conversation…"
                required
                value={draft.context}
              />
              <MeaningField
                label="What does it actually mean?"
                onChange={(intendedMeaning) =>
                  setDraft((current) => ({ ...current, intendedMeaning }))
                }
                placeholder="The intended message—not only the literal words…"
                required
                value={draft.intendedMeaning}
              />
              <MeaningField
                label="Literal meaning"
                onChange={(literalMeaning) =>
                  setDraft((current) => ({ ...current, literalMeaning }))
                }
                placeholder="What do the words say directly?"
                value={draft.literalMeaning}
              />
              <MeaningField
                label="Cultural knowledge"
                onChange={(culturalMeaning) =>
                  setDraft((current) => ({ ...current, culturalMeaning }))
                }
                placeholder="References, customs, history, metaphor, or shared knowledge…"
                value={draft.culturalMeaning}
              />
              <MeaningField
                label="Social function"
                onChange={(socialFunction) =>
                  setDraft((current) => ({ ...current, socialFunction }))
                }
                placeholder="Warning, praise, refusal, humour, respect, persuasion…"
                value={draft.socialFunction}
              />
              <MeaningField
                label="Other readings or uncertainty"
                onChange={(uncertainty) =>
                  setDraft((current) => ({ ...current, uncertainty }))
                }
                placeholder="What else could it mean? What needs more context?"
                value={draft.alternativeReadings || draft.uncertainty}
              />
            </div>
            <div className="actions">
              <button
                className="secondary-button"
                onClick={() => setStage("transcript")}
                type="button"
              >
                Back
              </button>
              <button
                className="primary-button compact"
                disabled={busy}
                onClick={submitMeaning}
                type="button"
              >
                {busy ? "Creating learned data…" : "Send for community review"}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "submitted" ? (
          <div className="success-panel">
            <span aria-hidden="true" className="success-mark">
              ✓
            </span>
            <span className="section-kicker">Contribution received</span>
            <h2>Your explanation is now part of the learning process.</h2>
            <p>
              A qualified language and community reviewer must verify it before
              it can enter a released dataset or benchmark.
            </p>
            <code>{taskId}</code>
            <button
              className="primary-button compact"
              onClick={() => {
                setStage("source");
                setFile(null);
                setUpload(null);
                setMachineTranscript("");
                setTranscript("");
                setDraft(EMPTY_DRAFT);
                setTaskId(null);
                setRightsConfirmed(false);
              }}
              type="button"
            >
              Contribute another recording
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="error-message" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="principles">
        <div>
          <span>01</span>
          <h3>The machine may be wrong.</h3>
          <p>We preserve its first attempt and every human correction.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Your context is expertise.</h3>
          <p>
            Culture, intention, tone, and uncertainty become first-class data.
          </p>
        </div>
        <div>
          <span>03</span>
          <h3>Evidence creates the claim.</h3>
          <p>
            No record enters a release before its required human checks are
            complete.
          </p>
        </div>
      </section>
    </>
  );
}

function MeaningField({
  label,
  onChange,
  placeholder,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? <b>Required</b> : null}
      </span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
