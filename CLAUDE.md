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

## Session plan mechanics

**Detailed, on-the-pitch session run-sheets** (timings, drills, setup) live in the **`plans/`** folder, one file per session, expanding that session's entry in `claude/blocks.md`. Naming convention: `plans/block{block number}-week{week number within the block, i.e. restarts at 1 for each new block}-{thur|sun}.md` — e.g. `plans/block1-week1-thur.md` for Block 1, Week 1, Thursday. Use `thur` or `sun` for the day.

**Session plan template.** Every file in `plans/` follows this structure:

1. **Session details** — a header table with: Date/Time, Location, Coaches (names of coaches in attendance — fill in on the night if not yet known), Attendance (number of children present — fill in on the night), Session objective, and Resources required.
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

- A **responsive HTML page** — one page per session, built to read well on both a phone (checking the plan pitch-side on the day) and a desktop/tablet (planning ahead). This is the default share format going forward. Diagrams embedded as real images, video links as clickable references. Rebuild it whenever the underlying plan changes, and save the standalone HTML file into the `docs/` folder (see Where these files live, below) so GitHub Pages picks it up, alongside publishing it as an Artifact.
- A **PDF**, when a flat file that travels well over WhatsApp is specifically wanted instead of (or alongside) the HTML version.

See `plans/block1-week1-thur.md` for a worked example of the markdown source, and `docs/block1-week1-sun.html` for a worked example of the responsive HTML output.

## Shared HTML reference

Alongside the per-session HTML exports above, the **`docs/`** folder holds a small linked reference site, built from the same markdown sources — this is what actually gets shared outside the coaching group (players, parents), so nothing goes in it that isn't fit for that audience.

**The site is published by GitHub Pages** from the `main` branch, `/docs` path, and is live at **[https://mcroker.github.io/rugby-u14-plans/](https://mcroker.github.io/rugby-u14-plans/)** — that URL is the link to hand out. Publishing is therefore just a matter of committing and pushing to `main`; there is no separate upload step and no Drive sharing setting to manage.

Pages on the site:

- **`index.html`** — the entry point, with cards linking to every page below. This is the one link to hand out for "a simple reference."
- **`playbook.html`** — full HTML export of `claude/playbook.md`, including the diagrams. The master reference for how we play.
- **`block1-overview.html`** — full HTML export of `claude/blocks.md`'s Block 1 section (session list, weekly outlines).
- **`claude.html`** ("Coaching Notes") — full HTML export of `claude/age-group.md` and `claude/coaching.md`, combined into the one page. The project/build instructions in this file (`CLAUDE.md`) are **not** part of the shared site.
- **`activities.html`** — full HTML export of `claude/activities.md`.
- **`calendar.html`** — full HTML export of `claude/calendar.md`.
- **`laws.html`** — full HTML export of `claude/laws.md`.
- Individual session pages (e.g. `block1-week1-sun.html`) as they're written, per the per-session convention above.

**Build requirements — apply to every page above, no exceptions:**

- **Responsive.** Every page must display well on both mobile (checking a plan pitch-side on a phone) and desktop/tablet (planning ahead) — this is the whole point of the HTML export over a flat document.
- **Consistent style.** All pages share one design system — club blue/gold palette, Oswald (headings) + Public Sans (body), both sans-serif — generated from a single **`theme.css`** file. That file is saved as the template at `docs/theme.css` alongside the pages themselves (not just held locally by whichever tool builds the site) — pull tokens/rules from it rather than inventing a new look per page.
- **Diagrams embedded, not linked.** Images are embedded directly into the HTML (as data URIs) rather than linked to an external Drive URL — external links break under viewers' content security policies and depend on Drive sharing settings staying put. Source images live in `claude/images/`; resize/compress before embedding (the source photos are typically several MB each — a diagram doesn't need to be).
- **Cross-references point to the site, not the source files.** Where the markdown source mentions another doc (e.g. `` `playbook.md` ``), the generated HTML should link to that doc's page on the site (`playbook.html`) — not show a `.md` filename, which isn't a real link anyone reading the site can follow.
- **No academy-library or external play-name provenance notes.** Several of our diagrams and a couple of calls (Tip/Fox) were originally cross-referenced against the club's TWRFC Academy diagram library and its own call names, to help while building this out. Keep that cross-referencing in the Drive source `.md` files (useful context for coaches), but strip it out of the generated public HTML — players/parents don't need or want another team's internal naming.

**Keeping this in date:** whenever `playbook.md`, `blocks.md`, `age-group.md`, `coaching.md`, `activities.md`, `calendar.md`, `laws.md`, or a `plans/` file changes, rebuild the corresponding HTML page(s) — applying all the build requirements above — and re-save them into `docs/` (same filenames, so Pages URLs keep working), then commit and push to `main` to publish — index.html's links only need updating when a page is added or removed, not on every content edit.

**Also published as Artifacts** (private links, shareable from the artifact's own share menu) — update these in place with the same file path/URL rather than creating new ones each time a page is rebuilt, so the links stay stable:

- Index: https://claude.ai/code/artifact/17c5d121-13b2-48a5-8561-f3ab041a589f
- Playbook: https://claude.ai/code/artifact/ab9707ba-7ecc-4ef5-8bd6-23244eb029e3
- Block 1 overview: https://claude.ai/code/artifact/68dcb595-d202-4884-a2da-aaf15c94049b
- Week 1 (Sun) session: https://claude.ai/code/artifact/c7566936-e345-44e2-9e1e-ae4ab745f15f
- Coaching Notes (`age-group.md` + `coaching.md`): https://claude.ai/code/artifact/7f598490-83c8-4222-ae75-84e212798639
- Activities Bank: https://claude.ai/code/artifact/42aa9cad-7cf9-48a4-b397-35d344d1809e
- Calendar: https://claude.ai/code/artifact/1b5b520d-ed4c-499c-ad29-a67d12c74e0b
- Laws of the Game: https://claude.ai/code/artifact/9bba79a3-d5c7-429e-a1f4-ccbe24ea18a1

## Where these files live

**Google Drive is now the source of truth for the `claude/` and `plans/` markdown files.** They're saved as plain `.md` files in a **U14 Rugby** folder in Drive (mcroker@gmail.com), mirroring this project's structure:

- Folder: `U14 Rugby` — [https://drive.google.com/drive/folders/1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU](https://drive.google.com/drive/folders/1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU) (id `1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU`)
  - `claude/` subfolder (id `1Udsw9IVyvCi5I7XRl_AnOAHh7u8FXqem`) — `age-group.md`, `coaching.md`, `playbook.md`, `blocks.md`, `activities.md`, `laws.md`, `calendar.md`, and an `images/` subfolder of diagrams sourced from the club's TWRFC Academy library and embedded into `playbook.md`
  - `plans/` subfolder (id `1qtc7cyYEqEryu_masZQCQodltzKe5sZw`) — one markdown file per session, e.g. `block1-week1-sun.md`
  - `docs/` subfolder (formerly `Public (HTML)`) — the responsive HTML export of every page on the site (see Shared HTML reference above), kept separate from the markdown so this one folder is what gets shared with players/parents/coaches. **This is the GitHub Pages publishing root** (`main` branch, `/docs` path → [https://mcroker.github.io/rugby-u14-plans/](https://mcroker.github.io/rugby-u14-plans/)), so the folder name and the filenames in it are load-bearing — renaming either breaks live links. Standalone full HTML documents (own `<!DOCTYPE>`/`<head>`/`<body>`, with the viewport meta tag needed for the responsive layout to work when opened directly rather than through an Artifact wrapper) — not the head-only fragment used when publishing via the Artifact tool. Also holds `theme.css` (the shared design-system template — see Shared HTML reference above) and `index.html` (the linking page for everything else, and the site's landing page).

**Drive is now the single source of truth — there are no parallel copies of these files as Claude Project docs any more.** Read and edit the Drive files directly; nothing needs mirroring back anywhere else. When a computer is linked and has this Drive folder synced locally, prefer editing the local synced copy (fast, no round-trip) — fall back to the connected Google Drive tool (trash + recreate, per the mechanical note below) when no linked computer/local sync is available.

**Mechanical note:** the connected Google Drive tool has no in-place content-update call — only file metadata (title/parent) can be patched directly. To "edit" a file's content in Drive, the working approach is: trash the old file (`trash_file`) and create a replacement with the same title in the same parent folder (`create_file`, with `disableConversionToGoogleType: true` and `contentMimeType` set to `text/markdown` or `text/html` as appropriate, so it stays a plain file rather than converting to a Google Doc). This means a file's Drive file-ID (and therefore its direct `/file/d/...` link) changes every time it's edited — the folder links above stay stable, but don't rely on a bookmarked link to one specific file surviving an edit.

**Sharing the site:** the HTML is now shared via GitHub Pages, not via Drive. Hand out [https://mcroker.github.io/rugby-u14-plans/](https://mcroker.github.io/rugby-u14-plans/) — it's public, needs no Drive permissions, and updates on every push to `main`. The old approach (sharing the Drive folder, which the connected Drive tool could only do per-named-person) is no longer needed.
