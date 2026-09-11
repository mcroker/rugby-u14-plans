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

/** Heading -> anchor id, so other pages can deep-link to a section. */
function slugify(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/[*`_]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

function uniqueSlug(text: string, seen: Set<string>): string {
  const base = slugify(text);
  let id = base;
  let n = 2;
  while (seen.has(id)) id = `${base}-${n++}`;
  seen.add(id);
  return id;
}

// ------------------------------------------------------------------- block md

/** Convert the markdown subset used by these sources: h1-h4, tables, lists,
 *  images, paragraphs, rules, and inline bold/italic/code/links. */
function mdToHtml(md: string, images: Record<string, string> = {}): string {
  const seenIds = new Set<string>();
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
      const id = uniqueSlug(heading[2]!, seenIds);
      out.push(`<h${lvl} id="${id}">${inline(heading[2]!)}</h${lvl}>`);
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
              `<img alt="${escAttr(alt)}" src="${map}" loading="lazy" />\n` +
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
        out.push(`<img alt="${escAttr(alt)}" src="${src}" loading="lazy" />`);
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



// --------------------------------------------------------------------- sun
/** Tunbridge Wells RFC, near enough for a sunset time. */
const CLUB_LAT = 51.132;
const CLUB_LON = 0.263;

/**
 * Sunset at the club on an ISO date, as Europe/London wall-clock time.
 * The standard sunrise equation; the timezone (and therefore BST) is left to
 * Intl rather than reimplemented. Returns null if the sun does not set, which
 * cannot happen at this latitude but keeps the maths honest.
 */
function sunsetAtClub(isoDate: string): string | null {
  const rad = Math.PI / 180;
  const jDate = Date.parse(`${isoDate}T00:00:00Z`) / 86400000 + 2440587.5;
  const n = Math.ceil(jDate - 2451545.0 + 0.0008);
  const jStar = n + CLUB_LON / 360; // east longitude is positive here
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C =
    1.9148 * Math.sin(M * rad) +
    0.02 * Math.sin(2 * M * rad) +
    0.0003 * Math.sin(3 * M * rad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit =
    2451545.0 + jStar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const sinDec = Math.sin(lambda * rad) * Math.sin(23.44 * rad);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosOmega =
    (Math.sin(-0.833 * rad) - Math.sin(CLUB_LAT * rad) * sinDec) /
    (Math.cos(CLUB_LAT * rad) * cosDec);
  if (cosOmega < -1 || cosOmega > 1) return null;
  const omega = Math.acos(cosOmega) / rad;
  const jSet = jTransit + omega / 360;
  const when = new Date((jSet - 2440587.5) * 86400000);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(when);
}

// ----------------------------------------------------------------- weather
/**
 * Forecast for a session, fetched once at build time from Open-Meteo (no key,
 * no dependency) and keyed by the session's ISO date. Every plan gets one, the
 * way every evening-at-the-club plan gets a sunset: what a coach checks the
 * night before is the weather, and the daily rebuild keeps it current.
 *
 * Only sessions inside the forecast horizon are fetched — a past session's page
 * is an archive and should not claim to know what the weather will be.
 */
const forecasts = new Map<string, string>();

/** WMO weather codes, in the words a coach would use. */
const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorms",
  96: "Thunderstorms, hail",
  99: "Thunderstorms, hail",
};

/** Days ahead Open-Meteo will forecast. */
const FORECAST_DAYS = 15;

/** The session hours a forecast should describe: the start hour and the two
 *  after it, which covers a 90-minute session whichever end it runs over. */
function sessionHours(start: string | undefined): number[] {
  const h = Number((start ?? "18:00").slice(0, 2));
  return [h, h + 1, h + 2].filter((n) => n >= 0 && n <= 23);
}

/**
 * Fetch the forecast for every planned session inside the horizon, in one
 * request. Never fails the build: no network (a local preview on a train, say)
 * simply means no Weather row, which is better than a broken build or a stale
 * number baked into the markdown.
 */
async function loadForecasts(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + FORECAST_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  const wanted = Object.values(PLAN_META)
    .filter((m) => m.date >= today && m.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!wanted.length) return;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${CLUB_LAT}&longitude=${CLUB_LON}` +
    "&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m" +
    "&wind_speed_unit=mph&timezone=Europe%2FLondon" +
    `&start_date=${wanted[0]!.date}&end_date=${wanted[wanted.length - 1]!.date}`;

  let hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    hourly = ((await res.json()) as { hourly: typeof hourly }).hourly;
    if (!hourly?.time?.length) throw new Error("no hourly data");
  } catch (err) {
    console.log(`no weather forecast (${(err as Error).message}) — Weather rows omitted`);
    return;
  }

  const at = new Map(hourly.time.map((t, i) => [t, i]));
  for (const meta of wanted) {
    const idx = sessionHours(meta.start)
      .map((h) => at.get(`${meta.date}T${String(h).padStart(2, "0")}:00`))
      .filter((i): i is number => i !== undefined);
    if (!idx.length) continue;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const temp = Math.round(mean(idx.map((i) => hourly.temperature_2m[i]!)));
    const wind = Math.round(mean(idx.map((i) => hourly.wind_speed_10m[i]!)));
    const rain = Math.max(...idx.map((i) => hourly.precipitation_probability[i]!));
    // The most common condition across the session, not the worst hour of it —
    // one drizzly hour at the end should not be reported as a wet session; the
    // rain chance beside it is what carries that risk.
    const counts = new Map<number, number>();
    for (const i of idx) {
      const c = hourly.weather_code[i]!;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const code = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
    const cond = WMO[code] ?? "Mixed";
    const window = `${String(sessionHours(meta.start)[0]).padStart(2, "0")}:00`;
    forecasts.set(
      meta.date,
      `${cond}, ${temp}°C, wind ${wind} mph, ${rain}% chance of rain. ` +
        `*(From ${window}; forecast as of ${GENERATED}.)*`,
    );
  }
}

// -------------------------------------------------------------- session page
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

/**
 * Rows of the FIRST table in a section only. A section can hold more than one
 * table — the Plan section carries the run sheet and, below it, a coach
 * allocation — and the run sheet is always the first.
 */
function firstTableRows(section: string): string[] {
  const rows: string[] = [];
  let started = false;
  for (const raw of section.split("\n")) {
    const l = raw.trim();
    if (l.startsWith("|")) {
      rows.push(l);
      started = true;
    } else if (started && l) {
      break; // prose after the table — a later table is a different table
    }
  }
  return rows;
}

function splitCells(row: string): string[] {
  return row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

/**
 * First sentence only. A timeline block carries the instruction; the caveats
 * that follow it stay in the activity's own section below — so Setup and
 * Coaching Points should lead with what a coach needs in their hand.
 */
function firstSentence(text: string): string {
  // Allows the sentence to end inside bold, as "**...Jeff.** (rest)" does.
  const m = /\.(\*\*)?\s+(?=[A-Z*(])/.exec(text);
  if (!m) return text;
  return text.slice(0, m.index + 1 + (m[1]?.length ?? 0));
}


/**
 * The player-led warm-up written into every plan page as a normal Activities
 * entry, built from `warmup.md` so there is still one source for it. Without
 * this, a plan's first block could only point off to another page.
 */
function warmupEntry(): string {
  const wu = read("claude/warmup.md");
  const kit = /^\*\*Kit:\*\*\s*(.*)$/m.exec(wu)?.[1] ?? "";
  const quality = /^- \*\*Quality targets[^:]*:\*\*\s*(.*)$/m.exec(wu)?.[1] ?? "";
  // The table only — the prose around it on the warm-up page is context for
  // that page, not instruction for a coach holding a run-sheet.
  const phases = tableRows(mdSection(wu, "The four phases")).join("\n");
  if (!kit || !quality || !phases) {
    warn("warm-up entry: warmup.md no longer has the Kit line, quality targets or phases table");
  }
  return [
    "### Player-led warm-up",
    "",
    "**Groups:** the session's two teams, in lines — one side bibbed.",
    "",
    `**Coaching Points:** ${quality}`,
    "",
    `**Setup:** the squad in three or four lines on the try-line, working out and back. **Kit:** ${kit}`,
    "",
    "**Description:** the same four phases in the same order every session, led by one of the players — see the standard warm-up for why it never changes.",
    "",
    phases,
    "",
  ].join("\n");
}

/** An Activities entry from a plan: its anchor, what you need to run it, and
 *  the detail behind it. */
interface Activity {
  id: string;
  title: string;
  /** How the squad is split for this activity — a few words, no more. */
  groups: string;
  setup: string;
  points: string;
  description: string;
  progressions: string;
}

/** Skip a leading bare cross-reference ("see `activities.md`.") — useless on
 *  its own on a timeline block — and take the first real sentence after it. */
function runInfo(text: string): string {
  // The sentence ends at a full stop followed by a capital or the end — not at
  // the dot inside `activities.md`.
  // A cross-reference on its own says nothing on a timeline block — drop it and
  // let the block fall back to the cues.
  const t = text.replace(/^see\b[\s\S]*?\.(?=\s+[A-Z*(]|\s*$)/i, "").trim();
  return t ? firstSentence(t) : "";
}

/** Parse a plan's "## Activities" section into its "### " entries. */
function planActivities(md: string): Activity[] {
  const section = mdSection(md, "Activities");
  const entries: Array<{ title: string; lines: string[] }> = [];
  for (const raw of section.split("\n")) {
    const h = /^###\s+(.*)$/.exec(raw.trim());
    if (h) entries.push({ title: h[1]!, lines: [] });
    else if (entries.length) entries[entries.length - 1]!.lines.push(raw);
  }

  const label = (lines: string[], name: string): string => {
    const start = lines.findIndex((l) => l.trim().startsWith(`**${name}`));
    if (start === -1) return "";
    const head = lines[start]!.trim().replace(new RegExp(`^\\*\\*${name}:?\\*\\*:?\\s*`), "");
    const rest: string[] = head ? [head] : [];
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i]!.trim();
      if (/^\*\*[A-Z]/.test(l) || l.startsWith("###")) break;
      rest.push(lines[i]!);
    }
    return rest.join("\n").trim();
  };

  const acts: Activity[] = entries.map((e) => ({
    id: "",
    title: e.title,
    groups: label(e.lines, "Groups"),
    setup: label(e.lines, "Setup"),
    points: label(e.lines, "Coaching Points"),
    description: label(e.lines, "Description"),
    progressions: label(e.lines, "Progressions"),
  }));

  // ids must match the ones mdToHtml mints for the same page
  const pageSeen = new Set<string>();
  const used = new Set<string>();
  for (const line of md.split("\n")) {
    const h = /^(#{1,4})\s+(.*)$/.exec(line.trim());
    if (!h) continue;
    const id = uniqueSlug(h[2]!, pageSeen);
    const hit = acts.find((a) => a.title === h[2]! && !used.has(a.title));
    if (hit) {
      hit.id = id;
      used.add(hit.title);
    }
  }
  return acts;
}

const STOP = new Set(["the", "a", "and", "of", "in", "for", "to", "on", "with", "at", "into"]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Best-matching Activities entry for a run-sheet row, or null if none is close. */
function matchActivity(rowTitle: string, acts: Activity[]): Activity | null {
  const rw = words(rowTitle);
  if (!rw.length) return null;
  let best: Activity | null = null;
  let bestScore = 0;
  for (const a of acts) {
    if (!a.id) continue;
    const aw = new Set(words(a.title));
    const hits = rw.filter((w) => aw.has(w)).length;
    const score = hits / rw.length;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return bestScore >= 0.4 ? best : null;
}

interface Slot {
  start: number;
  mins: number;
  tag: string;
  title: string;
  focus: string;
}

/**
 * The run sheet as a timeline: time runs down the page, and a stretch of the
 * session where several things happen at once splits into that many columns.
 * Each block carries what you need to run it — setup and cues, taken from the
 * plan's own Activities entry — and a deep link into that entry.
 */
/** "18:45" + 22 -> "19:07". */
function clockAt(start: string, plus: number): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(start.trim());
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]) + plus;
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function timeline(planSection: string, acts: Activity[], startClock?: string): string {
  const rows = firstTableRows(planSection).slice(2); // drop header + separator
  const slots: Slot[] = [];
  let unparsed = 0;

  for (const r of rows) {
    const c = splitCells(r);
    if (c.length < 3) continue;
    const m = /^\+(\d+),\s*(\d+)\s*min\s*(?:\*\((.+?)\)\*)?/.exec(c[0]!);
    if (!m) {
      unparsed += 1;
      continue;
    }
    slots.push({
      start: Number(m[1]),
      mins: Number(m[2]),
      tag: m[3] ?? "",
      title: c[1]!,
      focus: c[2]!,
    });
  }

  if (!slots.length) {
    warn("run sheet: no rows could be read as '+start, N min'");
    return "";
  }
  if (unparsed) {
    warn(`run sheet: ${unparsed} row(s) did not start '+N, N min' and were dropped`);
  }

  const starts = [...new Set(slots.map((s) => s.start))].sort((a, b) => a - b);
  const out: string[] = ['<div class="timeline">'];

  for (const start of starts) {
    const group = slots.filter((s) => s.start === start);
    const mins = Math.max(...group.map((g) => g.mins));
    const parallel = group.length > 1;
    out.push(`<div class="seg${parallel ? " seg-split" : ""}">`);
    const clock = startClock ? clockAt(startClock, start) : null;
    out.push(
      `  <div class="seg-time"><span class="at">${clock ?? `+${start}`}</span>` +
        `<span class="dur">${mins} min</span></div>`,
    );
    out.push(`  <div class="seg-tracks" style="--n:${group.length};--mins:${mins}">`);
    for (const g of group) {
      const act = matchActivity(g.title, acts);
      const tag = g.tag ? `<span class="track-tag">${inline(g.tag)}</span>` : "";
      const dur = g.mins !== mins ? `<span class="track-tag">${g.mins} min</span>` : "";
      // What you need to run it, not what it is: who is in it, how it is set
      // up, then the cues. Groups leads because splitting the squad is the
      // first thing that has to happen and the slowest to fix if it is wrong.
      const run: string[] = [];
      if (act?.groups) run.push(`<div class="track-run"><b>Groups</b> ${inline(act.groups)}</div>`);
      if (act?.setup) run.push(`<div class="track-run"><b>Set up</b> ${inline(runInfo(act.setup))}</div>`);
      if (act?.points) run.push(`<div class="track-run"><b>Call</b> ${inline(runInfo(act.points))}</div>`);
      if (!run.length) run.push(`<div class="track-run">${inline(g.focus)}</div>`);
      // The detail lives further down the same page.
      const details = act
        ? `<button class="track-details" type="button" data-target="${act.id}">Details</button>`
        : "";
      out.push(
        `    <div class="track"><div class="track-title">${inline(g.title)}</div>` +
          `${tag}${dur}${run.join("")}${details}</div>`,
      );
    }
    out.push("  </div>");
    out.push("</div>");
  }
  out.push("</div>");
  return out.join("\n");
}


/**
 * One empty modal per session page, filled on click by cloning the activity's
 * own section out of the page below. Nothing is duplicated in the HTML: the
 * detail exists once, and the modal is a view onto it.
 */
const DETAIL_MODAL = `
<dialog id="detail-modal" class="detail">
  <div class="detail-head"><strong></strong>
    <button class="detail-x" type="button" data-close aria-label="Close">&times;</button></div>
  <div class="detail-body"></div>
  <div class="detail-foot"><a class="detail-jump" href="#" data-close>Show it in the plan</a>
    <button class="detail-done" type="button" data-close>Close</button></div>
</dialog>`;

const DETAIL_JS = `
function openTarget() {
  var id = location.hash.slice(1);
  if (!id) return;
  var el = document.getElementById(id);
  if (el && el.tagName === "DETAILS") el.open = true;
}
window.addEventListener("hashchange", openTarget);
openTarget();

document.addEventListener("click", function (e) {
  var acc = e.target.closest("[data-acc]");
  if (acc) {
    var open = acc.getAttribute("data-acc") === "open";
    var all = document.querySelectorAll("details.activity");
    for (var i = 0; i < all.length; i++) all[i].open = open;
    return;
  }

  var btn = e.target.closest("[data-target]");
  if (btn) {
    var id = btn.getAttribute("data-target");
    var sec = document.getElementById(id);
    var dlg = document.getElementById("detail-modal");
    if (!sec || !dlg || !dlg.showModal) return;
    var sum = sec.querySelector("summary");
    dlg.querySelector(".detail-head strong").textContent = sum ? sum.textContent : id;
    var body = dlg.querySelector(".detail-body");
    body.innerHTML = "";
    for (var j = 0; j < sec.children.length; j++) {
      if (sec.children[j].tagName !== "SUMMARY") body.appendChild(sec.children[j].cloneNode(true));
    }
    // The map has no section to jump to — it exists only for this modal.
    var jump = dlg.querySelector(".detail-jump");
    if (sec.classList.contains("offscreen")) {
      jump.hidden = true;
    } else {
      jump.hidden = false;
      jump.setAttribute("href", "#" + id);
    }
    body.scrollTop = 0;
    dlg.showModal();
    // Freeze the page behind it: the modal scrolls if it has anywhere to go,
    // and the page never scrolls underneath. Escape and the backdrop both
    // fire "close", so the lock is lifted there rather than per close button.
    document.documentElement.classList.add("modal-open");
    if (!dlg.dataset.lock) {
      dlg.dataset.lock = "1";
      dlg.addEventListener("close", function () {
        document.documentElement.classList.remove("modal-open");
      });
    }
    return;
  }

  if (e.target.closest("[data-close]")) {
    var openDlg = e.target.closest("dialog");
    if (openDlg) openDlg.close();
    return;
  }
  if (e.target.tagName === "DIALOG") e.target.close();
});
`;

/** A plan's markdown with the standard warm-up spliced in as an Activities entry. */
function planWithWarmup(md: string): string {
  const entry = warmupEntry();
  // End of the Activities section — i.e. the next `## ` heading after it,
  // whatever that happens to be. Anchoring on `## Notes` put the warm-up after
  // the Review on any plan that ordered the two the other way round.
  const acts = md.indexOf("\n## Activities");
  if (acts === -1) return `${md}\n\n${entry}`;
  const next = md.indexOf("\n## ", acts + 1);
  return next === -1
    ? `${md}\n\n${entry}`
    : `${md.slice(0, next)}\n\n${entry}${md.slice(next)}`;
}

/**
 * Render the detail below the timeline, with each activity as its own collapsed
 * accordion. Long run-sheets are unreadable as one wall; collapsed, the page is
 * a contents list you open a piece at a time.
 */
function detailAccordions(
  detailMd: string,
  images: Record<string, string>,
  acts: Activity[],
): string {
  const lines = detailMd.split("\n");
  const out: string[] = [];
  const buf: string[] = [];
  let first = true;
  const flush = () => {
    if (buf.length) {
      out.push(mdToHtml(buf.join("\n"), images));
      buf.length = 0;
    }
  };

  let i = 0;
  while (i < lines.length) {
    const h = /^###\s+(.*)$/.exec(lines[i]!.trim());
    if (!h) {
      buf.push(lines[i]!);
      i += 1;
      continue;
    }
    flush();
    if (first) {
      out.push(
        '<div class="acc-tools">' +
          '<button type="button" data-acc="open">Expand all</button>' +
          '<button type="button" data-acc="close">Collapse all</button>' +
          "</div>",
      );
      first = false;
    }
    const title = h[1]!;
    i += 1;
    const body: string[] = [];
    while (i < lines.length && !/^#{2,3}\s/.test(lines[i]!.trim())) {
      body.push(lines[i]!);
      i += 1;
    }
    const id = acts.find((a) => a.title === title)?.id ?? slugify(title);
    out.push(
      `<details class="activity" id="${id}"><summary>${inline(title)}</summary>` +
        mdToHtml(body.join("\n"), images) +
        "</details>",
    );
  }
  flush();
  return out.join("\n");
}

/**
 * One page per session: logistics folded away, the run sheet as a timeline,
 * and the full detail below it — so the thing you need at the ground is at the
 * top and everything else is a jump down the same page, not another request.
 */
function sessionBody(md: string, images: Record<string, string>, meta: PlanMeta): string {
  const allRows = tableRows(mdSection(md, "Session details"));
  // The objective leads the page in its own right — it is what the session is
  // for, not a logistical detail to be folded away with the kit list.
  const objectiveRow = allRows.find((r) => r.includes("**Session objective**"));
  const objective = objectiveRow
    ? `<h2>Objective</h2>\n<p class="objective">${inline(splitCells(objectiveRow)[1] ?? "")}</p>`
    : "";
  const detailsRows = allRows.filter((r) => r !== objectiveRow);
  // Sunset only matters for an evening session at the club — it is the
  // difference between finishing in the light and finishing under floodlights.
  if (meta.eveningAtClub) {
    const sunset = sunsetAtClub(meta.date);
    if (sunset) detailsRows.push(`| **Sunset** | ${sunset} at the club |`);
    else warn(`no sunset could be computed for ${meta.date}`);
  }
  // Weather sits beside it: the other thing about the evening that the plan
  // cannot state for itself. Only for a session still ahead of us — see
  // loadForecasts.
  const forecast = forecasts.get(meta.date);
  if (forecast) detailsRows.push(`| **Weather** | ${forecast} |`);
  // The map is a tap away from the Location row rather than sitting open in the
  // logistics — it is the one thing you want once, on arrival.
  const pitch = /^!\[[^\]]*\]\(pitch:[^)]+\)$/m.exec(md)?.[0] ?? "";
  const MAP_TOKEN = "@@MAPBUTTON@@";
  const rowsWithMap = pitch
    ? detailsRows.map((r) =>
        r.includes("**Location**")
          ? r.replace(/\s*\|\s*$/, ` ${MAP_TOKEN} |`)
          : r,
      )
    : detailsRows;
  const logistics = detailsRows.length
    ? '<details class="logistics"><summary>Logistics — when, where, who, kit</summary>' +
      mdToHtml(rowsWithMap.join("\n"), images).replace(
        MAP_TOKEN,
        '<button class="map-btn" type="button" data-target="pitch-map">Map</button>',
      ) +
      "</details>"
    : "";
  // The cone layout, for whoever gets to the ground first. Optional — a plan
  // without the section simply doesn't get the accordion.
  const setupMd = mdSection(md, "Initial setup") || mdSection(md, "Initial Setup");
  const setup = setupMd
    ? '<details class="logistics"><summary>Initial setup — cones, for the first coach there</summary>' +
      '<div class="pad-body">' +
      mdToHtml(setupMd, images) +
      "</div></details>"
    : "";
  const mapSection = pitch
    ? '<details id="pitch-map" class="offscreen" hidden><summary>Where we are</summary>' +
      mdToHtml(pitch, images) +
      "</details>"
    : "";

  // Everything the timeline doesn't already say: the notes under the Plan
  // table, then the activities, notes and review.
  const planSection = mdSection(md, "Plan");
  const firstTable = firstTableRows(planSection);
  const planExtra = planSection
    .split("\n")
    .filter((l) => !firstTable.includes(l.trim()))
    .join("\n")
    .trim();
  const from = md.indexOf("\n## Activities");
  const rest = from === -1 ? "" : md.slice(from);
  const detailMd = [planExtra, rest].filter(Boolean).join("\n\n");
  const acts = planActivities(detailMd);

  return [
    objective,
    logistics,
    setup,
    "<h2>Run sheet</h2>",
    timeline(planSection, acts, meta.start),
    detailAccordions(detailMd, images, acts),
    mapSection,
    DETAIL_MODAL,
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
  extraJs?: string;
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
<footer class="page-foot">${foot}</footer>${o.extraJs ? `\n<script>${o.extraJs}</script>` : ""}
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
  const diagrams = copyImages();
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
    const stem = fname.slice(0, -3);
    const planMd = planWithWarmup(read("plans/" + fname));
    add(`${stem}.html`, {
      title: `${meta.h1}${meta.draft ? " (Draft)" : ""} — U14 Rugby`,
      h1: meta.h1 + (meta.draft ? DRAFT_BADGE : ""),
      sub: meta.sub,
      sub2: meta.sub2,
      crumb: meta.crumb,
      extraJs: DETAIL_JS,
      body: (meta.draft ? DRAFT_NOTE + "\n" : "") + sessionBody(planMd, diagrams, meta),
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
        sessionBody(planWithWarmup(read("plans/" + next.file)), diagrams, meta),
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
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log("  - " + w);
    return 1;
  }
  return 0;
}

await loadForecasts();
process.exit(main());
