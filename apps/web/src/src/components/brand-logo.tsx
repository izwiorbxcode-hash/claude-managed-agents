/**
 * The `izwa` wordmark, pre-rendered in two variants:
 *   - `logo.webp`      navy wordmark, for light surfaces
 *   - `logo-dark.webp` white wordmark, for dark surfaces
 *
 * Which one shows is decided in CSS from `[data-theme]`, NOT from
 * `prefers-color-scheme`. A media query would ignore the manual toggle, so a
 * visitor who forces dark mode on a light-mode OS would get an invisible
 * navy-on-navy logo. Both files have transparent backgrounds, so nothing is
 * drawn behind them.
 */
export function BrandLogo({
  className,
  height = 32,
}: {
  className?: string;
  height?: number;
}) {
  // Preserve the lockup's aspect ratio (1000x406) so the browser reserves the
  // right box before the image decodes and the header doesn't shift.
  const width = Math.round((height * 1000) / 406);
  return (
    <>
      {/* biome-ignore lint/performance/noImgElement: this is a Vite SPA, not Next.js — there is no next/image to use. Both files are static assets under /static/brand. */}
      <img
        alt="izwa"
        className={`brand-logo logo-light ${className ?? ""}`}
        height={height}
        src="/brand/logo.webp"
        width={width}
      />
      {/* biome-ignore lint/performance/noImgElement: see above */}
      <img
        alt=""
        aria-hidden="true"
        className={`brand-logo logo-dark ${className ?? ""}`}
        height={height}
        src="/brand/logo-dark.webp"
        width={width}
      />
    </>
  );
}
