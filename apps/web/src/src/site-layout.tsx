import { useCallback, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { BrandLogo } from "./components/brand-logo";
import { ThemeToggle } from "./components/theme-toggle";
import { authClient, useSession } from "./lib/auth-client";

const NAV = [
  { label: "Studio", to: "/" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Products", to: "/datasets" },
  { label: "Contributors", to: "/earn" },
  { label: "Commercial", to: "/pricing" },
] as const;

/**
 * Session controls for the header. Split out of SiteLayout so the signed-in and
 * signed-out branches each get their own early return — nesting them inline
 * produced nested ternaries and made the pending state ambiguous.
 */
function SessionControls() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      navigate("/");
    } finally {
      setSigningOut(false);
    }
  }, [navigate]);

  // Don't flash "Sign in" at someone who is already signed in.
  if (isPending) {
    return null;
  }

  if (!session?.user) {
    return (
      <>
        <Link className="ghost-button" to="/sign-in">
          Sign in
        </Link>
        <Link className="primary-button compact" to="/sign-up">
          Create account
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="header-user" title={session.user.email}>
        {session.user.name || session.user.email}
      </span>
      <button
        className="ghost-button"
        disabled={signingOut}
        onClick={signOut}
        type="button"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}

/**
 * Shell shared by every public page. Owns the header (mark, nav, theme
 * toggle, session state) and the footer so the marketing pages and the
 * contribution studio stay visually identical.
 *
 * The wordmark is served as two pre-rendered variants chosen by CSS from
 * `[data-theme]` — see `components/brand-logo.tsx`.
 */
export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu on every navigation (logo, nav link, auth redirect).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Let Escape dismiss the mobile menu and return focus to the toggle.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-header" data-menu={menuOpen ? "open" : "closed"}>
        <div className="header-top">
          <Link aria-label="izwa home" className="brand" to="/">
            <BrandLogo height={30} />
          </Link>

          <div className="header-actions">
            <ThemeToggle />
            <span className="header-session-desktop">
              <SessionControls />
            </span>
            <button
              aria-controls="primary-menu"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="menu-toggle"
              id="menu-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <span aria-hidden="true" className="menu-icon">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>

        <div className="header-menu" id="primary-menu">
          <div className="header-menu-inner">
            <nav aria-label="Primary" className="site-nav">
              {NAV.map((item) => (
                <NavLink
                  // biome-ignore lint/performance/noJsxPropsBind: NavLink's className prop is a render prop — React Router calls it with { isActive }, it is not an event handler.
                  className={({ isActive }) =>
                    isActive ? "site-nav-link active" : "site-nav-link"
                  }
                  key={item.to}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="header-session-mobile">
              <SessionControls />
            </div>
          </div>
        </div>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer>
        <BrandLogo className="footer-logo" height={28} />
        <p>
          Learned-data infrastructure and applied AI, beginning with Nguni
          languages.
        </p>
        <nav aria-label="Footer" className="footer-nav">
          <Link to="/how-it-works">How it works</Link>
          <Link to="/datasets">Products</Link>
          <Link to="/earn">Contributors</Link>
          <Link to="/pricing">Commercial</Link>
          <a href="/redoc.html">API reference</a>
        </nav>
      </footer>
    </div>
  );
}
