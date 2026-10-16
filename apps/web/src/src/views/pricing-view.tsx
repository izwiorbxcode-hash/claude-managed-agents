import { Link } from "react-router-dom";

/**
 * Pricing.
 *
 * Like /earn, this page describes the SHAPE of the commercial model and
 * explicitly marks what is not yet decided. No amounts are invented: the
 * commercial models in docs/mission-commerce.md are plans, and docs/vision.md
 * records that customer demand, willingness to pay, and pricing "remain
 * hypotheses until paid pilots".
 */

const NOT_YET = [
  "Per-release licence fees, because no rate card has been agreed with buyers.",
  "Adapter licence fees, because no adapter has yet passed an independent product evaluation.",
  "Custom adaptation and private deployment fees, because the delivery scope determines the cost.",
  "Hosted API pricing, because no production API capability has yet been demonstrated.",
] as const;

const INCLUDED = [
  {
    body: "Representation lineage travels with the data: the machine's first pass, each human correction, and the reviewer who verified it.",
    title: "Provenance on every record",
  },
  {
    body: "Where fluent speakers differ, the release shows the disagreement and how it was resolved — or that it remains open.",
    title: "Visible disagreement",
  },
  {
    body: "Each release is immutable and versioned, with its own coverage, licence, and permitted uses, so a buyer can pin exactly what they licensed.",
    title: "Versioned releases",
  },
  {
    body: "Coverage cells make gaps explicit, so a buyer can tell what a release does not contain instead of discovering it after purchase.",
    title: "Coverage you can audit",
  },
] as const;

const OFFERS = [
  {
    body: "A permitted, documented dataset version for an explicitly contracted use.",
    title: "Dataset licence",
  },
  {
    body: "Tested adapter weights with the exact base model, task, evaluation, and deployment notes.",
    title: "Adapter licence",
  },
  {
    body: "A scoped model improvement project with measurable acceptance criteria.",
    title: "Custom adaptation",
  },
  {
    body: "Independent capability evaluation or a private deployment in customer-controlled infrastructure.",
    title: "Evaluation or deployment",
  },
] as const;

export function PricingView() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Commercial direction</div>
        <h1>Buy a defined outcome, not a broad AI promise.</h1>
        <p>
          Izwa is building several routes from learned data to customer value.
          Prices follow demonstrated scope, acceptance criteria, and measured
          delivery cost—not invented launch figures.
        </p>
        <div className="hero-proof">
          <span>No invented figures</span>
          <span>No fake discounts</span>
          <span>No "contact sales" as a substitute for a price</span>
        </div>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Proposed offers</div>
        <h2 className="section-heading">Commercial paths we are building</h2>
        <div className="card-grid">
          {OFFERS.map((offer) => (
            <article className="info-card" key={offer.title}>
              <h3>{offer.title}</h3>
              <p>{offer.body}</p>
            </article>
          ))}
        </div>
        <p className="fine-print">
          “Reduce correction effort for siSwati transcripts” can be tested.
          “African-language intelligence” cannot serve as an acceptance criterion.
        </p>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Not yet decided</div>
        <h2 className="section-heading">What we are not quoting</h2>
        <ul className="check-list pending-list">
          {NOT_YET.map((item) => (
            <li key={item}>
              <span aria-hidden="true">○</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="fine-print">
          Until a rate card exists, any licence, project, API, or contributor
          figure circulating about Izwa is not ours.
        </p>
      </section>

      <section className="prose-section">
        <div className="section-kicker">What a licence includes</div>
        <h2 className="section-heading">Settled regardless of price</h2>
        <div className="card-grid">
          {INCLUDED.map((item) => (
            <article className="info-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="prose-section">
        <div className="section-kicker">Entitlements</div>
        <h2 className="section-heading">
          Access follows a verified payment event
        </h2>
        <div className="prose-block">
          <p>
            An entitlement is the delivery gate. It identifies the organisation,
            the accepted commercial contract, the resource, the permission, the
            term, and the status. Download permission and usage rights are
            related but not identical — legal rights such as training,
            redistribution, derivative models, and exclusivity live in the
            versioned commercial contract.
          </p>
          <p>
            A verified provider payment event is deduplicated and recorded
            before fulfilment activates the contract and entitlement. A browser
            "payment successful" page can never grant access on its own.
          </p>
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>Two ways in</h2>
          <p>
            Contribute recordings now, or read the API reference to see how
            deliveries and entitlements are modelled.
          </p>
        </div>
        <div className="cta-actions">
          <Link className="primary-button compact" to="/">
            Open the studio
          </Link>
          <a className="secondary-button compact" href="/redoc.html">
            API reference
          </a>
        </div>
      </section>
    </>
  );
}
