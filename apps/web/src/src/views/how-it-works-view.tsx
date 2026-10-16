import { Link } from "react-router-dom";

const PIPELINE = [
  {
    body: "Every project starts with a language, task, target population, permitted use, and success measure. Collection without a purpose does not create a product.",
    step: "01",
    title: "Define and collect",
  },
  {
    body: "Preserve the original source, provenance, permissions, and context. Ordinary code validates files and rights before model-assisted work begins.",
    step: "02",
    title: "Validate and preserve",
  },
  {
    body: "Models may propose transcripts, translations, labels, and routing decisions. These drafts remain visible as proposals, not presumed truth.",
    step: "03",
    title: "Create a machine draft",
  },
  {
    body: "Annotators correct the draft and add context. Reviewers check the evidence; adjudicators resolve difficult cases or preserve legitimate disagreement.",
    step: "04",
    title: "Verify with people",
  },
  {
    body: "Accepted Learned Data Units become documented, versioned datasets with coverage, limitations, checksums, and permitted uses.",
    step: "05",
    title: "Release the dataset",
  },
  {
    body: "Izwa trains or adapts a specified base model for a specified language and task, while keeping every input and configuration reproducible.",
    step: "06",
    title: "Adapt a model",
  },
  {
    body: "The adapted system is compared with the unchanged baseline on independent, protected data. Results are reported by language, task, and relevant slice.",
    step: "07",
    title: "Evaluate independently",
  },
  {
    body: "Model failures become new collection and review priorities. Demonstrated capabilities can then ship as adapters, private deployments, or services.",
    step: "08",
    title: "Deploy and learn again",
  },
] as const;

const GUARANTEES = [
  {
    body: "We preserve its first attempt and every human correction, so a buyer can see how much human work a record actually needed.",
    title: "The machine may be wrong",
  },
  {
    body: "Culture, intention, tone, and uncertainty become first-class data rather than footnotes.",
    title: "Your context is expertise",
  },
  {
    body: "No record enters a release before its required community checks are complete.",
    title: "Review creates trust",
  },
] as const;

export function HowItWorksView() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">How it works</div>
        <h1>From raw observation to measured capability.</h1>
        <p>
          Izwa connects two improvement cycles: people make data more useful,
          then model behaviour shows which data should improve next.
        </p>
        <div className="hero-proof">
          <span>Collect</span>
          <span>Verify</span>
          <span>Adapt</span>
          <span>Evaluate</span>
        </div>
      </section>

      <section className="prose-section">
        <div className="section-kicker">The pipeline</div>
        <h2 className="section-heading">Stage by stage</h2>
        <ol className="stage-list">
          {PIPELINE.map((item) => (
            <li key={item.step}>
              <span className="stage-number">{item.step}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Principles</div>
        <h2 className="section-heading">Three rules we do not bend</h2>
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
          <h2>Walk the pipeline yourself</h2>
          <p>One recording takes you through all five stages.</p>
        </div>
        <Link className="primary-button compact" to="/">
          Open the studio
        </Link>
      </section>
    </>
  );
}
