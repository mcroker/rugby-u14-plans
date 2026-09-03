# U14 Rugby — project instructions

This project holds the coaching material for our club's U14 age group: squad context, playing style, session plans, and the shared HTML reference site built from them.

**Read `claude/age-group.md` and `claude/coaching.md` before producing session plans, playbooks, or drills for this team.** Session plans and drills should use the terminology defined in `claude/playbook.md`.

## Documents

- **`claude/age-group.md`** — squad context: the two teams, physical and skill profile, neurodiversity, training days and facilities, and how the squad is split into training groups.
- **`claude/coaching.md`** — how sessions should be coached: the 6-week block model, whole–part–whole, skill zones, the skills pyramid, coaching resources and equipment, and the coaching team.
- **`claude/playbook.md`** — our calls (open play, kicking, etc.) and shapes, kept as a clean, players-shareable reference (no squad/coaching context in it — that lives in the two files above).
- **`claude/laws.md`** — RFU law changes as we move from U13 to U14, including the new lineout laws.
- **`claude/blocks.md`** — our block themes and session-by-session plans.
- **`claude/calendar.md`** — this season's fixtures and training dates (non-PII summary from the club calendar).
- **`claude/activities.md`** — a bank of previously used games/drills (warm-up, game-zone, skill-zone), tagged by skill focus, to draw on when building new session plans.
- **`plans/`** — detailed on-the-pitch session run-sheets, one file per session (see Session plan mechanics below).
- **`ref/`** — reference material: `Lineout FAQ.pdf` (law/mechanics questions), plus `Autism in Rugby.pdf` and `ADHD in Rugby.pdf` (club guidance on coaching neurodiverse players).
- **`tools/`** — `build_site.ts`, which generates the whole HTML site from the markdown above, and `theme.css`, the shared design system it inlines (see Shared HTML reference below).

**Pitch allocation (external):** [https://pitch.twrfc.com/](https://pitch.twrfc.com/) — the club's allocation of pitches and times for each Sunday at home. **We are `U14M`.** This is the source of the start/end time and the pitch for every home session, so check it when writing or running a Sunday plan. It covers club sessions only — Thursdays at TWGSB 4G aren't on it.

## Session plan mechanics

**Detailed, on-the-pitch session run-sheets** (timings, drills, setup) live in the **`plans/`** folder, one file per session, expanding that session's entry in `claude/blocks.md`. Naming convention: `plans/block{block number}-week{week number within the block, i.e. restarts at 1 for each new block}-{thur|sun}.md` — e.g. `plans/block1-week1-thur.md` for Block 1, Week 1, Thursday. Use `thur` or `sun` for the day.

**Session plan template.** Every file in `plans/` follows this structure:

1. **Session details** — a header table with: Date/Time, Location, Coaches (names of coaches in attendance — fill in on the night if not yet known), Attendance (number of children present — fill in on the night), Session objective, and Resources required.

   For a home Sunday session, **Date/Time and Location come from the pitch allocation** (above) — find the `U14M` row for that date and use its **time** (e.g. `10:45am – 12:30pm`) and its **pitch zone**. Then, straight after the table, include the **allocation map with our pitch marked**, by writing an image whose target is the zone code:

   ```
   ![Our pitch this session — the U12M / U14M zone on the club allocation map.](pitch:2b)
   ```

   The build embeds the club map and pins a `U14M` marker on that zone, so a new week only means changing the zone code. Zone codes are the club's own — `1a`, `1b`, `2a`, `2b`, `3a`, `3b`, `4a`, `4b` — and are listed in `PITCH_ZONES` in `tools/build_site.ts`; an unknown code fails the build. Keep the caption free of markdown links (square brackets in the caption break the image match).
2. **Plan** — a lightweight table, one row per activity, with just the key at-a-glance information: Start time + duration, Activity, and a one-line summary of what it is / its focus. This is the section to glance at while actually running the session on the night.
3. **Activities** — a more detailed breakdown, but **only for activities that warrant it** (introducing a new skill or system, or anything worth a diagram or video reference) — not every row from the Plan table needs an entry here. Check **`claude/activities.md`** first for a reusable game/drill before inventing a new one. Each entry can include:
   - Coaching Points (kept to a small number of focus areas)
   - Setup
   - Description
   - **Progressions** — a bulleted list of ways the activity could be advanced, this week or in later weeks. List the options; it's the coach's call on the night which of them (if any) to apply, and how many.
   - **Adaptations** — a bulleted list of ways to vary the drill on the fly to get a different outcome — space, group size/numbers, player pairing, speed/tempo, etc. Unlike Progressions (which build the skill forward over time), Adaptations are about tuning today's version of the drill to the group actually in front of the coach.
   - **Diagram** and/or **Video example(s)**, where useful — see below.
4. **Notes** — a closing free-text section for caveats, placeholders (e.g. a call or system not yet finalised), and anything else worth flagging to whoever runs the session.

**Diagrams, video, and sharing.** Diagrams should be produced as actual images (e.g. a simple PNG sketch), not plain-text/ASCII art — text diagrams don't render usefully once the plan is shared outside the project. The markdown file in `plans/` stays the authoritative working source (image referenced by filename). When a plan is ready to hand to the coaching group, export it as:

- A **responsive HTML page** — one page per session, built to read well on both a phone (checking the plan pitch-side on the day) and a desktop/tablet (planning ahead). This is the default share format going forward. Diagrams embedded as real images, video links as clickable references. **You don't write this page by hand:** add the run-sheet to `plans/` and an entry for it to `PLAN_META` in `tools/build_site.ts` (page heading, subtitle, date, breadcrumb, index-card text), then push — the workflow builds the page and its index card automatically. See Shared HTML reference below.
- A **PDF**, when a flat file that travels well over WhatsApp is specifically wanted instead of (or alongside) the HTML version.

See `plans/block1-week1-thur.md` for a worked example of the markdown source, and [the Week 1 (Sun) page](https://mcroker.github.io/rugby-u14-plans/block1-week1-sun.html) for a worked example of the responsive HTML output.

## Shared HTML reference

Alongside the per-session pages above, the site is a small linked reference built from the same markdown sources — this is what actually gets shared outside the coaching group (players, parents), so nothing goes in it that isn't fit for that audience.

**The HTML is generated, never hand-edited and never committed.** `tools/build_site.ts` builds every page from `claude/` and `plans/`, and the `.github/workflows/pages.yml` workflow runs it on each push to `main` and deploys the result straight to GitHub Pages. The site is live at **[https://mcroker.github.io/rugby-u14-plans/](https://mcroker.github.io/rugby-u14-plans/)** — that URL is the link to hand out.

So **publishing is just editing the markdown and pushing.** To preview locally first:

```
node tools/build_site.ts _site          # Node 23.6+
node --experimental-strip-types tools/build_site.ts _site   # Node 22.6–23.5
```

Then open the files in `_site/` (git-ignored). Node runs the TypeScript directly by stripping types, so **the build itself needs no dependencies and no compile step** — nothing to install before previewing. TypeScript is a dev dependency for `npm run typecheck` (`tsc --noEmit`) only, which CI runs before every build, because stripping types does not check them. Run `npm ci` first if you want to type-check locally.

The script **exits non-zero on any warning** (a diagram it can't find, a session plan with no `PLAN_META` entry, a rewording that broke one of its substitutions), so a problem fails the build loudly instead of quietly publishing a broken page.

Pages on the site:

- **`index.html`** — the entry point, with cards linking to every page below. This is the one link to hand out for "a simple reference."
- **`playbook.html`** — full HTML export of `claude/playbook.md`, including the diagrams. The master reference for how we play.
- **`block1-overview.html`** — full HTML export of `claude/blocks.md`'s Block 1 section (session list, weekly outlines).
- **`claude.html`** ("Coaching Notes") — full HTML export of `claude/age-group.md` and `claude/coaching.md`, combined into the one page. The project/build instructions in this file (`CLAUDE.md`) are **not** part of the shared site.
- **`activities.html`** — full HTML export of `claude/activities.md`.
- **`calendar.html`** — full HTML export of `claude/calendar.md`.
- **`laws.html`** — full HTML export of `claude/laws.md`.
- Individual session pages (e.g. `block1-week1-sun.html`) — one per file in `plans/` that has a `PLAN_META` entry, per the per-session convention above.

**Build requirements — apply to every page above, no exceptions:**

- **Responsive.** Every page must display well on both mobile (checking a plan pitch-side on a phone) and desktop/tablet (planning ahead) — this is the whole point of the HTML export over a flat document.
- **Consistent style.** All pages share one design system — club blue/gold palette, Oswald (headings) + Public Sans (body), both sans-serif — defined once in **`tools/theme.css`** and inlined into every page by the build script, so each page is standalone. Change the look there, not per page.
- **Diagrams embedded, not linked.** Images are embedded directly into the HTML (as data URIs) rather than linked to an external Drive URL — external links break under viewers' content security policies and depend on Drive sharing settings staying put. Full-size originals live in `claude/images/` (several MB each); the build embeds the web-sized copies in **`claude/images/web/`** (~800–1100px, 35–50 KB). Adding a diagram means adding a web-sized copy there and an entry in the script's `DIAGRAMS` map — e.g. `sips -Z 900 claude/images/new.png --out claude/images/web/new.png`.
- **Cross-references point to the site, not the source files.** Where the markdown source mentions another doc (e.g. `` `playbook.md` ``), the generated HTML should link to that doc's page on the site (`playbook.html`) — not show a `.md` filename, which isn't a real link anyone reading the site can follow.
- **No academy-library or external play-name provenance notes.** Several of our diagrams and a couple of calls (Tip/Fox) were originally cross-referenced against the club's TWRFC Academy diagram library and its own call names, to help while building this out. Keep that cross-referencing in the Drive source `.md` files (useful context for coaches), but strip it out of the generated public HTML — players/parents don't need or want another team's internal naming.

**Keeping this in date:** nothing to do — the workflow rebuilds every page from the markdown on each push to `main`, so the site cannot drift out of sync with the sources. The index's cards are generated too, so adding a session plan needs no separate index edit.

## Where these files live

**Google Drive is now the source of truth for the `claude/` and `plans/` markdown files.** They're saved as plain `.md` files in a **U14 Rugby** folder in Drive (mcroker@gmail.com), mirroring this project's structure:

- Folder: `U14 Rugby` — [https://drive.google.com/drive/folders/1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU](https://drive.google.com/drive/folders/1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU) (id `1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU`)
  - `claude/` subfolder (id `1Udsw9IVyvCi5I7XRl_AnOAHh7u8FXqem`) — `age-group.md`, `coaching.md`, `playbook.md`, `blocks.md`, `activities.md`, `laws.md`, `calendar.md`, and an `images/` subfolder of diagrams sourced from the club's TWRFC Academy library and embedded into `playbook.md`
  - `plans/` subfolder (id `1qtc7cyYEqEryu_masZQCQodltzKe5sZw`) — one markdown file per session, e.g. `block1-week1-sun.md`
  - **No HTML folder.** The site used to live in a `Public (HTML)` subfolder, then in `docs/`; it is now generated by `tools/build_site.ts` and deployed to GitHub Pages by the workflow, so no HTML is stored in Drive or committed to the repo at all. The generated pages are standalone full HTML documents (own `<!DOCTYPE>`/`<head>`/`<body>`, with the viewport meta tag the responsive layout needs).

**Drive is now the single source of truth — there are no parallel copies of these files as Claude Project docs any more.** Read and edit the Drive files directly; nothing needs mirroring back anywhere else. When a computer is linked and has this Drive folder synced locally, prefer editing the local synced copy (fast, no round-trip) — fall back to the connected Google Drive tool (trash + recreate, per the mechanical note below) when no linked computer/local sync is available.

**Mechanical note:** the connected Google Drive tool has no in-place content-update call — only file metadata (title/parent) can be patched directly. To "edit" a file's content in Drive, the working approach is: trash the old file (`trash_file`) and create a replacement with the same title in the same parent folder (`create_file`, with `disableConversionToGoogleType: true` and `contentMimeType` set to `text/markdown` or `text/html` as appropriate, so it stays a plain file rather than converting to a Google Doc). This means a file's Drive file-ID (and therefore its direct `/file/d/...` link) changes every time it's edited — the folder links above stay stable, but don't rely on a bookmarked link to one specific file surviving an edit.

**Sharing the site:** hand out [https://mcroker.github.io/rugby-u14-plans/](https://mcroker.github.io/rugby-u14-plans/) — it's public, needs no Drive permissions, and rebuilds itself on every push to `main`. The old approach (sharing a Drive folder, which the connected Drive tool could only do per-named-person) is no longer needed.
