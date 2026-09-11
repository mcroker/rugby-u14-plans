/**
 * A small YAML-subset reader for the `---` block at the top of a markdown file.
 *
 * Deliberately not a YAML library: the build has no dependencies and no compile
 * step, so a plan can be previewed with nothing installed. What it supports is
 * what these files need — `key: value`, quoted or bare strings, booleans,
 * numbers, dates, and simple `- item` lists. Anything else is a warning, not a
 * silent misreading.
 */
import { warn } from "./warn.ts";

export type FMValue = string | number | boolean | string[];
export type FrontMatter = Record<string, FMValue>;

export interface Parsed {
  data: FrontMatter;
  /** The markdown below the frontmatter block. */
  body: string;
}

function coerce(raw: string): FMValue {
  const s = raw.trim();
  if (/^"(.*)"$/s.test(s)) return s.slice(1, -1);
  if (/^'(.*)'$/s.test(s)) return s.slice(1, -1);
  if (s === "true") return true;
  if (s === "false") return false;
  // A bare 18:45 is a time, not a number — leave anything with a colon alone.
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

/**
 * Split a file into its frontmatter and its body. A file with no `---` block
 * comes back with empty data and its whole text as the body, so this is safe to
 * run over every source file.
 */
export function parseFrontMatter(text: string, label: string): Parsed {
  // Tolerate a BOM and leading blank lines, but the marker must be the first
  // real line — a `---` further down is a horizontal rule.
  const src = text.replace(/^﻿/, "");
  if (!/^---\s*\n/.test(src)) return { data: {}, body: text };

  const lines = src.split("\n");
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) {
    warn(`[${label}] frontmatter opens with --- but is never closed`);
    return { data: {}, body: text };
  }

  const data: FrontMatter = {};
  let listKey: string | null = null;
  for (let i = 1; i < end; i++) {
    const line = lines[i]!;
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item) {
      if (!listKey) {
        warn(`[${label}] frontmatter list item with no key: ${line.trim()}`);
        continue;
      }
      (data[listKey] as string[]).push(String(coerce(item[1]!)));
      continue;
    }

    const kv = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) {
      warn(`[${label}] frontmatter line not understood: ${line.trim()}`);
      continue;
    }
    const key = kv[1]!;
    const rest = kv[2]!.trim();
    if (!rest) {
      // `key:` with items below it
      data[key] = [];
      listKey = key;
      continue;
    }
    data[key] = coerce(rest);
    listKey = null;
  }

  return { data, body: lines.slice(end + 1).join("\n").replace(/^\n+/, "") };
}

// ------------------------------------------------------------------ accessors
// Typed reads that warn rather than throwing, so one bad field does not stop the
// build before it has reported everything else wrong with the file.

export function str(
  data: FrontMatter,
  key: string,
  label: string,
  fallback?: string,
): string {
  const v = data[key];
  if (v === undefined) {
    if (fallback !== undefined) return fallback;
    warn(`[${label}] missing required field '${key}'`);
    return "";
  }
  if (Array.isArray(v)) {
    warn(`[${label}] field '${key}' is a list, expected a single value`);
    return fallback ?? "";
  }
  return String(v);
}

export function optStr(data: FrontMatter, key: string): string | undefined {
  const v = data[key];
  if (v === undefined || Array.isArray(v)) return undefined;
  return String(v);
}

export function bool(data: FrontMatter, key: string, fallback: boolean): boolean {
  const v = data[key];
  if (v === undefined) return fallback;
  return v === true || v === "true";
}

export function num(data: FrontMatter, key: string, fallback: number): number {
  const v = data[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return fallback;
}
