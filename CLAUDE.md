# U14 Rugby — project instructions

This project holds the coaching material for our club's U14 age group: squad context, playing style, session plans, and the shared HTML reference site built from them.

**Read `claude/age-group.md` and `claude/coaching.md` before producing session plans, playbooks, or drills for this team.** Session plans and drills should use the terminology defined in `claude/playbook.md`.

## Documents

- **`claude/age-group.md`** — squad context: the two teams, physical and skill profile, neurodiversity, training days and facilities, and how the squad is split into training groups.
- **`claude/coaching.md`** — how sessions should be coached: the 6-week block model, whole–part–whole, skill zones, the mandatory two-minute contact warm-up, the skills pyramid, coaching resources and equipment, and the coaching team.
- **`claude/warmup.md`** — the standard five-minute player-led warm-up we open every session with: four fixed phases in lines off the try-line, and what the leader says. The separate two-minute **contact warm-up** (in `claude/coaching.md`) still precedes any tackling.
- **`claude/playbook.md`** — our calls (open play, kicking, etc.) and shapes, kept as a clean, players-shareable reference (no squad/coaching context in it — that lives in the two files above).
- **`claude/laws.md`** — RFU law changes as we move from U13 to U14, including the new lineout laws.
- **`claude/blocks.md`** — our block themes and session-by-session plans.
- **`claude/calendar.md`** — this season's fixtures and training dates (non-PII summary from the club calendar).
- **`claude/activities.md`** — a bank of previously used games/drills (warm-up, game-zone, skill-zone), tagged by skill focus, to draw on when building new session plans.
- **`plans/`** — detailed on-the-pitch session run-sheets, one file per session (see Session plan mechanics below).
- **`ref/`** — reference material: `Lineout FAQ.pdf` (law/mechanics questions), plus `Autism in Rugby.pdf` and `ADHD in Rugby.pdf` (club guidance on coaching neurodiverse players).
- **`tools/`** — `build_site.ts`, which generates the whole HTML site from the markdown above, and `theme.css`, the shared design system it inlines (see Shared HTML reference below).

**Pitch allocation (external):** [https://pitch.twrfc.com/](https://pitch.twrfc.com/) — the club's allocation of pitches and times for each Sunday at home. **We are `U14M`.** This is the source of the start/end time and the pitch for every home session, so check it when writing or running a Sunday plan. It covers club sessions only — Thursdays at TWGSB 4G aren't on it.

**Reading the map's labels.** Where a zone is labelled with two age groups — `U12M / U14M`, `U11 / U15M`, and so on — that is **two consecutive slots on the same ground, not two groups sharing it**. The club runs the minis and younger juniors from **9:00–10:30**, then the older juniors, academy and ladies from **10:45–12:30**. We are always the second name, so **the zone is ours alone for our slot**; the group named before us is off it by 10:30.

It does mean the ground is still in use right up to the changeover, so nothing can be set out early.

**Fixtures, results and league tables (external):** the RFU's England Rugby site carries both teams' league fixtures. The base URL is the same for a team all season; only the `#` anchor changes between the fixtures list, the results and the table:

| Team | Competition | Base URL |
|---|---|---|
| **Blue** — `team=23300`, `division=79245` | Kent Boys Youth Leagues, **U14 Boys Stage 1 Group 2** | `https://www.englandrugby.com/fixtures-and-results/search-results?team=23300&competition=2075&division=79245&season=2026-2027` |
| **White** — `team=128902`, `division=79250` | Kent Boys Youth Leagues, **U14 Boys Stage 1 Group 7** | `https://www.englandrugby.com/fixtures-and-results/search-results?team=128902&competition=2075&division=79250&season=2026-2027` |

Add **`#fixtures`**, **`#results`** or **`#tables`** to either. The two teams are in **different groups**, so they have different opponents and are not always both playing on the same Sunday — check each separately before assuming a fixture Sunday is a fixture for the whole squad.

A note for anyone re-reading these pages: the fixture list is rendered client-side, and the site returns **403 to a plain fetch** — it needs a normal browser user-agent. The season's fixtures are in the page HTML once it loads.

**How the club's pitches are numbered.** The allocation map shows the grounds from above, with the **Club House** marked at the bottom-left. Our own names for what it shows:

| | |
|---|---|
| **Pitch 1** | Nearest the Club House. |
| **Pitch 2** | To the right of Pitch 1. |
| **Pitch 3** | To the right of Pitch 2. |
| **Pitch 4** | The pitch at the top of the map. |
| **Training Area** | The square blue area just below Pitch 4. |
| **Touch Pitch** | The blue rectangle above Pitch 1 — i.e. beyond it, away from the Club House. |

**Naming half a pitch.** We are often allocated half a pitch, shared with another age group. Halves are named **as seen standing at the Club House looking out over the grounds**, which means the split runs differently depending on where the pitch is:

- **Pitches 2 and 3** — **left** and **right**.
- **Pitches 1 and 4** — **near-end** and **far-end**.

Always say which, in the plan's Location row and on the night — "half of Pitch 2" is not enough for thirty players to find.

The club's allocation page labels the halves with its own codes, which map to ours as:

| Code | Ours | | Code | Ours |
|---|---|---|---|---|
| `1a` | Pitch 1, near-end | | `3a` | Pitch 3, left |
| `1b` | Pitch 1, far-end | | `3b` | Pitch 3, right |
| `2a` | Pitch 2, left | | `4a` | Pitch 4, far-end |
| `2b` | Pitch 2, right | | `4b` | Pitch 4, near-end |

That table lives in `PITCH_ZONES` in `tools/build_site.ts`, so a plan only ever writes the club's code — `![caption](pitch:2b)` — and the map pin states the pitch and half itself.

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

- A **responsive HTML page** — one page per session, built to read well on both a phone (checking the plan pitch-side on the day) and a desktop/tablet (planning ahead). This is the default share format going forward. Diagrams embedded as real images, video links as clickable references. **You don't write this page by hand:** add the run-sheet to `plans/` and an entry for it to `PLAN_META` in `tools/build_site.ts` (the session's **ISO date**, page heading, subtitle, breadcrumb, index-card text), then push — the workflow builds the page and its index card automatically. The ISO `date` is what decides which plan is the next one, so it has to be right. Set **`draft: true`** on the entry while a run-sheet is still being worked on: the page gets a *Draft — work in progress* banner and a badge beside its heading, and its index card is badged too, so nobody prints a half-finished plan. Remove the flag when it's ready. The marking follows the plan onto `next.html` if a draft becomes the upcoming session. See Shared HTML reference below.
- A **PDF**, when a flat file that travels well over WhatsApp is specifically wanted instead of (or alongside) the HTML version.

See `plans/block1-week1-thur.md` for a worked example of the markdown source, and [the Week 1 (Sun) page](http://rugby-plans.com/u14/block1-week1-sun.html) for a worked example of the responsive HTML output.

## Shared HTML reference

Alongside the per-session pages above, the site is a small linked reference built from the same markdown sources — this is what actually gets shared outside the coaching group (players, parents), so nothing goes in it that isn't fit for that audience.

**The HTML is generated, never hand-edited and never committed.** `tools/build_site.ts` builds every page from `claude/` and `plans/`, and the `.github/workflows/pages.yml` workflow runs it on each push to `main` and deploys the result straight to GitHub Pages. The site is live at **[http://rugby-plans.com/u14/](http://rugby-plans.com/u14/)** — and the link to hand out is the stable next-session one, **[http://rugby-plans.com/u14/next.html](http://rugby-plans.com/u14/next.html)**.

**The pages are published into a `u14/` sub-directory** of the domain, not at its root, so the root stays free for other age groups later. The build writes them to `<output>/u14/` and leaves a small redirect stub at `<output>/index.html` so the bare domain doesn't 404 — replace that stub with a real landing page if another age group ever joins. Every link between pages is relative, so the sub-directory needs no other change.

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
- **`warmup.html`** — full HTML export of `claude/warmup.md`.
- **`brief.html`** — the upcoming session **condensed for a phone at the ground**: when, where, coaches, kit, and the run sheet as a list rather than a table, so it reads down a screen instead of scrolling sideways. Roughly three iPhone screens. It is generated from the same plan as `next.html` and moves with it, and takes **only the first sentence of each Session details row** — so write those cells with the fact a coach needs in their hand first, and the planning caveats after it.
- **`next.html`** — **the stable link for the upcoming session.** It always carries whichever session is next (today counts as next all day), so it is the URL to save or hand to the coaching group rather than a dated one. If every session in `PLAN_META` is in the past it holds the most recent plan and says so, rather than breaking. Its content is a copy of that week's dated page, with a banner pointing at the permanent link.
- Individual session pages (e.g. `block1-week1-sun.html`) — one per file in `plans/` that has a `PLAN_META` entry, per the per-session convention above. **These keep their dated names permanently and are the archive** — once a session has passed, its page stays exactly where it was, and only `next.html` moves on.

**Build requirements — apply to every page above, no exceptions:**

- **Responsive.** Every page must display well on both mobile (checking a plan pitch-side on a phone) and desktop/tablet (planning ahead) — this is the whole point of the HTML export over a flat document.
- **Consistent style.** All pages share one design system — club blue/gold palette, Oswald (headings) + Public Sans (body), both sans-serif — defined once in **`tools/theme.css`** and inlined into every page by the build script, so each page is standalone. Change the look there, not per page.
- **Diagrams embedded, not linked.** Images are embedded directly into the HTML (as data URIs) rather than linked to an external Drive URL — external links break under viewers' content security policies and depend on Drive sharing settings staying put. Full-size originals live in `claude/images/` (several MB each); the build embeds the web-sized copies in **`claude/images/web/`** (~800–1100px, 35–50 KB). Adding a diagram means adding a web-sized copy there and an entry in the script's `DIAGRAMS` map — e.g. `sips -Z 900 claude/images/new.png --out claude/images/web/new.png`.
- **Highlighting a table row.** Start a row's **first cell with `%%`** and the whole row gets a highlighted background on the site (the marker itself is stripped). Used in `claude/calendar.md` to pick out dates worth noticing. Keep it rare — it stops working the moment several rows use it.
- **Cross-references point to the site, not the source files.** Where the markdown source mentions another doc (e.g. `` `playbook.md` ``), the generated HTML should link to that doc's page on the site (`playbook.html`) — not show a `.md` filename, which isn't a real link anyone reading the site can follow.
- **No academy-library or external play-name provenance notes.** Several of our diagrams and a couple of calls (Tip/Fox) were originally cross-referenced against the club's TWRFC Academy diagram library and its own call names, to help while building this out. Keep that cross-referencing in the Drive source `.md` files (useful context for coaches), but strip it out of the generated public HTML — players/parents don't need or want another team's internal naming.

**Keeping this in date:** nothing to do — the workflow rebuilds every page from the markdown on each push to `main`, so the site cannot drift out of sync with the sources. The index's cards are generated too, so adding a session plan needs no separate index edit.

The workflow **also runs daily at 05:00 UTC**, because `next.html` depends on the date rather than on anything in the repo: without a scheduled rebuild it would still be advertising last week's session. (GitHub disables scheduled workflows after 60 days with no repo activity — if `next.html` ever goes stale, check the Actions tab first.)

## Where these files live

**Google Drive is now the source of truth for the `claude/` and `plans/` markdown files.** They're saved as plain `.md` files in a **U14 Rugby** folder in Drive (mcroker@gmail.com), mirroring this project's structure:

- Folder: `U14 Rugby` — [https://drive.google.com/drive/folders/1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU](https://drive.google.com/drive/folders/1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU) (id `1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU`)
  - `claude/` subfolder (id `1Udsw9IVyvCi5I7XRl_AnOAHh7u8FXqem`) — `age-group.md`, `coaching.md`, `playbook.md`, `blocks.md`, `activities.md`, `laws.md`, `calendar.md`, and an `images/` subfolder of diagrams sourced from the club's TWRFC Academy library and embedded into `playbook.md`
  - `plans/` subfolder (id `1qtc7cyYEqEryu_masZQCQodltzKe5sZw`) — one markdown file per session, e.g. `block1-week1-sun.md`
  - **No HTML folder.** The site used to live in a `Public (HTML)` subfolder, then in `docs/`; it is now generated by `tools/build_site.ts` and deployed to GitHub Pages by the workflow, so no HTML is stored in Drive or committed to the repo at all. The generated pages are standalone full HTML documents (own `<!DOCTYPE>`/`<head>`/`<body>`, with the viewport meta tag the responsive layout needs).

**Drive is now the single source of truth — there are no parallel copies of these files as Claude Project docs any more.** Read and edit the Drive files directly; nothing needs mirroring back anywhere else. When a computer is linked and has this Drive folder synced locally, prefer editing the local synced copy (fast, no round-trip) — fall back to the connected Google Drive tool (trash + recreate, per the mechanical note below) when no linked computer/local sync is available.

**Mechanical note:** the connected Google Drive tool has no in-place content-update call — only file metadata (title/parent) can be patched directly. To "edit" a file's content in Drive, the working approach is: trash the old file (`trash_file`) and create a replacement with the same title in the same parent folder (`create_file`, with `disableConversionToGoogleType: true` and `contentMimeType` set to `text/markdown` or `text/html` as appropriate, so it stays a plain file rather than converting to a Google Doc). This means a file's Drive file-ID (and therefore its direct `/file/d/...` link) changes every time it's edited — the folder links above stay stable, but don't rely on a bookmarked link to one specific file surviving an edit.

**Sharing the site:** hand out [http://rugby-plans.com/u14/next.html](http://rugby-plans.com/u14/next.html) for the upcoming session, or [http://rugby-plans.com/u14/](http://rugby-plans.com/u14/) for the index — it's public, needs no Drive permissions, and rebuilds itself on every push to `main`. The old approach (sharing a Drive folder, which the connected Drive tool could only do per-named-person) is no longer needed.
