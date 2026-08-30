#!/usr/bin/env python3
"""Build the U14 Rugby reference site from the markdown sources.

Usage:  python3 tools/build_site.py [output-dir]     (default: _site)

Sources are the markdown files in claude/ and plans/; the shared design system
is tools/theme.css, inlined into every page so each one is standalone.  Diagrams
are embedded as data URIs from claude/images/web/ (web-sized copies of the
originals in claude/images/ — see CLAUDE.md).

Pure standard library: no third-party packages, so CI needs no install step.
"""
import base64, datetime, html as _html, io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "_site")
GENERATED = datetime.date.today().strftime("%-d %B %Y")

# A source .md filename mentioned in the markdown becomes a link to its page on
# the site.  Docs with no public page are left as plain text by the substitutions
# in build_pages() rather than appearing here.
PAGE_FOR = {
    "playbook.md": "playbook.html",
    "blocks.md": "block1-overview.html",
    "activities.md": "activities.html",
    "calendar.md": "calendar.html",
    "laws.md": "laws.html",
    "age-group.md": "claude.html",
    "coaching.md": "claude.html",
    "claude/age-group.md": "claude.html",
    "claude/coaching.md": "claude.html",
}

# Diagram alt text in playbook.md -> web-sized file in claude/images/web/.
# Adding a diagram means adding its web-sized copy and an entry here.
DIAGRAMS = {
    "Rhino": "rhino.png",
    "Hulk": "hulk.png",
    "Eagle": "eagle_kick.png",
    "Hawk — box kick": "hawk_box_kick.png",
    "5-man Rhino — Phase 1": "5man_rhino_phase1.png",
    "5-man Rhino — Phase 2": "5man_rhino_phase2.png",
    "5-man Rhino — Phase 3": "5man_rhino_phase3.png",
}

warnings = []


def warn(msg):
    warnings.append(msg)
    sys.stderr.write("WARNING: %s\n" % msg)


def read(rel):
    with io.open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
        return fh.read()


# ------------------------------------------------------------------ inline md
def esc(t):
    # <br> is the one raw tag the markdown sources use (multi-line table cells)
    return _html.escape(t, quote=False).replace("&lt;br&gt;", "<br />")


def code_span(inner):
    """Inline code; if it names a source doc, link it to that doc's page."""
    page = PAGE_FOR.get(inner)
    if page:
        return '<code><a href="%s">%s</a></code>' % (page, page)
    return "<code>%s</code>" % esc(inner)


def inline(text):
    holes = []

    def stash(h):
        holes.append(h)
        return "\x00%d\x00" % (len(holes) - 1)

    # code spans first, so their contents are never touched by the later rules
    text = re.sub(r"`([^`]+)`", lambda m: stash(code_span(m.group(1))), text)
    text = esc(text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: stash('<a href="%s">%s</a>' % (_html.escape(m.group(2), quote=True), m.group(1))),
        text,
    )
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![*\w])\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    return re.sub(r"\x00(\d+)\x00", lambda m: holes[int(m.group(1))], text)


# ------------------------------------------------------------------ block md
def md_to_html(md, images=None):
    """Convert the markdown subset used by these sources: h1-h4, tables, lists,
    images, paragraphs, rules, and inline bold/italic/code/links."""
    images = images or {}
    lines = md.split("\n")
    out, i, n = [], 0, len(lines)

    def is_table(k):
        return (k + 1 < n and lines[k].lstrip().startswith("|")
                and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[k + 1] or ""))

    while i < n:
        s = lines[i].strip()

        if not s:
            i += 1
            continue

        if s == "---":
            out.append("<hr />")
            i += 1
            continue

        m = re.match(r"^(#{1,4})\s+(.*)$", s)
        if m:
            lvl = len(m.group(1))
            out.append("<h%d>%s</h%d>" % (lvl, inline(m.group(2)), lvl))
            i += 1
            continue

        m = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)$", s)
        if m:
            alt = m.group(1)
            src = images.get(alt)
            if src is None:
                warn("no embedded diagram for image %r — skipped" % alt)
            else:
                out.append('<img alt="%s" src="%s" />' % (_html.escape(alt, quote=True), src))
            i += 1
            continue

        if is_table(i):
            head = [c.strip() for c in s.strip("|").split("|")]
            i += 2
            body = []
            while i < n and lines[i].strip().startswith("|"):
                body.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            t = ['<div class="table-scroll">', "<table>", "<thead>", "<tr>"]
            t += ["<th>%s</th>" % inline(c) for c in head]
            t += ["</tr>", "</thead>", "<tbody>"]
            for row in body:
                t.append("<tr>")
                t += ["<td>%s</td>" % inline(c) for c in row]
                t.append("</tr>")
            t += ["</tbody>", "</table>", "</div>"]
            out.append("\n".join(t))
            continue

        for pat, tag in ((r"^\s*[-*]\s+", "ul"), (r"^\s*\d+\.\s+", "ol")):
            if re.match(pat, lines[i]):
                items = []
                while i < n and re.match(pat, lines[i]):
                    items.append(re.sub(pat, "", lines[i]))
                    i += 1
                out.append("<%s>\n%s\n</%s>" % (
                    tag, "\n".join("<li>%s</li>" % inline(x) for x in items), tag))
                break
        else:
            # paragraph: keep consuming until a blank line or the next block
            para = [s]
            i += 1
            while i < n and lines[i].strip() and not re.match(
                    r"^\s*(#{1,4}\s|[-*]\s|\d+\.\s|\||!\[|---$)", lines[i]):
                para.append(lines[i].strip())
                i += 1
            out.append("<p>%s</p>" % inline(" ".join(para)))

    return "\n".join(out)


# ---------------------------------------------------------------- page shell
def page(theme, title, h1, sub, sub2, crumb, body, extra_css="", footer=None):
    foot = footer or ('Generated %s &middot; U14 Rugby coaching reference &middot; '
                      '<a href="index.html">Back to index</a>' % GENERATED)
    css = theme + ("\n" + extra_css.strip() if extra_css.strip() else "")
    nav = ('    <nav class="crumb"><a href="index.html">Index</a> &rsaquo; %s</nav>\n' % crumb) if crumb else ""
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>%s</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<style>%s</style>
</head>
<body>
<header class="page-head">
  <div class="inner">
    <h1>%s</h1>
    <div class="sub">%s</div>
    <div class="sub2">%s</div>
%s  </div>
</header>
<div class="wrap">
%s
</div>
<footer class="page-foot">%s</footer>
</body>
</html>
""" % (title, css, h1, sub, sub2, nav, body, foot)


# ------------------------------------------------------------ source cleanup
def strip_provenance(md):
    """Build requirement: no academy-library or external play-name provenance,
    and no club-Drive internals, on the public site."""
    md = re.sub(r"\s*\((?:[Ss]ourced from|[Mm]atched to)[^()]*[Aa]cademy[^()]*\)", "", md)
    md = re.sub(r"\s*Matches the club Academy's own \"[^\"]+\" call\.", "", md)
    md = re.sub(r"\s*Academy equivalent: \"[^\"]+\"\.", "", md)
    md = "\n".join(l for l in md.split("\n")
                   if "diagrams to source" not in l.lower()
                   and "folders in the club Drive" not in l)
    md = re.sub(r"\s*\(sourced from[^()]*\)", "", md, flags=re.I)
    if re.search(r"[Aa]cademy", md):
        warn("academy reference survived stripping — check playbook.md")
    return md


def drop_h1_and_lead(md):
    """For the combined Coaching Notes page: drop a file's H1 and the
    Claude-facing lead paragraph above its first section."""
    lines = md.split("\n")
    k = 0
    while k < len(lines) and not lines[k].startswith("## "):
        k += 1
    return "\n".join(lines[k:])


def sub_all(md, pairs, label):
    for old, new in pairs:
        if old not in md:
            warn("[%s] substitution no longer matches: %r" % (label, old[:60]))
        md = md.replace(old, new)
    return md


# ------------------------------------------------------------------- diagrams
def load_diagrams():
    out = {}
    for alt, fname in DIAGRAMS.items():
        path = os.path.join(ROOT, "claude", "images", "web", fname)
        if not os.path.exists(path):
            warn("missing web-sized diagram %s" % fname)
            continue
        with io.open(path, "rb") as fh:
            out[alt] = "data:image/png;base64," + base64.b64encode(fh.read()).decode("ascii")
    return out


# ---------------------------------------------------------------- index cards
INDEX_CSS = """
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
"""


def card(href, title, desc, badge=None):
    b = ' <span class="badge">%s</span>' % badge if badge else ""
    return ('    <a class="card" href="%s">\n'
            '      <div class="card-title">%s%s</div>\n'
            '      <div class="card-desc">%s</div>\n'
            '    </a>' % (href, title, b, desc))


# -------------------------------------------------------------------- build
def build_pages():
    theme = read("tools/theme.css").strip()
    diagrams = load_diagrams()
    pages = {}

    def add(name, **kw):
        pages[name] = page(theme, **kw)

    # ---- playbook
    add("playbook.html",
        title="Playbook &amp; Calls — U14 Rugby", h1="Playbook &amp; Calls",
        sub="Our calls and shapes — open play, backs moves, kicking, defence, lineout, scrum.",
        sub2="", crumb="Playbook",
        body=md_to_html(strip_provenance(read("claude/playbook.md")), diagrams))

    # ---- coaching notes = age-group.md + coaching.md
    ag = sub_all(drop_h1_and_lead(read("claude/age-group.md")), [
        ("See `coaching.md` — How sessions should be coached for the contact-light "
         "approach we take to the Thursday slot specifically.",
         "See How sessions should be coached below for the contact-light approach "
         "we take to the Thursday slot specifically."),
    ], "age-group")
    co = sub_all(drop_h1_and_lead(read("claude/coaching.md")), [
        ("see `age-group.md` — Training & Fixtures.", "see Training &amp; Fixtures above."),
        ("plus the neurodiversity guidance linked from `age-group.md`",
         "plus the neurodiversity guidance linked above"),
    ], "coaching")
    add("claude.html",
        title="Coaching Notes — U14 Rugby", h1="Coaching Notes",
        sub="Squad context, playing style, and how sessions are planned and run.",
        sub2="", crumb="Coaching Notes",
        body=md_to_html(ag + "\n\n" + co))

    # ---- block 1 overview
    add("block1-overview.html",
        title="Block 1 — Session Plans — U14 Rugby", h1="Block 1 — Session Plans",
        sub="Weeks 1–6 — defence, plus introducing lineout and scrum.",
        sub2="Sun 6 Sep – Thu 15 Oct 2026", crumb="Block 1 overview",
        body=md_to_html(sub_all(read("claude/blocks.md"), [
            (", and `CLAUDE.md` for general session-planning mechanics — all of which apply across all blocks",
             " — all of which apply across all blocks"),
        ], "blocks")))

    # ---- activities
    add("activities.html",
        title="Activities Bank — U14 Rugby", h1="Activities Bank",
        sub="Warm-up, game-zone and skill-zone games and drills, tagged by skill focus.",
        sub2="", crumb="Activities",
        body=md_to_html(sub_all(read("claude/activities.md"), [
            ("(see `CLAUDE.md`'s Session plan template)", "(see the session-plan template)"),
        ], "activities")))

    # ---- calendar
    add("calendar.html",
        title="Calendar — U14 Rugby", h1="Calendar",
        sub="2026/27 season — fixtures and training dates.",
        sub2="", crumb="Calendar", body=md_to_html(read("claude/calendar.md")))

    # ---- laws
    add("laws.html",
        title="Laws of the Game — U14 Rugby", h1="Laws of the Game",
        sub="RFU age-grade law changes relevant to this squad, U13 → U14.",
        sub2="", crumb="Laws", body=md_to_html(read("claude/laws.md")))

    # ---- session run-sheets: one page per file in plans/
    plans_dir = os.path.join(ROOT, "plans")
    for fname in sorted(os.listdir(plans_dir)):
        if not fname.endswith(".md"):
            continue
        meta = PLAN_META.get(fname)
        if meta is None:
            warn("no page metadata for plans/%s — add it to PLAN_META" % fname)
            continue
        add(fname[:-3] + ".html",
            title="%s — U14 Rugby" % meta["h1"], h1=meta["h1"], sub=meta["sub"],
            sub2=meta["sub2"], crumb=meta["crumb"],
            body=md_to_html(read("plans/" + fname)))

    # ---- index
    plan_cards = [card(f[:-3] + ".html", PLAN_META[f]["h1"], PLAN_META[f]["card"],
                       PLAN_META[f]["badge"])
                  for f in sorted(PLAN_META) if os.path.exists(os.path.join(plans_dir, f))]
    index_body = "\n".join([
        '  <h2 class="group">Playbook</h2>',
        '  <div class="cards">',
        card("playbook.html", "Playbook &amp; Calls",
             "Our calls and shapes — open play, backs moves, kicking, defence, lineout, scrum. "
             "The master reference for how we play; clean enough to share with the players themselves."),
        '  </div>',
        '',
        '  <h2 class="group">Block 1 &middot; Weeks 1&ndash;6</h2>',
        '  <div class="cards">',
        card("block1-overview.html", "Block 1 — Overview",
             "Theme, the full week-by-week session list, and outline plans for all six weeks.",
             "Sep&ndash;Oct"),
    ] + plan_cards + [
        '  </div>',
        '',
        '  <h2 class="group">Coaching reference</h2>',
        '  <div class="cards">',
        card("claude.html", "Coaching Notes",
             "Squad context, playing style, training structure, and how sessions are planned and run."),
        card("activities.html", "Activities Bank",
             "Warm-up, game-zone and skill-zone games and drills, tagged by skill focus — "
             "check here before inventing a new drill."),
        card("laws.html", "Laws of the Game",
             "RFU age-grade law changes relevant to this squad as we move from U13 to U14 — "
             "lineout, scrum, pitch and team size."),
        card("calendar.html", "Calendar", "This season's fixtures and training dates."),
        '  </div>',
    ])
    add("index.html",
        title="U14 Rugby — Coaching Reference", h1="U14 Rugby — Coaching Reference",
        sub="A simple, shareable index of the squad's playbook and coaching reference.",
        sub2="All pages responsive — built for pitch-side phone use and desktop planning alike.",
        crumb=None, body=index_body, extra_css=INDEX_CSS,
        footer="U14 Rugby coaching reference &middot; pages rebuilt from <code>claude/</code> "
               "and <code>plans/</code> whenever the underlying plan changes.")
    return pages


# Per-session page metadata. Adding a session means adding its run-sheet to
# plans/ and an entry here; the page and its index card follow automatically.
PLAN_META = {
    "block1-week1-sun.md": {
        "h1": "Week 1 — Sunday",
        "sub": "Season opener — tackle base, first lineout exposure, blitz-defence intro.",
        "sub2": "Sun 6 Sep 2026",
        "crumb": "Week 1 (Sun)",
        "card": "Detailed run-sheet for the season-opening session: timings, drills, and setup.",
        "badge": "6 Sep",
    },
}


def main():
    pages = build_pages()
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    for name, content in sorted(pages.items()):
        with io.open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(content)
        print("wrote %-24s %7.1f KB" % (name, len(content.encode("utf-8")) / 1024.0))
    if warnings:
        print("\n%d warning(s):" % len(warnings))
        for w in warnings:
            print("  - " + w)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
