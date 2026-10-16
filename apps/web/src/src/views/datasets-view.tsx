import { Link } from "react-router-dom";

/**
 * Dataset catalogue.
 *
 * No release is published yet, so this page documents the SHAPE of a release
 * and shows an explicit empty state rather than fabricated dataset rows. When
 * releases exist they will be listed from the catalogue API; the placeholder
 * below is what that list will look like.
 */

const IN_A_RELEASE = [
  "A versioned, immutable snapshot — a buyer pins exactly what they licensed.",
  "Representation lineage per record: machine first pass, human corrections, reviewers.",
  "Verified field-level human approval for the meaning fields the contract requires.",
  "Coverage cells making gaps explicit, so absence is auditable.",
  "Provenance edges linking each record back to its source recording and root.",
  "A licence template with permitted uses, term, and any exclusivity stated separately.",
] as const;

const EDITIONS = [
  {
    body: "Time-aligned transcript with speaker separation.",
    name: "Speech transcription",
  },
  {
    body: "Locating figurative and idiomatic spans with attested readings.",
    name: "Idiom and expression detection",
  },
  {
    body: "Intended meaning, social function, and competing readings.",
    name: "Contextual interpretation",
  },
  {
    body: "Task-oriented dialogue grounded in real public-service exchanges.",
    name: "Service conversation",
  },
  {
    body: "Native-speaker test items and private held-out sets.",
    name: "Evaluation and benchmarking",
  },
] as const;

const PRODUCTS = [
  {
    body: "Documented, permitted, versioned data for training or independent evaluation.",
    name: "Dataset licensing",
  },
  {
    body: "Tested LoRA weights tied to an exact base model, language, task, and evaluation report.",
    name: "Adapter licensing",
  },
  {
    body: "A model improved for an agreed task, with acceptance criteria defined before work begins.",
    name: "Custom adaptation",
  },
  {
    body: "Independent, language-specific capability testing and recurring regression evaluation.",
    name: "Evaluation services",
  },
  {
    body: "A demonstrated capability integrated into customer-controlled infrastructure.",
    name: "Private deployment",
  },
  {
    body: "Managed model access once demand, performance, reliability, and operating cost are proven.",
    name: "Hosted API",
  },
] as const;

export function DatasetsView() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Products</div>
        <h1>Data first. Capabilities proven before they ship.</h1>
        <p>
          Customers will be able to buy different outputs from the same learned-
          data loop. None is presented as live before the required evidence exists.
        </p>
        <div className="hero-proof">
          <span>0 published releases</span>
          <span>Nguni first focus</span>
          <span>Per-task evidence required</span>
        </div>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Commercial outputs</div>
        <h2 className="section-heading">What customers can eventually buy</h2>
        <div className="card-grid">
          {PRODUCTS.map((product) => (
            <article className="info-card" key={product.name}>
              <h3>{product.name}</h3>
              <p>{product.body}</p>
            </article>
          ))}
        </div>
        <p className="fine-print">
          These are proposed offerings, not established demand or guaranteed
          revenue. The first release will demonstrate one complete path from a
          permitted source to an independently measured result.
        </p>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Inside a release</div>
        <h2 className="section-heading">What every release carries</h2>
        <ul className="check-list">
          {IN_A_RELEASE.map((item) => (
            <li key={item}>
              <span aria-hidden="true">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Editions</div>
        <h2 className="section-heading">
          Dataset editions we build toward
        </h2>
        <div className="card-grid">
          {EDITIONS.map((edition) => (
            <article className="info-card" key={edition.name}>
              <h3>{edition.name}</h3>
              <p>{edition.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Catalogue</div>
        <h2 className="section-heading">Current state</h2>
        <div className="empty-state">
          <span aria-hidden="true">◌</span>
          <h3>No releases published</h3>
          <p>
            Datasets appear here only after their required community review
            completes. Nothing is listed ahead of that gate.
          </p>
          <Link className="secondary-button compact" to="/earn">
            How releases are licensed
          </Link>
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>Be the first record</h2>
          <p>The catalogue fills up from contributions, not from a roadmap.</p>
        </div>
        <Link className="primary-button compact" to="/">
          Open the studio
        </Link>
      </section>
    </>
  );
}
