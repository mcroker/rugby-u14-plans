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
 * Diagrams are copied into the site from claude/images/web/ (web-sized copies of
 * the originals in claude/images/ — see CLAUDE.md).
 *
 * The rendering machinery lives in tools/lib/; this file is the configuration
 * and the orchestration.
 *
 * No dependencies: Node's own APIs only, so CI needs no install step to build.
 */
import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { mdToHtml, type PitchZone, type RenderCtx } from "./lib/md.ts";
import {
  card,
  DRAFT_BADGE,
  DRAFT_NOTE,
  INDEX_CSS,
  page,
  type PageOpts,
  type Shell,
} from "./lib/pages.ts";
import {
  DETAIL_JS,
  planWithWarmup,
  sessionBody,
} from "./lib/session.ts";
import { allWarnings, warn } from "./lib/warn.ts";
import { loadForecasts, sunsetAt, type Place } from "./lib/weather.ts";

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

/** Tunbridge Wells RFC, near enough for a sunset time and a forecast. */
const CLUB: Place = {
  latitude: 51.132,
  longitude: 0.263,
  timezone: "Europe/London",
  locale: "en-GB",
};

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
  "5-man Rhino — Phase 1": "5man_rhino_phase1.jpg",
  "5-man Rhino — Phase 2": "5man_rhino_phase2.jpg",
  "5-man Rhino — Phase 3": "5man_rhino_phase3.jpg",
};

/**
 * Club pitch-allocation zones, from the label positions used by
 * https://pitch.twrfc.com/ — percentages of the base map image. A session plan
 * marks its pitch by writing `![caption](pitch:2b)`, and the build pins our
 * marker on that zone, so a new week only changes the zone code in the plan.
 */
const PITCH_ZONES: Record<string, PitchZone> = {
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
  // Not one of the club's Sunday allocation codes: the floodlit training area,
  // the blue square below Pitch 4. Position estimated from the map itself.
  training: { left: 13, top: 37, pitch: "Training Area", half: "floodlit" },
};

/** Which age group the pin is labelled for — we are U14M. */
const OUR_TEAM = "U14M";

/** Per-session page metadata. Adding a session means adding its run-sheet to
 *  plans/ and an entry here; the page and its index card follow automatically. */
interface PlanMeta {
  /** ISO date (YYYY-MM-DD) of the session — drives which plan is "next". */
  date: string;
  /** Clock time that "+0" in the Plan table means, as HH:MM. The run sheet
   *  shows real times; the markdown stays relative so the whole session can be
   *  moved by changing this one field. */
  start?: string;
  h1: string;
  sub: string;
  sub2: string;
  crumb: string;
  card: string;
  badge: string;
  /** Marks the plan as a work in progress — banners the page and the index card. */
  draft?: boolean;
  /** Evening session at the club — adds sunset to the logistics. */
  eveningAtClub?: boolean;
}

const PLAN_META: Record<string, PlanMeta> = {
  "block1-week2-thur.md": {
    date: "2026-09-17",
    start: "18:45",
    h1: "Week 2 — Thursday",
    sub: "Scrum on the machine, non-contested, and exit kicks introduced for the backs.",
    sub2: "Thu 17 Sep 2026, 6.45–8.15pm",
    crumb: "Week 2 (Thu)",
    draft: true,
    eveningAtClub: true,
    card: "Run-sheet for the midweek session: scrum technique on the machine, exit kicks, and one game either side of the split.",
    badge: "17 Sep",
  },
  "block1-week2-sun.md": {
    date: "2026-09-13",
    start: "10:45",
    h1: "Week 2 — Sunday",
    sub: "First contested scrum — 8-man setup, the feed, and DSP off the base.",
    sub2: "Sun 13 Sep 2026, 10.45am–12.30pm",
    crumb: "Week 2 (Sun)",
    draft: true,
    card: "Run-sheet for the squad's first scrum session: contested 8-man scrum, DSP, and the tackle diamond.",
    badge: "13 Sep",
  },
  "block1-week1-thur.md": {
    date: "2026-09-10",
    start: "18:45",
    h1: "Week 1 — Thursday",
    sub: "Passing, Bang, and both sides of the lineout — the attacking shape and defending theirs.",
    sub2: "Thu 10 Sep 2026, 6.45–8.15pm",
    crumb: "Week 1 (Thu)",
    eveningAtClub: true,
    card: "Run-sheet for the midweek session: passing, lineout recap, and attacking and defending the lineout.",
    badge: "10 Sep",
  },
  "block1-week1-sun.md": {
    date: "2026-09-06",
    start: "10:45",
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

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

/** Live forecasts by ISO date, filled in before the pages are built. */
let forecasts = new Map<string, string>();

/** A `foo.md` in a code span -> the page it links to, if any. */
function linkFor(ref: string): string | undefined {
  const plan = ref.replace(/^plans\//, "");
  if (PAGE_FOR[ref]) return PAGE_FOR[ref];
  if (ref.endsWith(".md") && PLAN_META[plan]) return plan.replace(/\.md$/, ".html");
  return undefined;
}

function renderCtx(images: Record<string, string>): RenderCtx {
  return { images, linkFor, pitchZones: PITCH_ZONES, pinLabel: OUR_TEAM };
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
const IMG_DIR = "img";

/**
 * Diagrams are copied into the site as ordinary files and referenced, not
 * inlined as data URIs. They were inlined when pages were standalone files
 * shared through Drive; on a hosted site a same-origin image is cacheable,
 * lazily loadable, and keeps the HTML small enough to render at the ground.
 */
function copyImages(): Record<string, string> {
  const out: Record<string, string> = {};
  const dir = path.join(SITE_OUT, IMG_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const put = (key: string, fname: string) => {
    const src = path.join(ROOT, "claude", "images", "web", fname);
    if (!fs.existsSync(src)) {
      warn(`missing web-sized image ${fname}`);
      return;
    }
    fs.copyFileSync(src, path.join(dir, fname));
    out[key] = `${IMG_DIR}/${fname}`;
  };
  for (const [alt, fname] of Object.entries(DIAGRAMS)) put(alt, fname);
  put("__pitch_map__", "pitch-map.jpg");
  return out;
}

/** The generated logistics rows for a session: the two things the plan cannot
 *  state for itself. Order matters — sunset, then weather. */
function generatedRows(meta: PlanMeta): string[] {
  const rows: string[] = [];
  // Sunset only matters for an evening session at the club — it is the
  // difference between finishing in the light and finishing under floodlights.
  if (meta.eveningAtClub) {
    const sunset = sunsetAt(meta.date, CLUB);
    if (sunset) rows.push(`| **Sunset** | ${sunset} at the club |`);
    else warn(`no sunset could be computed for ${meta.date}`);
  }
  // Weather sits beside it: the other thing about the evening that the plan
  // cannot state for itself. Only for a session still ahead of us.
  const forecast = forecasts.get(meta.date);
  if (forecast) rows.push(`| **Weather** | ${forecast} |`);
  return rows;
}

// ---------------------------------------------------------------------- build
function buildPages(): Record<string, string> {
  const shell: Shell = {
    theme: read("tools/theme.css").trim(),
    footer:
      `Generated ${GENERATED} &middot; U14 Rugby coaching reference &middot; ` +
      `<a href="index.html">Back to index</a>`,
  };
  const diagrams = copyImages();
  const ctx = renderCtx(diagrams);
  const pages: Record<string, string> = {};
  const add = (name: string, o: PageOpts): void => {
    pages[name] = page(shell, o);
  };

  // ---- playbook
  add("playbook.html", {
    title: "Playbook &amp; Calls — U14 Rugby",
    h1: "Playbook &amp; Calls",
    sub: "Our calls and shapes — open play, backs moves, kicking, defence, lineout, scrum.",
    sub2: "",
    crumb: "Playbook",
    body: mdToHtml(stripProvenance(read("claude/playbook.md")), ctx),
  });

  // ---- coaching notes = age-group.md + coaching.md
  const ag = subAll(
    dropH1AndLead(read("claude/age-group.md")),
    [
      [
        "See `coaching.md` — How sessions should be coached for the contact-light " +
          "approach we take to the Thursday slot either way.",
        "See How sessions should be coached below for the contact-light approach " +
          "we take to the Thursday slot either way.",
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
    body: mdToHtml(ag + "\n\n" + co, renderCtx({})),
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
      renderCtx({}),
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
      renderCtx({}),
    ),
  });

  // ---- warm-up
  add("warmup.html", {
    title: "Warm-Up — U14 Rugby",
    h1: "The Standard Warm-Up",
    sub: "The five-minute player-led warm-up we open every session with — four phases, in lines off the try-line.",
    sub2: "",
    crumb: "Warm-up",
    body: mdToHtml(read("claude/warmup.md"), ctx),
  });

  // ---- calendar
  add("calendar.html", {
    title: "Calendar — U14 Rugby",
    h1: "Calendar",
    sub: "2026/27 season — fixtures and training dates.",
    sub2: "",
    crumb: "Calendar",
    body: mdToHtml(read("claude/calendar.md"), renderCtx({})),
  });

  // ---- laws
  add("laws.html", {
    title: "Laws of the Game — U14 Rugby",
    h1: "Laws of the Game",
    sub: "RFU age-grade law changes relevant to this squad, U13 → U14.",
    sub2: "",
    crumb: "Laws",
    body: mdToHtml(read("claude/laws.md"), renderCtx({})),
  });

  // ---- session run-sheets: one page per file in plans/
  const warmupMd = read("claude/warmup.md");
  const plansDir = path.join(ROOT, "plans");
  for (const fname of fs.readdirSync(plansDir).sort()) {
    if (!fname.endsWith(".md")) continue;
    const meta = PLAN_META[fname];
    if (!meta) {
      warn(`no page metadata for plans/${fname} — add it to PLAN_META`);
      continue;
    }
    const stem = fname.slice(0, -3);
    const planMd = planWithWarmup(read("plans/" + fname), warmupMd);
    add(`${stem}.html`, {
      title: `${meta.h1}${meta.draft ? " (Draft)" : ""} — U14 Rugby`,
      h1: meta.h1 + (meta.draft ? DRAFT_BADGE : ""),
      sub: meta.sub,
      sub2: meta.sub2,
      crumb: meta.crumb,
      extraJs: DETAIL_JS,
      body:
        (meta.draft ? DRAFT_NOTE + "\n" : "") +
        sessionBody(planMd, ctx, { start: meta.start, extraRows: generatedRows(meta) }),
    });
  }

  // ---- next.html: the session page itself, at a URL that never changes.
  //      A copy rather than a redirect, so the link people hold stays next.html.
  const next = pickNextPlan(plansDir);
  if (!next) {
    warn("no dated session plans — next.html not built");
  } else {
    const meta = PLAN_META[next.file]!;
    const permalink = `${next.file.slice(0, -3)}.html`;
    const note = next.upcoming
      ? `<p class="next-note">The next session. This page always shows whichever session is coming up; ` +
        `the permanent link for this one is <a href="${permalink}">${permalink}</a>.</p>`
      : `<p class="next-note">The most recent session (${meta.sub2}) — nothing later is written yet. ` +
        `Its permanent link is <a href="${permalink}">${permalink}</a>.</p>`;
    add("next.html", {
      title: `${meta.h1}${meta.draft ? " (Draft)" : ""} — U14 Rugby`,
      h1: meta.h1 + (meta.draft ? DRAFT_BADGE : ""),
      sub: meta.sub,
      sub2: meta.sub2,
      crumb: "Next session",
      extraJs: DETAIL_JS,
      body:
        (meta.draft ? DRAFT_NOTE + "\n" : "") +
        note +
        "\n" +
        sessionBody(planWithWarmup(read("plans/" + next.file), warmupMd), ctx, {
          start: meta.start,
          extraRows: generatedRows(meta),
        }),
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
  const warnings = allWarnings();
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log("  - " + w);
    return 1;
  }
  return 0;
}

forecasts = await loadForecasts(Object.values(PLAN_META), CLUB, GENERATED);
process.exit(main());
