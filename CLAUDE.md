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

**Session plan template.** Every file in `plans/` follows this structure. **The build reads it structurally, not just as prose** — the headings and the shape of the two tables are a contract, and the notes below each part say what depends on them. Getting one wrong fails the build rather than quietly producing a broken page.

| Markdown | Becomes, on the page |
|---|---|
| `## Session details` — the **Session objective** row | an **Objective** heading at the top of the page, above everything else |
| `## Session details` — the other rows | the collapsed **Logistics** accordion, with the pitch map inside it |
| `## Plan` — the **first** table | the **timeline**: one block per row, rows sharing a start time drawn side by side |
| `## Plan` — anything after that table | kept, rendered below the timeline (this is where a coach allocation goes) |
| `## Activities` — each `### ` entry | a **collapsed accordion**, and the source of its timeline block's setup/cues and Details modal |
| `## Notes`, `## Review` | rendered below, as written |


1. **Session details** — a header table with: Date/Time, Location, Coaches (names of coaches in attendance — fill in on the night if not yet known), Attendance (number of children present — fill in on the night), Session objective, and Resources required.

   For a home Sunday session, **Date/Time and Location come from the pitch allocation** (above) — find the `U14M` row for that date and use its **time** (e.g. `10:45am – 12:30pm`) and its **pitch zone**. Then, straight after the table, include the **allocation map with our pitch marked**, by writing an image whose target is the zone code:

   ```
   ![Our pitch this session — the U12M / U14M zone on the club allocation map.](pitch:2b)
   ```

   Set **`eveningAtClub: true`** in `PLAN_META` for an evening session at the club, and the build adds a **Sunset** row to the logistics — computed for the club's location on that date, in local time, so it follows the clocks changing. Leave it off for daytime or away-from-the-club sessions, where it is noise.

   The build embeds the club map and pins a `U14M` marker on that zone, so a new week only means changing the zone code. Zone codes are the club's own — `1a`, `1b`, `2a`, `2b`, `3a`, `3b`, `4a`, `4b` — and are listed in `PITCH_ZONES` in `tools/build_site.ts`; an unknown code fails the build. Keep the caption free of markdown links (square brackets in the caption break the image match).
2. **Plan** — a three-column table, one row per activity: start time + duration, Activity, and a one-line summary. This becomes the timeline, so the first cell is load-bearing:

   - It **must** read `+<start>, <n> min` — e.g. `+7, 13 min`. A row that doesn't fails the build.
   - **Rows sharing a start time are drawn side by side** as parallel blocks. That is how the page shows the squad splitting; nothing else marks it.
   - An italic parenthetical after the time — `+7, 13 min *(parallel pull-out)*` — becomes a tag on the block.
   - Only the **first** table in this section is read as the run sheet, so a coach allocation or any other table can follow it.
3. **Activities** — a `### ` entry per activity. Each becomes a collapsed accordion **and** feeds its block on the timeline, so write them for a coach who is about to run the thing:

   - **`**Setup:**`** and **`**Coaching Points:**`** are lifted onto the timeline block as *Set up* and *Call* — **first sentence only**, so lead with the instruction and put the caveats after it. A bare cross-reference (`see \`activities.md\`.`) is skipped, so don't make it the whole first sentence.
   - **`**Description:**`**, **`**Coaching Points:**`** and **`**Progressions:**`** are what the block's **Details** modal shows.
   - An entry is matched to its row by the words in the title, so keep the two recognisably the same. No match means no setup, cues, Details button or link for that block — it falls back to the Plan table's summary.
   - The **player-led warm-up entry is generated automatically** from `claude/warmup.md` — don't write one.

   Write an entry for anything that warrants it (a new skill or system, anything worth a diagram or video); a row like a cool-down needs none. Check **`claude/activities.md`** first for a reusable game/drill before inventing a new one. Each entry can include:
   - Coaching Points (kept to a small number of focus areas)
   - Setup
   - Description
   - **Progressions** — a bulleted list of ways the activity could be advanced, this week or in later weeks. List the options; it's the coach's call on the night which of them (if any) to apply, and how many.
   - **Adaptations** — a bulleted list of ways to vary the drill on the fly to get a different outcome — space, group size/numbers, player pairing, speed/tempo, etc. Unlike Progressions (which build the skill forward over time), Adaptations are about tuning today's version of the drill to the group actually in front of the coach.
   - **Diagram** and/or **Video example(s)**, where useful — see below.
4. **Review** — added *after* the session: what actually happened, from the coaches' feedback. What worked, what to change, and anything carried forward into the next weeks. Keep the durable lessons out of here and in the right doc — a coaching-delivery lesson belongs in `claude/coaching.md`, a playing-style one in `claude/playbook.md`, a next-week consequence in `claude/blocks.md` — and leave the session-specific detail here.
5. **Notes** — a closing free-text section for caveats, placeholders (e.g. a call or system not yet finalised), and anything else worth flagging to whoever runs the session.

**Diagrams, video, and sharing.** Diagrams should be produced as actual images (e.g. a simple PNG sketch), not plain-text/ASCII art — text diagrams don't render usefully once the plan is shared outside the project. The markdown file in `plans/` stays the authoritative working source (image referenced by filename). When a plan is ready to hand to the coaching group, export it as:

- A **responsive HTML page** — one page per session, built to read well on both a phone (checking the plan pitch-side on the day) and a desktop/tablet (planning ahead). This is the default share format going forward. **You don't write this page by hand:** add the run-sheet to `plans/` and an entry for it to `PLAN_META` in `tools/build_site.ts` (the session's **ISO date**, page heading, subtitle, breadcrumb, index-card text), then push — the workflow builds the page and its index card automatically. The ISO `date` is what decides which plan is the next one, so it has to be right. Set **`draft: true`** on the entry while a run-sheet is still being worked on: the page gets a *Draft — work in progress* banner and a badge beside its heading, and its index card is badged too, so nobody prints a half-finished plan. Remove the flag when it's ready. The marking follows the plan through `next.html` if a draft becomes the upcoming session. See Shared HTML reference below.
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
- **`next.html`** — **the stable link.** A tiny redirect page, not a copy: it forwards to the upcoming session's page, so the URL you hand out never changes. Today counts as next all day; if every session is in the past it points at the most recent one.
- **`<plan>.html`** — **one page per session**, built to be read top-down at the ground and in depth when planning. The session objective at the top under its own **Objective** heading, then a collapsed **Logistics** accordion (the rest of the session details, and the pitch map), then the run sheet as a **timeline** — time down the page, and a stretch where several things happen at once splits into that many columns. Each block shows only what you need to *run* it (setup and cues, taken from the plan's own Activities entry) with a **Details** button opening a modal of that activity. The modal is filled at click time by cloning the activity's own section out of the page below, so the detail exists once in the HTML and the modal is only a view onto it — and it offers *Show it in the plan* to jump there instead. Below the timeline: the coach allocation, then the Activities as **accordions, collapsed by default** with Expand all / Collapse all, so the plan reads as a contents list rather than a wall; then Notes and Review. A link to `#<activity-id>` opens that accordion on arrival. Every heading carries an anchor id, which is what those jumps use.
- Session pages keep their dated names permanently and are **the archive** — once a session has passed, its page stays exactly where it was, and only `next.html` moves on.

**Build requirements — apply to every page above, no exceptions:**

- **Responsive.** Every page must display well on both mobile (checking a plan pitch-side on a phone) and desktop/tablet (planning ahead) — this is the whole point of the HTML export over a flat document.
- **Consistent style.** All pages share one design system — club blue/gold palette, Oswald (headings) + Public Sans (body), both sans-serif — defined once in **`tools/theme.css`** and inlined into every page by the build script, so each page is standalone. Change the look there, not per page.
- **Diagrams are same-origin files, lazily loaded.** They used to be inlined as data URIs, because pages were standalone files shared through Drive and an external Drive URL broke under content-security policies. On a hosted site that reasoning no longer applies: the build copies the web-sized images into **`u14/img/`** and references them with `loading="lazy"`, so they are cached between pages and sessions and the HTML stays small enough to render on a bad signal at the ground. (This took the playbook from 418 KB to 27 KB and the Sunday plan from 172 KB to 36 KB.) **Never link an image to an external host** — that part of the old rule stands. Full-size originals live in `claude/images/` (several MB each); the copies that ship are in **`claude/images/web/`** (~800–1100px, 35–50 KB). Adding a diagram means adding a web-sized copy there and an entry in the script's `DIAGRAMS` map — e.g. `sips -Z 900 claude/images/new.png --out claude/images/web/new.png`.
- **Highlighting a table row.** Start a row's **first cell with `%%`** and the whole row gets a highlighted background on the site (the marker itself is stripped). Used in `claude/calendar.md` to pick out dates worth noticing. Keep it rare — it stops working the moment several rows use it.
- **Cross-references point to the site, not the source files.** Where the markdown source mentions another doc (e.g. `` `playbook.md` ``), the generated HTML should link to that doc's page on the site (`playbook.html`) — not show a `.md` filename, which isn't a real link anyone reading the site can follow.
- **No academy-library or external play-name provenance notes.** Several of our diagrams and a couple of calls (Tip/Fox) were originally cross-referenced against the club's TWRFC Academy diagram library and its own call names, to help while building this out. Keep that cross-referencing in the Drive source `.md` files (useful context for coaches), but strip it out of the generated public HTML — players/parents don't need or want another team's internal naming.

**Open feedback on the site:** after the first session the coaches said the pages are *"a little hard to follow"*. The session pages have since been rebuilt around the timeline described above, with the detail below it — worth checking that this actually answers the feedback before assuming it does.

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
