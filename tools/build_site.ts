#!/usr/bin/env node
/**
 * Build the club's coaching sites from the markdown sources.
 *
 *   node tools/build_site.ts [output-dir]        # Node >= 23.6
 *   node --experimental-strip-types tools/build_site.ts [output-dir]   # Node 22.6+
 *
 * Default output dir: _site
 *
 * One site per folder in teams/, published to its own sub-directory, plus a
 * landing page at the root listing them. Each team's content is resolved
 * through three layers — teams/<slug>/, then club/, then content/ — so a team
 * writes only what differs from the defaults. See tools/lib/config.ts.
 *
 * The rendering machinery lives in tools/lib/; this file is the orchestration.
 *
 * No dependencies: Node's own APIs only, so CI needs no install step to build.
 */
import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadClub,
  loadPitchZones,
  loadTeams,
  overlay,
  resolve,
  type Club,
  type Team,
} from "./lib/config.ts";
import { bool, num, optStr, parseFrontMatter, str } from "./lib/frontmatter.ts";
import { inline, mdToHtml, plainCtx, type RenderCtx } from "./lib/md.ts";
import {
  card,
  DRAFT_BADGE,
  DRAFT_NOTE,
  INDEX_CSS,
  page,
  type PageOpts,
  type Shell,
} from "./lib/pages.ts";
import { DETAIL_JS, planWithWarmup, sessionBody } from "./lib/session.ts";
import { allWarnings, note, warn } from "./lib/warn.ts";
import { loadForecasts, sunsetAt } from "./lib/weather.ts";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
/** Publish root — what gets deployed to Pages (the domain root). */
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "_site"));

const CLUB: Club = loadClub(ROOT);
const PITCH_ZONES = loadPitchZones(ROOT);
const TEAMS = loadTeams(ROOT);

const GENERATED = new Date().toLocaleDateString(CLUB.locale, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Where a team's diagrams are copied to inside its own site. */
const IMG_DIR = "img";

// ------------------------------------------------------------------- rewrites

/**
 * What the build rewrites or removes on the way to the public site — kept as
 * club config rather than in the engine, because what a club must keep off a
 * page players and parents read is the club's own business.
 */
interface Rewrites {
  /** Regular expressions removed from every doc. */
  redact: string[];
  /** Lines dropped entirely if they contain any of these. */
  redactLines: string[];
  /** If this still matches after redacting, something was missed — warn. */
  redactCheck: string;
  /** Per-source literal [find, replace] pairs. */
  rewrite: Record<string, Array<[string, string]>>;
}

function loadRewrites(): Rewrites {
  const file = path.join(ROOT, "club", "rewrites.json");
  const empty: Rewrites = { redact: [], redactLines: [], redactCheck: "", rewrite: {} };
  if (!fs.existsSync(file)) return empty;
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf-8")) as Partial<Rewrites>;
    return { ...empty, ...j };
  } catch (err) {
    warn(`club/rewrites.json could not be read: ${(err as Error).message}`);
    return empty;
  }
}

const REWRITES = loadRewrites();

/** Build requirement: no academy-library or external play-name provenance,
 *  and no club-Drive internals, on the public site. */
function redact(md: string, label: string): string {
  let s = md;
  for (const pattern of REWRITES.redact) s = s.replace(new RegExp(pattern, "g"), "");
  if (REWRITES.redactLines.length) {
    s = s
      .split("\n")
      .filter((l) => !REWRITES.redactLines.some((needle) => l.includes(needle)))
      .join("\n");
  }
  if (REWRITES.redactCheck && new RegExp(REWRITES.redactCheck).test(s)) {
    warn(`redaction left a match for /${REWRITES.redactCheck}/ in ${label}`);
  }
  return s;
}

/**
 * Apply the club's rewrites for one source file. A rule that no longer matches
 * is a note rather than a warning — a reworded sentence leaves a slightly awkward
 * cross-reference on one page, which is not a reason to stop publishing the site.
 */
function rewrite(md: string, label: string): string {
  let s = md;
  // Keyed by filename, so a rule survives the doc moving between layers.
  for (const [old, replacement] of REWRITES.rewrite[path.basename(label)] ?? []) {
    if (!s.includes(old)) {
      note(`[${label}] rewrite no longer matches: '${old.slice(0, 60)}…'`);
    }
    s = s.replaceAll(old, replacement);
  }
  return s;
}

/** For a page built from several docs: drop a file's H1 and the lead paragraph
 *  above its first section. */
function dropH1AndLead(md: string): string {
  const lines = md.split("\n");
  let k = 0;
  while (k < lines.length && !lines[k]!.startsWith("## ")) k += 1;
  return lines.slice(k).join("\n");
}

// ----------------------------------------------------------------- doc + plan

/**
 * A content doc and the page it becomes, read from the doc's own frontmatter.
 * Several docs can name the same `page`, in which case they are concatenated in
 * `order` and the lowest-ordered one supplies the page's heading and crumb.
 */
interface DocMeta {
  /** Path relative to the repo root, used for labels and rewrite lookups. */
  file: string;
  /** Output filename, e.g. `playbook.html`. */
  page: string;
  h1: string;
  sub: string;
  sub2: string;
  crumb: string;
  order: number;
  /** Index group this doc's card belongs to; empty means no card. */
  group: string;
  /** Card title, when it should differ from the page heading. */
  cardTitle: string;
  card: string;
  badge: string;
  /** Whether the session-plan cards are listed under this doc's group. */
  withPlans: boolean;
  /** Drop the source H1 and the lead paragraph above the first section. */
  stripLead: boolean;
  body: string;
}

/** Markdown that is never a page: instructions for whoever works on the repo.
 *  Build requirement — the CLAUDE.md files stay off the shared site. */
const NOT_PAGES = new Set(["CLAUDE.MD", "README.MD", "AGENTS.MD", "CONTRIBUTING.MD"]);

/**
 * Every content doc visible to a team — its own, plus anything it has not
 * overridden from club/ and content/.
 */
function loadDocs(team: Team): DocMeta[] {
  const found = overlay(ROOT, team.slug, ".");
  // The age-grade laws are the same for every club, so they are kept as one
  // file per age group and picked by the team's own `ageGroup`. A team that
  // writes its own laws.md overrides this like any other default.
  if (!found.has("laws.md")) {
    const laws = resolve(ROOT, team.slug, path.join("laws", `${team.ageGroup}.md`));
    if (laws) found.set("laws.md", laws);
    else note(`${team.slug}: no laws doc for age group '${team.ageGroup}'`);
  }

  const out: DocMeta[] = [];
  for (const [name, file] of found) {
    if (!name.endsWith(".md")) continue;
    // Instructions for whoever works on the repo, never pages on the site.
    if (NOT_PAGES.has(name.toUpperCase())) continue;
    const label = path.relative(ROOT, file);
    const { data, body } = parseFrontMatter(fs.readFileSync(file, "utf-8"), label);
    const pageName = optStr(data, "page");
    if (!pageName) {
      warn(`${label} has no 'page' in its frontmatter — it would not appear on the site`);
      continue;
    }
    out.push({
      file: label,
      page: pageName,
      h1: str(data, "h1", label, ""),
      sub: str(data, "sub", label, ""),
      sub2: str(data, "sub2", label, ""),
      crumb: str(data, "crumb", label, ""),
      order: num(data, "order", 99),
      group: str(data, "group", label, ""),
      cardTitle: str(data, "cardTitle", label, ""),
      card: str(data, "card", label, ""),
      badge: str(data, "badge", label, ""),
      withPlans: bool(data, "withPlans", false),
      stripLead: bool(data, "stripLead", false),
      body,
    });
  }
  // Ties break on filename so a page's composition never depends on the order
  // the layers happened to be walked in.
  return out.sort((a, b) => a.order - b.order || a.file.localeCompare(b.file));
}

/**
 * Per-session page metadata, read from the frontmatter of the run-sheet itself.
 * Adding a session is adding a file to the team's plans/ — there is no second
 * list to keep in step with it.
 */
interface PlanMeta {
  /** The run-sheet's filename, e.g. `block1-week2-thur.md`. */
  file: string;
  /** ISO date (YYYY-MM-DD) of the session — drives which plan is "next". */
  date: string;
  /** Clock time that "+0" in the Plan table means, as HH:MM. */
  start?: string;
  h1: string;
  sub: string;
  sub2: string;
  crumb: string;
  card: string;
  badge: string;
  /** Marks the plan as a work in progress — banners the page and the index card. */
  draft: boolean;
  /** Whether to show sunset in the logistics. */
  sunset: boolean;
  /** The run-sheet's markdown, frontmatter removed. */
  body: string;
}

/**
 * The date as a short badge — "17 Sep". The month is cut to three letters
 * rather than taken as-is: en-GB's short September is "Sept", and a badge is a
 * narrow thing that wants every month the same width.
 */
function badgeFor(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const part = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(CLUB.locale, { ...opts, timeZone: CLUB.timezone }).format(d);
  return `${part({ day: "numeric" })} ${part({ month: "short" }).slice(0, 3)}`;
}

/**
 * Read every run-sheet in a team's plans/. Run-sheets are always the team's own
 * — a default session plan would mean nothing to anyone — so no layering here.
 * A plan with no frontmatter is reported rather than skipped silently.
 */
function loadPlans(team: Team): PlanMeta[] {
  const dir = path.join(ROOT, "teams", team.slug, "plans");
  if (!fs.existsSync(dir)) return [];
  const out: PlanMeta[] = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith(".md")) continue;
    const label = `teams/${team.slug}/plans/${file}`;
    const { data, body } = parseFrontMatter(fs.readFileSync(path.join(dir, file), "utf-8"), label);
    if (!Object.keys(data).length) {
      warn(`${label} has no frontmatter — it needs at least date, h1, sub, crumb and card`);
      continue;
    }
    const date = str(data, "date", label);
    const start = optStr(data, "start");
    // Sunset is what tells a coach whether the session finishes in the light,
    // so it belongs on an evening session and is noise on a morning one.
    const evening = Number((start ?? "").slice(0, 2)) >= 16;
    out.push({
      file,
      date,
      start,
      h1: str(data, "h1", label),
      sub: str(data, "sub", label),
      sub2: str(data, "sub2", label, ""),
      crumb: str(data, "crumb", label),
      card: str(data, "card", label),
      badge: str(data, "badge", label, badgeFor(date)),
      draft: bool(data, "draft", false),
      sunset: bool(data, "sunset", evening),
      body,
    });
  }
  return out;
}

/**
 * The plan shown at the stable next.html URL: the earliest session still to
 * come (today counts). If every session is in the past, the most recent one is
 * kept there rather than leaving the page broken.
 */
function pickNextPlan(plans: PlanMeta[]): { plan: PlanMeta; upcoming: boolean } | null {
  const today = new Date().toISOString().slice(0, 10);
  const dated = [...plans].sort((a, b) => a.date.localeCompare(b.date));
  if (!dated.length) return null;
  const upcoming = dated.find((m) => m.date >= today);
  if (upcoming) return { plan: upcoming, upcoming: true };
  return { plan: dated[dated.length - 1]!, upcoming: false };
}

// ---------------------------------------------------------------------- build

/** Everything one team's pages are built from, gathered once. */
interface TeamBuild {
  team: Team;
  docs: DocMeta[];
  plans: PlanMeta[];
}

/** Live forecasts by ISO date, filled in before the pages are built. */
let forecasts = new Map<string, string>();

/**
 * Diagrams are copied into each team's site as ordinary files and referenced,
 * not inlined as data URIs: on a hosted site a same-origin image is cacheable,
 * lazily loadable, and keeps the HTML small enough to render at the ground.
 *
 * Everything in the layered images/web folders is copied and keyed by filename,
 * which is what the markdown writes — `![A shape](shape.png)`. The club's map
 * comes through the same way, so a team can supply its own.
 */
function copyImages(team: Team, siteOut: string): Record<string, string> {
  const out: Record<string, string> = {};
  const dir = path.join(siteOut, IMG_DIR);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, src] of overlay(ROOT, team.slug, path.join("images", "web"))) {
    fs.copyFileSync(src, path.join(dir, name));
    out[name] = `${IMG_DIR}/${name}`;
  }
  const map = out[CLUB.pitchMap];
  if (map) out["__pitch_map__"] = map;
  return out;
}

/** The generated logistics rows for a session: the two things the plan cannot
 *  state for itself. Order matters — sunset, then weather. */
function generatedRows(meta: PlanMeta): string[] {
  const rows: string[] = [];
  if (meta.sunset) {
    const sunset = sunsetAt(meta.date, CLUB);
    if (sunset) rows.push(`| **Sunset** | ${sunset} at the club |`);
    else warn(`no sunset could be computed for ${meta.date}`);
  }
  const forecast = forecasts.get(meta.date);
  if (forecast) rows.push(`| **Weather** | ${forecast} |`);
  return rows;
}

function buildTeam(b: TeamBuild, siteOut: string): Record<string, string> {
  const { team, docs, plans } = b;
  const shell: Shell = {
    theme: fs.readFileSync(path.join(ROOT, "tools", "theme.css"), "utf-8").trim(),
    footer:
      `Generated ${GENERATED} &middot; ${team.name} coaching reference &middot; ` +
      `<a href="index.html">Back to index</a>`,
  };
  const images = copyImages(team, siteOut);

  const planFiles = new Set(plans.map((p) => p.file));
  /**
   * A source .md filename mentioned in the markdown becomes a link to its page
   * on the site — written either bare (`playbook.md`) or with its folder. A doc
   * with no page on the site is simply absent, and renders as plain text.
   */
  const pageFor: Record<string, string> = {};
  for (const d of docs) {
    pageFor[path.basename(d.file)] = d.page;
    pageFor[d.file] = d.page;
  }
  const linkFor = (ref: string): string | undefined => {
    const plan = ref.replace(/^plans\//, "");
    if (pageFor[ref]) return pageFor[ref];
    if (ref.endsWith(".md") && planFiles.has(plan)) return plan.replace(/\.md$/, ".html");
    return undefined;
  };
  const ctx: RenderCtx = {
    images,
    linkFor,
    pitchZones: PITCH_ZONES,
    pinLabel: team.pinLabel,
  };

  const pages: Record<string, string> = {};
  const add = (name: string, o: PageOpts): void => {
    pages[name] = page(shell, o);
  };
  const txt = (s: string) => inline(s, plainCtx());

  // ---- one page per `page:` a doc declares, docs concatenated in order
  const byPage = new Map<string, DocMeta[]>();
  for (const d of docs) {
    const list = byPage.get(d.page) ?? [];
    list.push(d);
    byPage.set(d.page, list);
  }
  for (const [name, group] of byPage) {
    const lead = group[0]!;
    const md = group
      .map((d) => {
        const s = d.stripLead ? dropH1AndLead(d.body) : d.body;
        return rewrite(redact(s, d.file), d.file);
      })
      .join("\n\n");
    add(name, {
      title: `${txt(lead.h1)} — ${txt(team.name)}`,
      h1: txt(lead.h1),
      sub: txt(lead.sub),
      sub2: txt(lead.sub2),
      crumb: txt(lead.crumb),
      body: mdToHtml(md, ctx),
    });
  }

  // ---- session run-sheets: one page per file in the team's plans/
  const warmupDoc = docs.find((d) => path.basename(d.file) === "warmup.md");
  const warmupMd = warmupDoc?.body ?? "";
  if (!warmupDoc) warn(`${team.slug}: no warmup.md — session pages will have no warm-up entry`);
  for (const meta of plans) {
    add(`${meta.file.slice(0, -3)}.html`, {
      title: `${meta.h1}${meta.draft ? " (Draft)" : ""} — ${txt(team.name)}`,
      h1: meta.h1 + (meta.draft ? DRAFT_BADGE : ""),
      sub: meta.sub,
      sub2: meta.sub2,
      crumb: meta.crumb,
      extraJs: DETAIL_JS,
      body:
        (meta.draft ? DRAFT_NOTE + "\n" : "") +
        sessionBody(planWithWarmup(meta.body, warmupMd), ctx, {
          start: meta.start,
          extraRows: generatedRows(meta),
        }),
    });
  }

  // ---- next.html: the session page itself, at a URL that never changes.
  //      A copy rather than a redirect, so the link people hold stays next.html.
  const next = pickNextPlan(plans);
  if (!next) {
    if (plans.length) warn(`${team.slug}: no dated session plans — next.html not built`);
  } else {
    const meta = next.plan;
    const permalink = `${meta.file.slice(0, -3)}.html`;
    const noteHtml = next.upcoming
      ? `<p class="next-note">The next session. This page always shows whichever session is coming up; ` +
        `the permanent link for this one is <a href="${permalink}">${permalink}</a>.</p>`
      : `<p class="next-note">The most recent session (${meta.sub2}) — nothing later is written yet. ` +
        `Its permanent link is <a href="${permalink}">${permalink}</a>.</p>`;
    add("next.html", {
      title: `${meta.h1}${meta.draft ? " (Draft)" : ""} — ${txt(team.name)}`,
      h1: meta.h1 + (meta.draft ? DRAFT_BADGE : ""),
      sub: meta.sub,
      sub2: meta.sub2,
      crumb: "Next session",
      extraJs: DETAIL_JS,
      body:
        (meta.draft ? DRAFT_NOTE + "\n" : "") +
        noteHtml +
        "\n" +
        sessionBody(planWithWarmup(meta.body, warmupMd), ctx, {
          start: meta.start,
          extraRows: generatedRows(meta),
        }),
    });
  }

  // ---- index
  const planCards = [...plans]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((m) => card(m.file.slice(0, -3) + ".html", m.h1, m.card, m.badge, m.draft));
  const nextCard = next
    ? [
        '  <h2 class="group">Next session</h2>',
        '  <div class="cards">',
        card(
          "next.html",
          next.plan.h1,
          next.upcoming
            ? "Whatever session is coming up next — this link always points at it, so it is the one to save or share."
            : "The most recent run-sheet; no later session is written yet. This link always points at whatever is next.",
          next.plan.badge,
          next.plan.draft,
        ),
        "  </div>",
        "",
      ]
    : [];
  // Card groups come from the docs themselves: each names its group, and the
  // group holding the block overview also lists that block's run-sheets.
  //
  // One card per page, not per doc. Several docs can build one page — a team's
  // age-group.md and the shared coaching.md both land on Coaching Notes — and
  // each may declare a group, since either could be the one a given team has.
  // The first by `order` wins; without this the page gets a card twice.
  const cardDocs: DocMeta[] = [];
  for (const d of docs) {
    if (!d.group) continue;
    if (cardDocs.some((c) => c.page === d.page)) continue;
    cardDocs.push(d);
  }
  const groupNames: string[] = [];
  for (const d of cardDocs) if (!groupNames.includes(d.group)) groupNames.push(d.group);
  const groupCards = groupNames.flatMap((g) => {
    const inGroup = cardDocs.filter((d) => d.group === g);
    return [
      `  <h2 class="group">${txt(g)}</h2>`,
      '  <div class="cards">',
      ...inGroup.map((d) =>
        card(d.page, txt(d.cardTitle || d.h1), txt(d.card), d.badge ? txt(d.badge) : undefined),
      ),
      ...(inGroup.some((d) => d.withPlans) ? planCards : []),
      "  </div>",
      "",
    ];
  });

  add("index.html", {
    title: txt(team.title),
    h1: txt(team.title),
    sub: txt(team.sub),
    sub2: txt(team.sub2),
    crumb: null,
    body: [...nextCard, ...groupCards].join("\n").replace(/\n+$/, ""),
    extraCss: INDEX_CSS,
    footer:
      `${txt(team.name)} coaching reference &middot; rebuilt from the markdown ` +
      `in <code>teams/${team.slug}/</code> whenever it changes &middot; ` +
      `<a href="../index.html">All age groups</a>`,
  });

  return pages;
}

// ------------------------------------------------------------- landing page

/** The page at the root of the domain: one card per team. */
function buildLanding(builds: TeamBuild[]): string {
  const shell: Shell = {
    theme: fs.readFileSync(path.join(ROOT, "tools", "theme.css"), "utf-8").trim(),
    footer: `Generated ${GENERATED} &middot; ${CLUB.name}`,
  };
  const txt = (s: string) => inline(s, plainCtx());
  const cards = builds.map(({ team, plans }) => {
    const next = pickNextPlan(plans);
    const desc = team.card || `Coaching reference for the ${team.name} squad.`;
    return card(
      `${team.slug}/index.html`,
      txt(team.name),
      txt(desc),
      next ? next.plan.badge : undefined,
    );
  });
  return page(shell, {
    title: txt(CLUB.site.title),
    h1: txt(CLUB.site.title),
    sub: txt(CLUB.site.sub),
    sub2: txt(CLUB.site.sub2),
    crumb: null,
    extraCss: INDEX_CSS,
    body: ['  <h2 class="group">Age groups</h2>', '  <div class="cards">', ...cards, "  </div>"].join(
      "\n",
    ),
    footer: `${txt(CLUB.name)} &middot; coaching reference, rebuilt on every change`,
  });
}

function main(builds: TeamBuild[]): number {
  const favicon = fs.readFileSync(path.join(ROOT, "tools", "favicon.svg"), "utf-8");

  for (const b of builds) {
    const siteOut = path.join(OUT, b.team.slug);
    fs.mkdirSync(siteOut, { recursive: true });
    const pages = buildTeam(b, siteOut);
    for (const name of Object.keys(pages).sort()) {
      const content = pages[name]!;
      fs.writeFileSync(path.join(siteOut, name), content, "utf-8");
      const kb = (Buffer.byteLength(content, "utf-8") / 1024).toFixed(1);
      console.log(`wrote ${(b.team.slug + "/" + name).padEnd(28)} ${kb.padStart(7)} KB`);
    }
    fs.writeFileSync(path.join(siteOut, "favicon.svg"), favicon, "utf-8");
    console.log(`wrote ${(b.team.slug + "/favicon.svg").padEnd(28)}         (rugby ball)`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "favicon.svg"), favicon, "utf-8");
  fs.writeFileSync(path.join(OUT, "index.html"), buildLanding(builds), "utf-8");
  console.log(`wrote ${"index.html".padEnd(28)}         (${builds.length} age group(s))`);

  const warnings = allWarnings();
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log("  - " + w);
    return 1;
  }
  return 0;
}

const BUILDS: TeamBuild[] = TEAMS.map((team) => ({
  team,
  docs: loadDocs(team),
  plans: loadPlans(team),
}));
forecasts = await loadForecasts(
  BUILDS.flatMap((b) => b.plans),
  CLUB,
  GENERATED,
);
process.exit(main(BUILDS));
