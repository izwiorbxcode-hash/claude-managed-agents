import { Link } from "react-router-dom";

/**
 * How contributors are paid.
 *
 * This page deliberately states MECHANICS and not AMOUNTS. The revenue model
 * in docs/mission-commerce.md is explicitly "planned revenue models and target
 * segments, not claims of secured customers, revenue, or traction", and
 * docs/vision.md warns that pricing and willingness to pay "remain hypotheses
 * until paid pilots". Publishing per-sale figures on this page before they are
 * real would contradict those documents. Amounts get added here once an actual
 * rate card exists.
 */

const STAGES = [
  {
    body: "Upload a recording you have the right to share, correct the machine transcript, and add the meaning, context, and uncertainty that only a speaker or fluent community member can supply.",
    title: "You contribute",
  },
  {
    body: "A qualified speaker, fluent reviewer, or adjudicator verifies the record. Disagreement is preserved rather than flattened — conflicts escalate to adjudication instead of being silently resolved.",
    title: "Community review",
  },
  {
    body: "Your base pay covers the work of listening and checking, even when the draft is already correct. Difficult assignments should carry an appropriate base rate.",
    title: "Review effort is paid",
  },
  {
    body: "Approved ordinary, meaning-changing, and critical or specialist corrections can earn published bonus points. One error event receives only its highest applicable category.",
    title: "Useful corrections earn more",
  },
  {
    body: "A human checks material bonus claims against the source. The decision, rubric version, and correction link to one immutable payment-ledger entry, with an appeal route.",
    title: "Bonuses are verified and traceable",
  },
] as const;

const MODELS = [
  {
    body: "Agreed before acceptance and based on expected time, audio quality, overlap, and task complexity. Correct confirmation is still work.",
    title: "Base task pay",
  },
  {
    body: "A published pilot schedule can distinguish ordinary, meaning-changing, and critical or specialist corrections after human approval.",
    title: "Correction bonus",
  },
  {
    body: "A separately verified recurring error pattern that improves guidelines or many records may earn a fixed discovery reward.",
    title: "Discovery reward",
  },
] as const;

const GUARANTEES = [
  {
    body: "Every record keeps its representation lineage: the machine's first attempt, each human correction, and who reviewed it. That lineage is part of the release, not discarded.",
    title: "Provenance is visible",
  },
  {
    body: "Payment for performed work is separate from licensing or revenue sharing. Selling a dataset does not transfer the rights in the language itself.",
    title: "Payment is not the same as a licence",
  },
  {
    body: "Where fluent speakers differ, the dataset shows the disagreement and the review path that resolved — or did not resolve — it. A confident single answer is not the goal.",
    title: "Disagreement stays on the record",
  },
] as const;

export function EarnView() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Contributor compensation</div>
        <h1>Pay for the work. Reward the value of the correction.</h1>
        <p>
          Izwa’s proposed model combines fair base task pay with human-approved
          bonuses for verified, important corrections. No one should need to
          manufacture edits to make careful review worthwhile.
        </p>
        <div className="hero-proof">
          <span>Base pay</span>
          <span>Correction bonus</span>
          <span>Discovery reward</span>
        </div>
      </section>

      <section className="prose-section">
        <div className="section-kicker">How a contribution becomes payment</div>
        <h2 className="section-heading">Five stages, no shortcuts</h2>
        <ol className="stage-list">
          {STAGES.map((stage, index) => (
            <li key={stage.title}>
              <span className="stage-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Payment formula</div>
        <h2 className="section-heading">
          Three parts, published before work begins
        </h2>
        <div className="card-grid">
          {MODELS.map((model) => (
            <article className="info-card" key={model.title}>
              <h3>{model.title}</h3>
              <p>{model.body}</p>
            </article>
          ))}
        </div>
        <p className="fine-print">
          Pilot point weights and actual rand values still need validation. Izwa
          will publish them with the task rules before asking contributors to
          accept paid work.
        </p>
      </section>

      <section className="prose-section">
        <div className="section-kicker">What is protected</div>
        <h2 className="section-heading">Three commitments</h2>
        <div className="card-grid">
          {GUARANTEES.map((item) => (
            <article className="info-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>Start with one reviewed task</h2>
          <p>
            The pilot will test whether the rubric is fair, understandable, and
            consistent before it is used at scale.
          </p>
        </div>
        <Link className="primary-button compact" to="/">
          Open the studio
        </Link>
      </section>
    </>
  );
}
