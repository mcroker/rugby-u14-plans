/**
 * Where the build gets its content from, and how a team overrides a default.
 *
 * Three layers, most specific first:
 *
 *   teams/<slug>/   what this team wrote
 *   club/           what the whole club shares — the pitch map, the palette
 *   content/        the framework's defaults, inherited by every team
 *
 * A file found in an earlier layer replaces the same file in a later one, whole.
 * There is no merging: a team that wants a different coaching.md copies the
 * default into its own folder and edits it, and from then on it owns it.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { warn } from "./warn.ts";
import type { PitchZone } from "./md.ts";
import type { Place } from "./weather.ts";

export interface Club extends Place {
  name: string;
  shortName: string;
  allocationUrl: string;
  pitchMap: string;
  site: { title: string; sub: string; sub2: string };
}

export interface Team {
  /** Folder name, and the sub-directory it publishes to. */
  slug: string;
  name: string;
  title: string;
  sub: string;
  sub2: string;
  ageGroup: string;
  pinLabel: string;
  order: number;
  card: string;
}

const CLUB_DEFAULTS: Club = {
  name: "",
  shortName: "",
  latitude: 51.5,
  longitude: 0,
  timezone: "Europe/London",
  locale: "en-GB",
  allocationUrl: "",
  pitchMap: "pitch-map.jpg",
  site: { title: "Coaching Reference", sub: "", sub2: "" },
};

function readJson<T>(file: string, fallback: T, label: string): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
    // Keys beginning with _ are notes to whoever edits the file, not settings.
    for (const k of Object.keys(raw)) if (k.startsWith("_")) delete raw[k];
    return { ...fallback, ...(raw as object) } as T;
  } catch (err) {
    warn(`${label} could not be read: ${(err as Error).message}`);
    return fallback;
  }
}

export function loadClub(root: string): Club {
  return readJson(path.join(root, "club", "club.json"), CLUB_DEFAULTS, "club/club.json");
}

export function loadPitchZones(root: string): Record<string, PitchZone> {
  const raw = readJson<Record<string, unknown>>(
    path.join(root, "club", "pitch-zones.json"),
    {},
    "club/pitch-zones.json",
  );
  const zones: Record<string, PitchZone> = {};
  for (const [code, v] of Object.entries(raw)) {
    const z = v as Partial<PitchZone>;
    if (typeof z?.left !== "number" || typeof z?.top !== "number" || !z.pitch) {
      warn(`club/pitch-zones.json: zone '${code}' needs left, top and pitch`);
      continue;
    }
    zones[code] = { left: z.left, top: z.top, pitch: z.pitch, half: z.half ?? "" };
  }
  return zones;
}

/** Every team folder, in the order they should appear on the landing page. */
export function loadTeams(root: string): Team[] {
  const dir = path.join(root, "teams");
  if (!fs.existsSync(dir)) {
    warn("no teams/ folder — there is nothing to build");
    return [];
  }
  const teams: Team[] = [];
  for (const slug of fs.readdirSync(dir).sort()) {
    const teamDir = path.join(dir, slug);
    if (!fs.statSync(teamDir).isDirectory()) continue;
    const file = path.join(teamDir, "team.json");
    if (!fs.existsSync(file)) {
      warn(`teams/${slug} has no team.json — skipped`);
      continue;
    }
    const t = readJson<Partial<Team>>(file, {}, `teams/${slug}/team.json`);
    teams.push({
      slug,
      name: t.name ?? slug.toUpperCase(),
      title: t.title ?? `${t.name ?? slug.toUpperCase()} — Coaching Reference`,
      sub: t.sub ?? "",
      sub2: t.sub2 ?? "",
      ageGroup: t.ageGroup ?? slug,
      pinLabel: t.pinLabel ?? slug.toUpperCase(),
      order: t.order ?? 99,
      card: t.card ?? "",
    });
  }
  return teams.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

// ------------------------------------------------------------------- layering

/** The layers a file is looked for in, most specific first. */
export function layers(root: string, slug: string): string[] {
  return [path.join(root, "teams", slug), path.join(root, "club"), path.join(root, "content")];
}

/**
 * The first layer that has this file, or null. `rel` is a path within a layer,
 * e.g. `coaching.md` or `images/web/rhino.png`.
 */
export function resolve(root: string, slug: string, rel: string): string | null {
  for (const base of layers(root, slug)) {
    const p = path.join(base, rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Every file directly inside `dir` across all layers, keyed by filename, with
 * the most specific layer winning. This is what makes an override whole-file:
 * a team's coaching.md simply hides the default of the same name.
 */
export function overlay(root: string, slug: string, dir: string): Map<string, string> {
  const found = new Map<string, string>();
  // Walk least-specific first so a more specific layer overwrites it.
  for (const base of [...layers(root, slug)].reverse()) {
    const d = path.join(base, dir);
    if (!fs.existsSync(d)) continue;
    for (const name of fs.readdirSync(d).sort()) {
      if (name.startsWith(".")) continue;
      const p = path.join(d, name);
      if (!fs.statSync(p).isFile()) continue;
      found.set(name, p);
    }
  }
  return found;
}
