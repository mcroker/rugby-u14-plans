/**
 * The markdown subset used by these sources: h1-h4, tables, lists, images,
 * paragraphs, rules, and inline bold/italic/code/links.
 *
 * Everything that varies by team or club — which docs have pages, the club's
 * pitch zones, the label on the map pin — arrives in a RenderCtx rather than
 * being read from module scope, so one process can render several teams.
 */
import { warn } from "./warn.ts";

/** A zone on the club's pitch-allocation map, as percentages of the base image. */
export interface PitchZone {
  left: number;
  top: number;
  pitch: string;
  half: string;
}

export interface RenderCtx {
  /** Image key (a filename, or `__pitch_map__`) -> its path within the site. */
  images: Record<string, string>;
  /** A `foo.md` mentioned in a code span -> the page it should link to, if any. */
  linkFor: (ref: string) => string | undefined;
  /** The club's allocation zones, for `![caption](pitch:2b)`. */
  pitchZones: Record<string, PitchZone>;
  /** What the map pin is labelled — this team's code on the allocation map. */
  pinLabel: string;
}

/** A context that renders plain markdown: no images, links or map. */
export function plainCtx(): RenderCtx {
  return { images: {}, linkFor: () => undefined, pitchZones: {}, pinLabel: "" };
}

/** Marker at the start of a table row's first cell that highlights the row. */
export const ROW_FLAG = "%%";

// ------------------------------------------------------------------ inline md

/** Escape text content. <br> is the one raw tag the markdown sources use
 *  (multi-line table cells), so it is let back through. */
export function esc(t: string): string {
  return t
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&lt;br&gt;", "<br />");
}

/** Escape a value going into a double-quoted attribute. */
export function escAttr(t: string): string {
  return t
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

/** Inline code; if it names a doc with a page on the site, link it there. */
function codeSpan(inner: string, ctx: RenderCtx): string {
  const page = ctx.linkFor(inner);
  if (page) return `<code><a href="${page}">${page}</a></code>`;
  return `<code>${esc(inner)}</code>`;
}

export function inline(text: string, ctx: RenderCtx): string {
  const holes: string[] = [];
  const stash = (h: string): string => `\x00${holes.push(h) - 1}\x00`;

  // code spans first, so their contents are never touched by the later rules
  let out = text.replace(/`([^`]+)`/g, (_m, inner: string) => stash(codeSpan(inner, ctx)));
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
export function slugify(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/[*`_]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

export function uniqueSlug(text: string, seen: Set<string>): string {
  const base = slugify(text);
  let id = base;
  let n = 2;
  while (seen.has(id)) id = `${base}-${n++}`;
  seen.add(id);
  return id;
}

// ------------------------------------------------------------------- block md

export function mdToHtml(md: string, ctx: RenderCtx): string {
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
      out.push(`<h${lvl} id="${id}">${inline(heading[2]!, ctx)}</h${lvl}>`);
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
        const zone = ctx.pitchZones[code];
        const map = ctx.images["__pitch_map__"];
        if (!zone) {
          const known = Object.keys(ctx.pitchZones).join(", ");
          warn(`unknown pitch zone '${code}' — known zones: ${known}`);
        } else if (map === undefined) {
          warn("pitch map image missing — skipped");
        } else {
          out.push(
            `<figure class="pitchmap">\n` +
              `<img alt="${escAttr(alt)}" src="${map}" loading="lazy" />\n` +
              `<span class="pitch-pin" style="left:${zone.left}%;top:${zone.top}%">${ctx.pinLabel} &middot; ${zone.pitch} (${zone.half})</span>\n` +
              `<figcaption>${inline(alt, ctx)}</figcaption>\n` +
              `</figure>`,
          );
        }
        i += 1;
        continue;
      }

      // Matched on the filename, so a plan may write the path it sees in the
      // repo (`teams/u14/images/web/shape.png`) or just the name (`shape.png`).
      const src = ctx.images[target.split("/").pop() ?? target];
      if (src === undefined) {
        // Never link an image to an external host: a hosted page has to keep
        // working on a bad signal at the ground, and off a phone with no
        // access to whatever Drive or CDN the link points at.
        const why = /^[a-z]+:\/\//i.test(target)
          ? "an external URL — copy the image into the site's images folder instead"
          : "not found in the site's images folder";
        warn(`image '${target}' (${alt}) is ${why} — skipped`);
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
      t.push(...head.map((c) => `<th>${inline(c, ctx)}</th>`));
      t.push("</tr>", "</thead>", "<tbody>");
      for (const row of body) {
        // A row whose first cell starts with %% is highlighted — used to pick
        // out newly-available dates in the calendar.
        const flagged = row[0]?.startsWith(ROW_FLAG) ?? false;
        const cells = flagged
          ? [row[0]!.slice(ROW_FLAG.length).trim(), ...row.slice(1)]
          : row;
        t.push(flagged ? '<tr class="row-new">' : "<tr>");
        t.push(...cells.map((c) => `<td>${inline(c, ctx)}</td>`));
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
      out.push(`<${tag}>\n${items.map((x) => `<li>${inline(x, ctx)}</li>`).join("\n")}\n</${tag}>`);
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
    out.push(`<p>${inline(para.join(" "), ctx)}</p>`);
  }

  return out.join("\n");
}
