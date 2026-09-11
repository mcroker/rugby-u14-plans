/**
 * The page shell every page shares, and the index cards. The design system is
 * inlined so each page is standalone.
 */

export interface PageOpts {
  title: string;
  h1: string;
  sub: string;
  sub2: string;
  crumb: string | null;
  body: string;
  extraCss?: string;
  extraJs?: string;
  footer?: string;
}

export interface Shell {
  /** The design system, inlined into every page. */
  theme: string;
  /** Footer line under each page — "Generated <date> · <team> · Back to index". */
  footer: string;
  /** Optional strip above the page header, crediting the source repository.
   *  Empty for most sites; see `source` in club.json. */
  banner?: string;
}

/** Styles for the source strip — added only to pages that carry one, the way
 *  INDEX_CSS is, so a site without a banner ships none of this. */
const BANNER_CSS = `
.site-banner { background: var(--ink); color: #ffffff; font-size: 0.78rem; line-height: 1.4; }
.site-banner .inner {
  max-width: var(--page-width); margin: 0 auto; padding: 6px 24px;
  display: flex; gap: 6px 10px; flex-wrap: wrap; align-items: baseline;
}
.site-banner span { opacity: 0.72; }
.site-banner a { color: #ffffff; text-decoration: underline; text-underline-offset: 2px; }
.site-banner a:hover { color: var(--gold-tint); }
`;

export function page(shell: Shell, o: PageOpts): string {
  const foot = o.footer ?? shell.footer;
  const css =
    shell.theme +
    (shell.banner ? "\n" + BANNER_CSS.trim() : "") +
    (o.extraCss?.trim() ? "\n" + o.extraCss.trim() : "");
  const nav = o.crumb
    ? `    <nav class="crumb"><a href="index.html">Index</a> &rsaquo; ${o.crumb}</nav>\n`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${o.title}</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<style>${css}</style>
</head>
<body>
${shell.banner ?? ""}<header class="page-head">
  <div class="inner">
    <h1>${o.h1}</h1>
    <div class="sub">${o.sub}</div>
    <div class="sub2">${o.sub2}</div>
${nav}  </div>
</header>
<div class="wrap">
${o.body}
</div>
<footer class="page-foot">${foot}</footer>${o.extraJs ? `\n<script>${o.extraJs}</script>` : ""}
</body>
</html>
`;
}

// ------------------------------------------------------------------ index cards

export const INDEX_CSS = `
h2.group {
  font-family: "Oswald", sans-serif; font-weight: 500; font-size: 0.82rem;
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);
  margin: 2.6em 0 0; padding-bottom: 8px; border-bottom: 2px dashed var(--rule);
}
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; margin-top: 16px; }
a.card {
  display: flex; flex-direction: column; gap: 6px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  padding: 16px 18px; text-decoration: none; color: var(--ink);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
a.card:hover { border-color: var(--blue); box-shadow: 0 2px 10px rgba(29,63,114,0.08); }
a.card .card-title {
  font-family: "Oswald", sans-serif; font-weight: 600; color: var(--blue); font-size: 1.05rem;
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
}
a.card .card-desc { color: var(--muted); font-size: 0.88rem; line-height: 1.5; }
`;

export const DRAFT_BADGE = ' <span class="badge badge-draft">Draft</span>';

export const DRAFT_NOTE =
  '<p class="draft-note"><strong>Draft — work in progress.</strong> ' +
  "This run-sheet is not finished and will change before the session. " +
  "Don't print it or hand it round yet; check back for the final version.</p>";

export function card(
  href: string,
  title: string,
  desc: string,
  badge?: string,
  draft?: boolean,
): string {
  const b = (badge ? ` <span class="badge">${badge}</span>` : "") + (draft ? DRAFT_BADGE : "");
  return (
    `    <a class="card" href="${href}">\n` +
    `      <div class="card-title">${title}${b}</div>\n` +
    `      <div class="card-desc">${desc}</div>\n` +
    `    </a>`
  );
}
