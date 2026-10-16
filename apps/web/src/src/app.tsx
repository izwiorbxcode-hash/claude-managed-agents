import { Route, Routes } from "react-router-dom";
import { SiteLayout } from "./site-layout";
import { AuthView } from "./views/auth-view";
import { DatasetsView } from "./views/datasets-view";
import { EarnView } from "./views/earn-view";
import { HowItWorksView } from "./views/how-it-works-view";
import { PricingView } from "./views/pricing-view";
import { StudioPage } from "./views/studio-view";

// The worker serves the SPA with `not_found_handling: "single-page-application"`,
// so any unknown path reaches this router and can render its own 404 rather
// than the server returning index.html with a 200.
export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route element={<StudioPage />} index />
        <Route element={<HowItWorksView />} path="how-it-works" />
        <Route element={<DatasetsView />} path="datasets" />
        <Route element={<EarnView />} path="earn" />
        <Route element={<PricingView />} path="pricing" />
        <Route element={<AuthView mode="signIn" />} path="sign-in" />
        <Route element={<AuthView mode="signUp" />} path="sign-up" />
        <Route element={<NotFound />} path="*" />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <span className="section-kicker">404</span>
        <h1 className="auth-heading">That page does not exist.</h1>
        <p className="auth-intro">
          The link may be old, or the address may have a typo.
        </p>
        <a className="primary-button compact" href="/">
          Back to the studio
        </a>
      </div>
    </section>
  );
}
