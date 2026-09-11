/**
 * A session page: logistics folded away, the run sheet as a timeline, and the
 * full detail below it — so the thing you need at the ground is at the top and
 * everything else is a jump down the same page, not another request.
 */
import { inline, mdToHtml, slugify, uniqueSlug, type RenderCtx } from "./md.ts";
import { warn } from "./warn.ts";

// ------------------------------------------------------------------ markdown

/** Pull one "## Heading" section out of a plan's markdown. */
export function mdSection(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return "";
  let end = start + 1;
  while (end < lines.length && !lines[end]!.startsWith("## ")) end += 1;
  return lines.slice(start + 1, end).join("\n").trim();
}

/** Table rows only — drops prose, notes and images around a markdown table. */
export function tableRows(section: string): string[] {
  return section.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
}

/**
 * Rows of the FIRST table in a section only. A section can hold more than one
 * table — the Plan section carries the run sheet and, below it, a coach
 * allocation — and the run sheet is always the first.
 */
export function firstTableRows(section: string): string[] {
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

export function splitCells(row: string): string[] {
  return row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

/**
 * First sentence only. A timeline block carries the instruction; the caveats
 * that follow it stay in the activity's own section below — so Setup and
 * Coaching Points should lead with what a coach needs in their hand.
 */
export function firstSentence(text: string): string {
  // Allows the sentence to end inside bold, as "**...Jeff.** (rest)" does.
  const m = /\.(\*\*)?\s+(?=[A-Z*(])/.exec(text);
  if (!m) return text;
  return text.slice(0, m.index + 1 + (m[1]?.length ?? 0));
}

// ------------------------------------------------------------------ warm-up

/**
 * The player-led warm-up written into every plan page as a normal Activities
 * entry, built from the warm-up doc so there is still one source for it.
 * Without this, a plan's first block could only point off to another page.
 */
export function warmupEntry(warmupMd: string): string {
  const kit = /^\*\*Kit:\*\*\s*(.*)$/m.exec(warmupMd)?.[1] ?? "";
  const quality = /^- \*\*Quality targets[^:]*:\*\*\s*(.*)$/m.exec(warmupMd)?.[1] ?? "";
  // The table only — the prose around it on the warm-up page is context for
  // that page, not instruction for a coach holding a run-sheet.
  const phases = tableRows(mdSection(warmupMd, "The four phases")).join("\n");
  if (!kit || !quality || !phases) {
    warn("warm-up entry: the warm-up doc no longer has the Kit line, quality targets or phases table");
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

/** A plan's markdown with the standard warm-up spliced in as an Activities entry. */
export function planWithWarmup(md: string, warmupMd: string): string {
  const entry = warmupEntry(warmupMd);
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

// --------------------------------------------------------------- activities

/** An Activities entry from a plan: its anchor, what you need to run it, and
 *  the detail behind it. */
export interface Activity {
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
export function planActivities(md: string): Activity[] {
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

// ----------------------------------------------------------------- timeline

interface Slot {
  start: number;
  mins: number;
  tag: string;
  title: string;
  focus: string;
}

/** "18:45" + 22 -> "19:07". */
export function clockAt(start: string, plus: number): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(start.trim());
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]) + plus;
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The run sheet as a timeline: time runs down the page, and a stretch of the
 * session where several things happen at once splits into that many columns.
 * Each block carries what you need to run it — setup and cues, taken from the
 * plan's own Activities entry — and a deep link into that entry.
 */
function timeline(
  planSection: string,
  acts: Activity[],
  ctx: RenderCtx,
  startClock?: string,
): string {
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
      const tag = g.tag ? `<span class="track-tag">${inline(g.tag, ctx)}</span>` : "";
      const dur = g.mins !== mins ? `<span class="track-tag">${g.mins} min</span>` : "";
      // What you need to run it, not what it is: who is in it, how it is set
      // up, then the cues. Groups leads because splitting the squad is the
      // first thing that has to happen and the slowest to fix if it is wrong.
      const run: string[] = [];
      if (act?.groups) run.push(`<div class="track-run"><b>Groups</b> ${inline(act.groups, ctx)}</div>`);
      if (act?.setup) run.push(`<div class="track-run"><b>Set up</b> ${inline(runInfo(act.setup), ctx)}</div>`);
      if (act?.points) run.push(`<div class="track-run"><b>Call</b> ${inline(runInfo(act.points), ctx)}</div>`);
      if (!run.length) run.push(`<div class="track-run">${inline(g.focus, ctx)}</div>`);
      // The detail lives further down the same page.
      const details = act
        ? `<button class="track-details" type="button" data-target="${act.id}">Details</button>`
        : "";
      out.push(
        `    <div class="track"><div class="track-title">${inline(g.title, ctx)}</div>` +
          `${tag}${dur}${run.join("")}${details}</div>`,
      );
    }
    out.push("  </div>");
    out.push("</div>");
  }
  out.push("</div>");
  return out.join("\n");
}

// -------------------------------------------------------------------- modal

/**
 * One empty modal per session page, filled on click by cloning the activity's
 * own section out of the page below. Nothing is duplicated in the HTML: the
 * detail exists once, and the modal is a view onto it.
 */
export const DETAIL_MODAL = `
<dialog id="detail-modal" class="detail">
  <div class="detail-head"><strong></strong>
    <button class="detail-x" type="button" data-close aria-label="Close">&times;</button></div>
  <div class="detail-body"></div>
  <div class="detail-foot"><a class="detail-jump" href="#" data-close>Show it in the plan</a>
    <button class="detail-done" type="button" data-close>Close</button></div>
</dialog>`;

export const DETAIL_JS = `
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

// ---------------------------------------------------------------- accordions

/**
 * Render the detail below the timeline, with each activity as its own collapsed
 * accordion. Long run-sheets are unreadable as one wall; collapsed, the page is
 * a contents list you open a piece at a time.
 */
function detailAccordions(detailMd: string, ctx: RenderCtx, acts: Activity[]): string {
  const lines = detailMd.split("\n");
  const out: string[] = [];
  const buf: string[] = [];
  let first = true;
  const flush = () => {
    if (buf.length) {
      out.push(mdToHtml(buf.join("\n"), ctx));
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
      `<details class="activity" id="${id}"><summary>${inline(title, ctx)}</summary>` +
        mdToHtml(body.join("\n"), ctx) +
        "</details>",
    );
  }
  flush();
  return out.join("\n");
}

// --------------------------------------------------------------------- page

export interface SessionOpts {
  /** Clock time that "+0" in the Plan table means, as HH:MM. */
  start?: string;
  /**
   * Extra logistics rows as markdown table rows, appended in order. These are
   * the generated ones — Sunset, Weather — which the plan cannot state itself.
   */
  extraRows?: string[];
}

export function sessionBody(md: string, ctx: RenderCtx, opts: SessionOpts): string {
  const allRows = tableRows(mdSection(md, "Session details"));
  // The objective leads the page in its own right — it is what the session is
  // for, not a logistical detail to be folded away with the kit list.
  const objectiveRow = allRows.find((r) => r.includes("**Session objective**"));
  const objective = objectiveRow
    ? `<h2>Objective</h2>\n<p class="objective">${inline(splitCells(objectiveRow)[1] ?? "", ctx)}</p>`
    : "";
  const detailsRows = allRows.filter((r) => r !== objectiveRow);
  detailsRows.push(...(opts.extraRows ?? []));
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
      mdToHtml(rowsWithMap.join("\n"), ctx).replace(
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
      mdToHtml(setupMd, ctx) +
      "</div></details>"
    : "";
  const mapSection = pitch
    ? '<details id="pitch-map" class="offscreen" hidden><summary>Where we are</summary>' +
      mdToHtml(pitch, ctx) +
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
    timeline(planSection, acts, ctx, opts.start),
    detailAccordions(detailMd, ctx, acts),
    mapSection,
    DETAIL_MODAL,
  ].join("\n");
}
