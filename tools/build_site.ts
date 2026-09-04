#!/usr/bin/env node
/**
 * Build the U14 Rugby reference site from the markdown sources.
 *
 *   node tools/build_site.ts [output-dir]        # Node >= 23.6
 *   node --experimental-strip-types tools/build_site.ts [output-dir]   # Node 22.6+
 *
 * Default output dir: _site
 *
 * Sources are the markdown files in claude/ and plans/; the shared design system
 * is tools/theme.css, inlined into every page so each one is standalone.
 * Diagrams are embedded as data URIs from claude/images/web/ (web-sized copies
 * of the originals in claude/images/ — see CLAUDE.md).
 *
 * No dependencies: Node's own APIs only, so CI needs no install step to build.
 */
import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
/** Publish root — what gets deployed to Pages (the domain root). */
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "_site"));

/**
 * The site lives in a sub-directory of the domain, so this age group's pages
 * are served from rugby-plans.com/u14/ and the root is free for other age
 * groups later. Every link between pages is relative, so nothing else changes.
 */
const SITE_SUBDIR = "u14";
const SITE_OUT = path.join(OUT, SITE_SUBDIR);
const GENERATED = new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * A source .md filename mentioned in the markdown becomes a link to its page on
 * the site. Docs with no public page are left as plain text by the substitutions
 * in buildPages() rather than appearing here.
 */
const PAGE_FOR: Record<string, string> = {
  "playbook.md": "playbook.html",
  "blocks.md": "block1-overview.html",
  "activities.md": "activities.html",
  "calendar.md": "calendar.html",
  "laws.md": "laws.html",
  "warmup.md": "warmup.html",
  "age-group.md": "claude.html",
  "coaching.md": "claude.html",
  "claude/age-group.md": "claude.html",
  "claude/coaching.md": "claude.html",
};

/**
 * Diagram alt text in playbook.md -> web-sized file in claude/images/web/.
 * Adding a diagram means adding its web-sized copy and an entry here.
 */
const DIAGRAMS: Record<string, string> = {
  "Rhino": "rhino.png",
  "Hulk": "hulk.png",
  "Eagle": "eagle_kick.png",
  "Hawk — box kick": "hawk_box_kick.png",
  "5-man Rhino — Phase 1": "5man_rhino_phase1.png",
  "5-man Rhino — Phase 2": "5man_rhino_phase2.png",
  "5-man Rhino — Phase 3": "5man_rhino_phase3.png",
};

/**
 * Club pitch-allocation zones, from the label positions used by
 * https://pitch.twrfc.com/ — percentages of the base map image. A session plan
 * marks its pitch by writing `![caption](pitch:2b)`, and the build pins our
 * marker on that zone, so a new week only changes the zone code in the plan.
 */
const PITCH_ZONES: Record<string, { left: number; top: number; pitch: string; half: string }> = {
  // Halves are named as seen standing at the Club House looking out over the
  // grounds: Pitches 1 and 4 divide near/far, Pitches 2 and 3 left/right.
  "1a": { left: 14, top: 70, pitch: "Pitch 1", half: "near-end" },
  "1b": { left: 29, top: 69, pitch: "Pitch 1", half: "far-end" },
  "2a": { left: 45, top: 49, pitch: "Pitch 2", half: "left" },
  "2b": { left: 47, top: 65, pitch: "Pitch 2", half: "right" },
  "3a": { left: 65, top: 38, pitch: "Pitch 3", half: "left" },
  "3b": { left: 68, top: 53, pitch: "Pitch 3", half: "right" },
  "4a": { left: 9, top: 3, pitch: "Pitch 4", half: "far-end" },
  "4b": { left: 9, top: 17, pitch: "Pitch 4", half: "near-end" },
};

/** Which age group the pin is labelled for — we are U14M. */
const OUR_TEAM = "U14M";

/** Per-session page metadata. Adding a session means adding its run-sheet to
 *  plans/ and an entry here; the page and its index card follow automatically. */
interface PlanMeta {
  /** ISO date (YYYY-MM-DD) of the session — drives which plan is "next". */
  date: string;
  h1: string;
  sub: string;
  sub2: string;
  crumb: string;
  card: string;
  badge: string;
  /** Marks the plan as a work in progress — banners the page and the index card. */
  draft?: boolean;
}

const PLAN_META: Record<string, PlanMeta> = {
  "block1-week1-thur.md": {
    date: "2026-09-10",
    h1: "Week 1 — Thursday",
    sub: "Passing, a lineout positioning recap, and Bang introduced in a tight-space game.",
    sub2: "Thu 10 Sep 2026, 7–8pm",
    crumb: "Week 1 (Thu)",
    card: "Run-sheet for the midweek session at TWGSB: passing, lineout recap, and the first outing for Bang.",
    badge: "10 Sep",
    draft: true,
  },
  "block1-week1-sun.md": {
    date: "2026-09-06",
    h1: "Week 1 — Sunday",
    sub: "Season opener — tackle base, first lineout exposure, blitz-defence intro.",
    sub2: "Sun 6 Sep 2026",
    crumb: "Week 1 (Sun)",
    card: "Detailed run-sheet for the season-opening session: timings, drills, and setup.",
    badge: "6 Sep",
  },
};

/**
 * The plan shown at the stable next.html URL: the earliest session still to
 * come (today counts). If every session is in the past, the most recent one is
 * kept there rather than leaving the page broken.
 */
function pickNextPlan(plansDir: string): { file: string; upcoming: boolean } | null {
  const today = new Date().toISOString().slice(0, 10);
  const dated = Object.entries(PLAN_META)
    .filter(([f]) => fs.existsSync(path.join(plansDir, f)))
    .sort((a, b) => a[1].date.localeCompare(b[1].date));
  if (!dated.length) return null;
  const upcoming = dated.find(([, m]) => m.date >= today);
  if (upcoming) return { file: upcoming[0], upcoming: true };
  return { file: dated[dated.length - 1]![0], upcoming: false };
}

/** Marker at the start of a table row's first cell that highlights the row. */
const ROW_FLAG = "%%";

const warnings: string[] = [];

function warn(msg: string): void {
  warnings.push(msg);
  process.stderr.write(`WARNING: ${msg}\n`);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

// ------------------------------------------------------------------ inline md

/** Escape text content. <br> is the one raw tag the markdown sources use
 *  (multi-line table cells), so it is let back through. */
function esc(t: string): string {
  return t
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&lt;br&gt;", "<br />");
}

/** Escape a value going into a double-quoted attribute. */
function escAttr(t: string): string {
  return t
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

/** Inline code; if it names a source doc — or a session plan that has a
 *  PLAN_META entry — link it to that doc's page. */
function codeSpan(inner: string): string {
  const page =
    PAGE_FOR[inner] ??
    (inner.endsWith(".md") && PLAN_META[inner.replace(/^plans\//, "")]
      ? inner.replace(/^plans\//, "").replace(/\.md$/, ".html")
      : undefined);
  if (page) return `<code><a href="${page}">${page}</a></code>`;
  return `<code>${esc(inner)}</code>`;
}

function inline(text: string): string {
  const holes: string[] = [];
  const stash = (h: string): string => `\x00${holes.push(h) - 1}\x00`;

  // code spans first, so their contents are never touched by the later rules
  let out = text.replace(/`([^`]+)`/g, (_m, inner: string) => stash(codeSpan(inner)));
  out = esc(out);
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, href: string) => stash(`<a href="${escAttr(href)}">${label}</a>`),
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, s: string) => `<strong>${s}</strong>`);
  out = out.replace(/(?<![*\w])\*([^*]+)\*(?!\*)/g, (_m, s: string) => `<em>${s}</em>`);
  return out.replace(/\x00(\d+)\x00/g, (_m, i: string) => holes[Number(i)]!);
}

// ------------------------------------------------------------------- block md

/** Convert the markdown subset used by these sources: h1-h4, tables, lists,
 *  images, paragraphs, rules, and inline bold/italic/code/links. */
function mdToHtml(md: string, images: Record<string, string> = {}): string {
  const lines = md.split("\n");
  const out: string[] = [];
  const n = lines.length;
  let i = 0;

  const isTable = (k: number): boolean =>
    k + 1 < n &&
    lines[k]!.trimStart().startsWith("|") &&
    /^\s*\|[\s:|-]+\|\s*$/.test(lines[k + 1] ?? "");

  while (i < n) {
    const s = lines[i]!.trim();

    if (!s) {
      i += 1;
      continue;
    }

    if (s === "---") {
      out.push("<hr />");
      i += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(s);
    if (heading) {
      const lvl = heading[1]!.length;
      out.push(`<h${lvl}>${inline(heading[2]!)}</h${lvl}>`);
      i += 1;
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(s);
    if (image) {
      const alt = image[1]!;
      const target = image[2]!;

      // `![caption](pitch:2b)` — the club pitch map with our zone pinned
      if (target.startsWith("pitch:")) {
        const code = target.slice("pitch:".length);
        const zone = PITCH_ZONES[code];
        const map = images["__pitch_map__"];
        if (!zone) {
          warn(`unknown pitch zone '${code}' — known zones: ${Object.keys(PITCH_ZONES).join(", ")}`);
        } else if (map === undefined) {
          warn("pitch map image missing — skipped");
        } else {
          out.push(
            `<figure class="pitchmap">\n` +
              `<img alt="${escAttr(alt)}" src="${map}" />\n` +
              `<span class="pitch-pin" style="left:${zone.left}%;top:${zone.top}%">${OUR_TEAM} &middot; ${zone.pitch} (${zone.half})</span>\n` +
              `<figcaption>${inline(alt)}</figcaption>\n` +
              `</figure>`,
          );
        }
        i += 1;
        continue;
      }

      const src = images[alt];
      if (src === undefined) {
        warn(`no embedded diagram for image '${alt}' — skipped`);
      } else {
        out.push(`<img alt="${escAttr(alt)}" src="${src}" />`);
      }
      i += 1;
      continue;
    }

    if (isTable(i)) {
      const head = s.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      i += 2;
      const body: string[][] = [];
      while (i < n && lines[i]!.trim().startsWith("|")) {
        body.push(lines[i]!.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        i += 1;
      }
      const t = ['<div class="table-scroll">', "<table>", "<thead>", "<tr>"];
      t.push(...head.map((c) => `<th>${inline(c)}</th>`));
      t.push("</tr>", "</thead>", "<tbody>");
      for (const row of body) {
        // A row whose first cell starts with %% is highlighted — used to pick
        // out newly-available dates in the calendar.
        const flagged = row[0]?.startsWith(ROW_FLAG) ?? false;
        const cells = flagged
          ? [row[0]!.slice(ROW_FLAG.length).trim(), ...row.slice(1)]
          : row;
        t.push(flagged ? '<tr class="row-new">' : "<tr>");
        t.push(...cells.map((c) => `<td>${inline(c)}</td>`));
        t.push("</tr>");
      }
      t.push("</tbody>", "</table>", "</div>");
      out.push(t.join("\n"));
      continue;
    }

    const listKinds: Array<[RegExp, string]> = [
      [/^\s*[-*]\s+/, "ul"],
      [/^\s*\d+\.\s+/, "ol"],
    ];
    const kind = listKinds.find(([pat]) => pat.test(lines[i]!));
    if (kind) {
      const [pat, tag] = kind;
      const items: string[] = [];
      while (i < n && pat.test(lines[i]!)) {
        items.push(lines[i]!.replace(pat, ""));
        i += 1;
      }
      out.push(`<${tag}>\n${items.map((x) => `<li>${inline(x)}</li>`).join("\n")}\n</${tag}>`);
      continue;
    }

    // paragraph: keep consuming until a blank line or the next block
    const para = [s];
    i += 1;
    while (
      i < n &&
      lines[i]!.trim() &&
      !/^\s*(#{1,4}\s|[-*]\s|\d+\.\s|\||!\[|---$)/.test(lines[i]!)
    ) {
      para.push(lines[i]!.trim());
      i += 1;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}


// ------------------------------------------------------------------- brief
/** Pull one "## Heading" section out of a plan's markdown. */
function mdSection(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return "";
  let end = start + 1;
  while (end < lines.length && !lines[end]!.startsWith("## ")) end += 1;
  return lines.slice(start + 1, end).join("\n").trim();
}

/** Table rows only — drops prose, notes and images around a markdown table. */
function tableRows(section: string): string[] {
  return section.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
}

function splitCells(row: string): string[] {
  return row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

/**
 * The condensed page: the few header facts worth having in your hand, and the
 * run sheet as a list rather than a table, so it reads down a phone screen
 * instead of scrolling sideways. Everything else is a tap away on the full plan.
 */
/**
 * First sentence only. The brief carries the fact; the planning caveats that
 * follow it stay on the full plan — so a Session details cell should lead with
 * whatever a coach needs in their hand at the ground.
 */
function firstSentence(text: string): string {
  // Allows the sentence to end inside bold, as "**...Jeff.** (rest)" does.
  const m = /\.(\*\*)?\s+(?=[A-Z*(])/.exec(text);
  if (!m) return text;
  return text.slice(0, m.index + 1 + (m[1]?.length ?? 0));
}

function briefBody(md: string, permalink: string): string {
  const keep = ["Date/Time", "Location", "Coaches", "Resources required"];
  const details = tableRows(mdSection(md, "Session details"))
    .filter((r) => keep.some((k) => r.includes(`**${k}**`)))
    .map((r) => {
      const c = splitCells(r);
      return c.length >= 2 ? `| ${c[0]} | ${firstSentence(c[1]!)} |` : r;
    });
  const facts = details.length
    ? mdToHtml(["| | |", "|---|---|", ...details].join("\n"))
    : "";

  const rows = tableRows(mdSection(md, "Plan"));
  const body = rows.slice(2); // drop the header and separator rows
  const items = body
    .map((r) => splitCells(r))
    .filter((c) => c.length >= 3)
    .map(
      (c) =>
        `  <li><span class="t">${inline(c[0]!)}</span>` +
        `<span class="a">${inline(c[1]!)}</span>` +
        `<span class="f">${inline(c[2]!)}</span></li>`,
    );

  return [
    facts,
    '<h2>Run sheet</h2>',
    '<ol class="runsheet">',
    ...items,
    "</ol>",
    `<p class="brief-more">Detail, coaching points and diagrams are in the ` +
      `<a href="${permalink}">full run-sheet</a>.</p>`,
  ].join("\n");
}

// ----------------------------------------------------------------- page shell
interface PageOpts {
  title: string;
  h1: string;
  sub: string;
  sub2: string;
  crumb: string | null;
  body: string;
  extraCss?: string;
  footer?: string;
}

function page(theme: string, o: PageOpts): string {
  const foot =
    o.footer ??
    `Generated ${GENERATED} &middot; U14 Rugby coaching reference &middot; ` +
      `<a href="index.html">Back to index</a>`;
  const css = theme + (o.extraCss?.trim() ? "\n" + o.extraCss.trim() : "");
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
<header class="page-head">
  <div class="inner">
    <h1>${o.h1}</h1>
    <div class="sub">${o.sub}</div>
    <div class="sub2">${o.sub2}</div>
${nav}  </div>
</header>
<div class="wrap">
${o.body}
</div>
<footer class="page-foot">${foot}</footer>
</body>
</html>
`;
}

// ------------------------------------------------------------ source cleanup

/** Build requirement: no academy-library or external play-name provenance,
 *  and no club-Drive internals, on the public site. */
function stripProvenance(md: string): string {
  let s = md.replace(/\s*\((?:[Ss]ourced from|[Mm]atched to)[^()]*[Aa]cademy[^()]*\)/g, "");
  s = s.replace(/\s*Matches the club Academy's own "[^"]+" call\./g, "");
  s = s.replace(/\s*Academy equivalent: "[^"]+"\./g, "");
  s = s
    .split("\n")
    .filter(
      (l) =>
        !l.toLowerCase().includes("diagrams to source") &&
        !l.includes("folders in the club Drive"),
    )
    .join("\n");
  s = s.replace(/\s*\(sourced from[^()]*\)/gi, "");
  if (/[Aa]cademy/.test(s)) warn("academy reference survived stripping — check playbook.md");
  return s;
}

/** For the combined Coaching Notes page: drop a file's H1 and the
 *  Claude-facing lead paragraph above its first section. */
function dropH1AndLead(md: string): string {
  const lines = md.split("\n");
  let k = 0;
  while (k < lines.length && !lines[k]!.startsWith("## ")) k += 1;
  return lines.slice(k).join("\n");
}

function subAll(md: string, pairs: Array<[string, string]>, label: string): string {
  let s = md;
  for (const [old, replacement] of pairs) {
    if (!s.includes(old)) {
      warn(`[${label}] substitution no longer matches: '${old.slice(0, 60)}'`);
    }
    s = s.replaceAll(old, replacement);
  }
  return s;
}

// -------------------------------------------------------------------- diagrams
function loadDiagrams(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [alt, fname] of Object.entries(DIAGRAMS)) {
    const p = path.join(ROOT, "claude", "images", "web", fname);
    if (!fs.existsSync(p)) {
      warn(`missing web-sized diagram ${fname}`);
      continue;
    }
    out[alt] = "data:image/png;base64," + fs.readFileSync(p).toString("base64");
  }
  const mapPath = path.join(ROOT, "claude", "images", "web", "pitch-map.jpg");
  if (fs.existsSync(mapPath)) {
    out["__pitch_map__"] = "data:image/jpeg;base64," + fs.readFileSync(mapPath).toString("base64");
  } else {
    warn("missing claude/images/web/pitch-map.jpg");
  }
  return out;
}

// ------------------------------------------------------------------ index cards
const INDEX_CSS = `
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

const DRAFT_BADGE = ' <span class="badge badge-draft">Draft</span>';

const DRAFT_NOTE =
  '<p class="draft-note"><strong>Draft — work in progress.</strong> ' +
  "This run-sheet is not finished and will change before the session. " +
  "Don't print it or hand it round yet; check back for the final version.</p>";

function card(href: string, title: string, desc: string, badge?: string, draft?: boolean): string {
  const b = (badge ? ` <span class="badge">${badge}</span>` : "") + (draft ? DRAFT_BADGE : "");
  return (
    `    <a class="card" href="${href}">\n` +
    `      <div class="card-title">${title}${b}</div>\n` +
    `      <div class="card-desc">${desc}</div>\n` +
    `    </a>`
  );
}

// ---------------------------------------------------------------------- build
function buildPages(): Record<string, string> {
  const theme = read("tools/theme.css").trim();
  const diagrams = loadDiagrams();
  const pages: Record<string, string> = {};
  const add = (name: string, o: PageOpts): void => {
    pages[name] = page(theme, o);
  };

  // ---- playbook
  add("playbook.html", {
    title: "Playbook &amp; Calls — U14 Rugby",
    h1: "Playbook &amp; Calls",
    sub: "Our calls and shapes — open play, backs moves, kicking, defence, lineout, scrum.",
    sub2: "",
    crumb: "Playbook",
    body: mdToHtml(stripProvenance(read("claude/playbook.md")), diagrams),
  });

  // ---- coaching notes = age-group.md + coaching.md
  const ag = subAll(
    dropH1AndLead(read("claude/age-group.md")),
    [
      [
        "See `coaching.md` — How sessions should be coached for the contact-light " +
          "approach we take to the Thursday slot specifically.",
        "See How sessions should be coached below for the contact-light approach " +
          "we take to the Thursday slot specifically.",
      ],
    ],
    "age-group",
  );
  const co = subAll(
    dropH1AndLead(read("claude/coaching.md")),
    [
      ["see `age-group.md` — Training & Fixtures.", "see Training &amp; Fixtures above."],
      [
        "plus the neurodiversity guidance linked from `age-group.md`",
        "plus the neurodiversity guidance linked above",
      ],
    ],
    "coaching",
  );
  add("claude.html", {
    title: "Coaching Notes — U14 Rugby",
    h1: "Coaching Notes",
    sub: "Squad context, playing style, and how sessions are planned and run.",
    sub2: "",
    crumb: "Coaching Notes",
    body: mdToHtml(ag + "\n\n" + co),
  });

  // ---- block 1 overview
  add("block1-overview.html", {
    title: "Block 1 — Session Plans — U14 Rugby",
    h1: "Block 1 — Session Plans",
    sub: "Weeks 1–6 — defence, plus introducing lineout and scrum.",
    sub2: "Sun 6 Sep – Thu 15 Oct 2026",
    crumb: "Block 1 overview",
    body: mdToHtml(
      subAll(
        read("claude/blocks.md"),
        [
          [
            ", and `CLAUDE.md` for general session-planning mechanics — all of which apply across all blocks",
            " — all of which apply across all blocks",
          ],
        ],
        "blocks",
      ),
    ),
  });

  // ---- activities
  add("activities.html", {
    title: "Activities Bank — U14 Rugby",
    h1: "Activities Bank",
    sub: "Warm-up, game-zone and skill-zone games and drills, tagged by skill focus.",
    sub2: "",
    crumb: "Activities",
    body: mdToHtml(
      subAll(
        read("claude/activities.md"),
        [["(see `CLAUDE.md`'s Session plan template)", "(see the session-plan template)"]],
        "activities",
      ),
    ),
  });

  // ---- warm-up
  add("warmup.html", {
    title: "Warm-Up — U14 Rugby",
    h1: "The Standard Warm-Up",
    sub: "The five-minute player-led warm-up we open every session with — four phases, in lines off the try-line.",
    sub2: "",
    crumb: "Warm-up",
    body: mdToHtml(read("claude/warmup.md"), diagrams),
  });

  // ---- calendar
  add("calendar.html", {
    title: "Calendar — U14 Rugby",
    h1: "Calendar",
    sub: "2026/27 season — fixtures and training dates.",
    sub2: "",
    crumb: "Calendar",
    body: mdToHtml(read("claude/calendar.md")),
  });

  // ---- laws
  add("laws.html", {
    title: "Laws of the Game — U14 Rugby",
    h1: "Laws of the Game",
    sub: "RFU age-grade law changes relevant to this squad, U13 → U14.",
    sub2: "",
    crumb: "Laws",
    body: mdToHtml(read("claude/laws.md")),
  });

  // ---- session run-sheets: one page per file in plans/
  const plansDir = path.join(ROOT, "plans");
  for (const fname of fs.readdirSync(plansDir).sort()) {
    if (!fname.endsWith(".md")) continue;
    const meta = PLAN_META[fname];
    if (!meta) {
      warn(`no page metadata for plans/${fname} — add it to PLAN_META`);
      continue;
    }
    add(fname.slice(0, -3) + ".html", {
      title: `${meta.h1}${meta.draft ? " (Draft)" : ""} — U14 Rugby`,
      h1: meta.h1 + (meta.draft ? DRAFT_BADGE : ""),
      sub: meta.sub,
      sub2: meta.sub2,
      crumb: meta.crumb,
      body: (meta.draft ? DRAFT_NOTE + "\n" : "") + mdToHtml(read("plans/" + fname), diagrams),
    });
  }

  // ---- next.html: same content as the dated page, at a URL that never changes
  const next = pickNextPlan(plansDir);
  if (!next) {
    warn("no dated session plans — next.html not built");
  } else {
    const meta = PLAN_META[next.file]!;
    const permalink = next.file.slice(0, -3) + ".html";
    const notice = next.upcoming
      ? `<p class="next-note"><strong>This is the next session.</strong> ` +
        `This page always shows whichever session is coming up, so the link is safe to keep. ` +
        `The permanent link for this one is <a href="${permalink}">${permalink}</a>. There is a <a href="brief.html">condensed version</a> for pitch-side.</p>`
      : `<p class="next-note"><strong>No session is scheduled after this one yet.</strong> ` +
        `Showing the most recent plan (${meta.sub2}) until the next one is written. ` +
        `Its permanent link is <a href="${permalink}">${permalink}</a>.</p>`;
    add("next.html", {
      title: `Next Session${meta.draft ? " (Draft)" : ""} — U14 Rugby`,
      h1: meta.h1 + (meta.draft ? DRAFT_BADGE : ""),
      sub: meta.sub,
      sub2: meta.sub2,
      crumb: "Next session",
      body:
        (meta.draft ? DRAFT_NOTE + "\n" : "") +
        notice +
        "\n" +
        mdToHtml(read("plans/" + next.file), diagrams),
    });
  }

  // ---- brief.html: the same session, condensed for a phone at the ground
  if (next) {
    const meta = PLAN_META[next.file]!;
    const permalink = next.file.slice(0, -3) + ".html";
    add("brief.html", {
      title: `Brief${meta.draft ? " (Draft)" : ""} — U14 Rugby`,
      h1: meta.h1 + (meta.draft ? DRAFT_BADGE : ""),
      sub: "Condensed run sheet — the full plan is one tap away.",
      sub2: meta.sub2,
      crumb: "Brief",
      body:
        (meta.draft ? DRAFT_NOTE + "\n" : "") +
        briefBody(read("plans/" + next.file), permalink),
    });
  }

  // ---- index
  const planCards = Object.keys(PLAN_META)
    .sort()
    .filter((f) => fs.existsSync(path.join(plansDir, f)))
    .map((f) => {
      const m = PLAN_META[f]!;
      return card(f.slice(0, -3) + ".html", m.h1, m.card, m.badge, m.draft);
    });
  const nextCard = next
    ? [
        '  <h2 class="group">Next session</h2>',
        '  <div class="cards">',
        card(
          "next.html",
          PLAN_META[next.file]!.h1,
          next.upcoming
            ? "Whatever session is coming up next — this link always points at it, so it is the one to save or share."
            : "The most recent run-sheet; no later session is written yet. This link always points at whatever is next.",
          PLAN_META[next.file]!.badge,
          PLAN_META[next.file]!.draft,
        ),
        card(
          "brief.html",
          "Brief",
          "The same session cut down to when, where, kit and the run sheet — for reading on a phone at the ground.",
          undefined,
          PLAN_META[next.file]!.draft,
        ),
        "  </div>",
        "",
      ]
    : [];
  const indexBody = [
    ...nextCard,
    '  <h2 class="group">Block 1 &middot; Weeks 1&ndash;6</h2>',
    '  <div class="cards">',
    card(
      "block1-overview.html",
      "Block 1 — Overview",
      "Theme, the full week-by-week session list, and outline plans for all six weeks.",
      "Sep&ndash;Oct",
    ),
    ...planCards,
    "  </div>",
    "",
    '  <h2 class="group">Coaching reference</h2>',
    '  <div class="cards">',
    card(
      "playbook.html",
      "Playbook &amp; Calls",
      "Our calls and shapes — open play, backs moves, kicking, defence, lineout, scrum. " +
        "The master reference for how we play; clean enough to share with the players themselves.",
    ),
    card(
      "warmup.html",
      "The Standard Warm-Up",
      "The five-minute player-led warm-up we open every session with — four phases in lines off the try-line, and what the leader actually says.",
    ),
    card(
      "claude.html",
      "Coaching Notes",
      "Squad context, playing style, training structure, and how sessions are planned and run.",
    ),
    card(
      "activities.html",
      "Activities Bank",
      "Warm-up, game-zone and skill-zone games and drills, tagged by skill focus — " +
        "check here before inventing a new drill.",
    ),
    card(
      "laws.html",
      "Laws of the Game",
      "RFU age-grade law changes relevant to this squad as we move from U13 to U14 — " +
        "lineout, scrum, pitch and team size.",
    ),
    card("calendar.html", "Calendar", "This season's fixtures and training dates."),
    "  </div>",
  ].join("\n");

  add("index.html", {
    title: "U14 Rugby — Coaching Reference",
    h1: "U14 Rugby — Coaching Reference",
    sub: "A simple, shareable index of the squad's playbook and coaching reference.",
    sub2: "All pages responsive — built for pitch-side phone use and desktop planning alike.",
    crumb: null,
    body: indexBody,
    extraCss: INDEX_CSS,
    footer:
      "U14 Rugby coaching reference &middot; pages rebuilt from <code>claude/</code> " +
      "and <code>plans/</code> whenever the underlying plan changes.",
  });

  return pages;
}

/** Stub at the domain root so rugby-plans.com/ does not 404. Replace this when
 *  another age group joins and the root needs to be a real landing page. */
const ROOT_REDIRECT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="0; url=${SITE_SUBDIR}/">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="canonical" href="/${SITE_SUBDIR}/">
<title>U14 Rugby — Coaching Reference</title>
</head>
<body>
<p>Redirecting to the <a href="${SITE_SUBDIR}/">U14 coaching reference</a>.</p>
</body>
</html>
`;

function main(): number {
  const pages = buildPages();
  fs.mkdirSync(SITE_OUT, { recursive: true });
  for (const name of Object.keys(pages).sort()) {
    const content = pages[name]!;
    fs.writeFileSync(path.join(SITE_OUT, name), content, "utf-8");
    const kb = (Buffer.byteLength(content, "utf-8") / 1024).toFixed(1);
    console.log(`wrote ${(SITE_SUBDIR + "/" + name).padEnd(28)} ${kb.padStart(7)} KB`);
  }
  const favicon = read("tools/favicon.svg");
  fs.writeFileSync(path.join(SITE_OUT, "favicon.svg"), favicon, "utf-8");
  fs.writeFileSync(path.join(OUT, "favicon.svg"), favicon, "utf-8");
  console.log(`wrote ${(SITE_SUBDIR + "/favicon.svg").padEnd(28)}         (rugby ball)`);

  fs.writeFileSync(path.join(OUT, "index.html"), ROOT_REDIRECT, "utf-8");
  console.log(`wrote ${"index.html".padEnd(28)}         (root redirect to ${SITE_SUBDIR}/)`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log("  - " + w);
    return 1;
  }
  return 0;
}

process.exit(main());
