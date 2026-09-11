# Rugby session plans — a coaching site framework

Coaching material for a rugby club's age groups — squad context, playing style, session plans — and the linked HTML site built from them. **One site per team**, published to its own sub-directory, from one repository.

This file is the **framework**: how the repo fits together, the session-plan contract the build reads, and the house style. It ships upstream and is improved upstream, so **nothing club- or team-specific belongs here**:

- **Club facts** — the grounds, the pitch allocation, how halves are named — live in **`club/CLAUDE.md`**.
- **Team facts** — the squad, its fixtures, where its files live — live in **`teams/<slug>/CLAUDE.md`**.

Before writing session plans, playbooks or drills for a team, read that team's **`age-group.md`** and **`coaching.md`**, and use the terminology in its **`playbook.md`**.

## The documents a team has

Each is resolved through the three layers below, so a team has all of these whether it wrote them or not.

| Doc | What it holds | Usually |
|---|---|---|
| **`age-group.md`** | Squad context: who the players are, physical and skill profile, neurodiversity, training days and facilities, how the squad splits into groups. | Team's own |
| **`coaching.md`** | How sessions are coached: the 6-week block model, whole–part–whole, skill zones, the mandatory two-minute contact warm-up, the skills pyramid, resources, the coaching team. | Shared default |
| **`warmup.md`** | The five-minute player-led warm-up every session opens with. The separate two-minute **contact warm-up** (in `coaching.md`) still precedes any tackling. | Shared default |
| **`activities.md`** | A bank of games and drills, tagged by skill focus, to draw on when building sessions. | Shared default |
| **`playbook.md`** | The team's calls and shapes — a clean, players-shareable reference. No squad or coaching context in it. | Team's own, from a skeleton |
| **`laws.md`** | RFU age-grade laws for that age group. Picked automatically from `content/laws/<ageGroup>.md` by the team's `ageGroup`. | Shared default |
| **`blocks.md`** | Block themes and session-by-session plans. | Team's own |
| **`calendar.md`** | The season's fixtures and training dates. Keep it non-PII — no player, parent or guardian names, contacts or attendance data. | Team's own |
| **`plans/`** | On-the-pitch run-sheets, one file per session (see Session plan mechanics). | Team's own |

**`tools/`** holds `build_site.ts`, which generates every site, `lib/` the rendering machinery, and `theme.css` the shared design system it inlines.

## How the repo is laid out

The build serves **one site per team**, from three layers. When it looks for a file it takes the first of these that has it, and takes it **whole** — there is no merging:

| Layer | Holds | Published to |
|---|---|---|
| **`teams/<slug>/`** | What that team wrote — its playbook, blocks, calendar, squad notes, `plans/`, `images/`, and a `team.json` | `<your-domain>/<slug>/` |
| **`club/`** | What the whole club shares — `club.json` (name, location, allocation URL), `pitch-zones.json`, `rewrites.json`, the allocation map | — |
| **`content/`** | The defaults every team inherits | — |

So **a team overrides a default by copying it into its own folder and editing it**; from then on that team owns the file and stops inheriting changes to the default. Adding a team is adding a folder with a `team.json` in it — nothing in `tools/` changes.

The landing page at the root of the domain lists the teams, and each team's own `index.html` is its index as before.

**Nothing about a team belongs in `tools/`.** Location, pitch zones, the map-pin label, redactions, page titles and index cards are all config or frontmatter. If something team-specific seems to need a code change, that's a gap in the config — say so rather than hard-coding it.

## Session plan mechanics

**Detailed, on-the-pitch session run-sheets** (timings, drills, setup) live in the **`teams/<slug>/plans/`** folder, one file per session, expanding that session's entry in `blocks.md`. Naming convention: `teams/<slug>/plans/block{block number}-week{week number within the block, i.e. restarts at 1 for each new block}-{thur|sun}.md` — e.g. `teams/<slug>/plans/block1-week1-thur.md` for Block 1, Week 1, Thursday. Use `thur` or `sun` for the day.

**House style — say the thing, not why it was decided.** Plans are read while running a session. State the fact or the instruction and stop:

- *"The Training Area, St Marks. Floodlit."* — not *"The Training Area at the club, the floodlit area below Pitch 4, because Thursdays are at the club until the end of October (see `age-group.md`)."*
- **Don't explain a design decision in the plan.** Why the tackle zone is front-loaded, or why the game is narrow, belongs in `blocks.md` or a Review — not in the run-sheet a coach is holding.
- **Don't cross-reference a page the plan already carries.** The warm-up and contact warm-up are on the page; pointing at `coaching.md` for them is noise. A reference to something genuinely elsewhere — the laws, the activities bank — is fine.
- **Session details cells are one short fact each.** Caveats go in Notes.
- **Activities entries are notes, not prose.** They are read seconds before running the thing, and Description, Coaching Points and Progressions are what the Details modal shows. Give the facts — the numbers, the sequence, the conditions, the cues — and stop. **Cut every clause that explains why:** no *"the point is…"*, no *"…here on purpose"*, no *"that is what X is for"*, no restating the session's intent. Prefer a numbered sequence or a bulleted list to a paragraph. Write each Progression and Adaptation as one line, condition then response — *"Attack getting out too easily: narrow the channel."* If a rationale genuinely needs recording, it belongs in `blocks.md` or the session's Review, not here.

**A session that has happened is a record — don't edit it.** Once a session has run, its file in `teams/<slug>/plans/` stays as it was, plus its Review. **Improvements to the way we plan and run sessions go into the next plan forward, never back into completed ones**: a new template section, a better way of writing a block, a format that worked — apply them from the next session on. The archive is what we actually did on the day, and it stops being that the moment it gets tidied up. The Review is the one thing added after the fact.

**Session plan template.** Every file in `teams/<slug>/plans/` follows this structure. **The build reads it structurally, not just as prose** — the headings and the shape of the two tables are a contract, and the notes below each part say what depends on them. Getting one wrong fails the build rather than quietly producing a broken page.

| Markdown | Becomes, on the page |
|---|---|
| the `---` **frontmatter** block at the very top | the page's date, heading, subtitle, breadcrumb and index card |
| `## Session details` — the **Session objective** row | an **Objective** heading at the top of the page, above everything else |
| `## Session details` — the other rows | the collapsed **Logistics** accordion, with the pitch map inside it, plus the generated **Weather** and **Sunset** rows |
| `## Initial setup` | a second collapsed accordion directly below Logistics — the cone layout, for the first coach on the ground |
| `## Plan` — the **first** table | the **timeline**: one block per row, rows sharing a start time drawn side by side |
| `## Plan` — anything after that table | kept, rendered below the timeline (this is where a coach allocation goes) |
| `## Activities` — each `### ` entry | a **collapsed accordion**, and the source of its timeline block's setup/cues and Details modal |
| `## Notes`, then `## Review` | rendered below, as written, in that order — the generated warm-up entry is spliced in at the end of `## Activities`, so anything after it stays where it is written |


0. **Frontmatter** — a `---` block at the very top of the file, before the H1. This is what puts the session on the site; **there is no second list to update anywhere else.**

   ```
   ---
   date: 2026-09-17
   start: "18:45"
   h1: Week 2 — Thursday
   sub: Scrum on the machine, non-contested, and exit kicks introduced for the backs.
   sub2: Thu 17 Sep 2026, 6.45–8.15pm
   crumb: Week 2 (Thu)
   draft: true
   card: "Run-sheet for the midweek session: scrum technique, exit kicks, and one game."
   ---
   ```

   | Field | What it does |
   |---|---|
   | **`date`** | ISO `YYYY-MM-DD`. Decides which plan is **next** — it has to be right. |
   | **`start`** | Clock time that `+0` in the Plan table means. Also decides whether a Sunset row appears (16:00 or later). |
   | **`h1`** | Page heading, and the title in the browser tab. |
   | **`sub`** / **`sub2`** | The two lines under the heading. `sub2` is where the human date-and-time range goes. |
   | **`crumb`** | Breadcrumb text. |
   | **`card`** | The index card's description. |
   | **`draft: true`** | Banners the page and badges its card *Draft — work in progress*, so nobody prints a half-finished plan. Remove it when ready; the marking follows the plan through `next.html`. |
   | **`badge`** | Optional. Defaults to the date, short — "17 Sep". |
   | **`sunset`** | Optional. Overrides the 16:00 rule either way. |

   A value with a colon in it (`"18:45"`) or a leading quote needs quoting; everything else can be written bare.

1. **Session details** — a header table with: Date/Time, Location, Coaches (names of coaches in attendance — fill in on the night if not yet known), Attendance (number of children present — fill in on the night), Session objective, and Resources required.

   For a home session, **Date/Time and Location come from the club's pitch allocation** (see `club/CLAUDE.md`) — find this team's row for that date and use its **time** and its **pitch zone**. Then, straight after the table, include the **allocation map with our pitch marked**, by writing an image whose target is the zone code:

   ```
   ![Our pitch this session, on the club allocation map.](pitch:2b)
   ```

   **Two logistics rows are generated, not written — don't type either into the markdown.**

   - **Weather** — the forecast for the club over the session's hours (condition, temperature, wind, chance of rain), fetched at build time from Open-Meteo. It appears on **every** plan whose date is still ahead, and disappears once the session has passed, so an archived page never claims to know what the weather was going to be. The daily 05:00 rebuild refreshes it; the row says how old the forecast is. No network (an offline local preview) simply means no row — it never fails the build.
   - **Sunset** — added automatically to any session starting at 16:00 or later, computed for the club's location on that date, in local time, so it follows the clocks changing. It is what tells a coach whether the session finishes in the light. Override with `sunset: false` (or `sunset: true`) in the plan's frontmatter on the rare session where the default is wrong.

   The map does not sit open on the page: it becomes a **Map** button beside the Location row, opening the club map with this team's marker pinned on that zone (the label is `pinLabel` in `team.json`). A new week only means changing the zone code. Zone codes are the club's own and are listed in `club/pitch-zones.json`; an unknown code fails the build. Keep the caption free of markdown links (square brackets in the caption break the image match).
2. **Initial setup** — **the cone layout, and nothing else.** A short bulleted list of what goes out before the players arrive: which cones, how many, where, what spacing, and where the shields/mats/machine sit if they define a position. **No drills, no explanation, no reasons** — the coach reading it is on an empty pitch with a bag of cones and fifteen minutes. Optional: a plan without the section simply doesn't get the accordion.
3. **Plan** — a three-column table, one row per activity: start time + duration, Activity, and a one-line summary. This becomes the timeline, so the first cell is load-bearing:

   - It **must** read `+<start>, <n> min` — e.g. `+7, 13 min`. A row that doesn't fails the build.
   - **The page shows real clock times**, not `+7`. Set **`start`** in the plan's frontmatter to the time `+0` means (`"18:45"`). The markdown stays relative, so moving a session is one field, not a rewritten table. Without `start` the page falls back to showing `+7`.
   - **Rows sharing a start time are drawn side by side** as parallel blocks. That is how the page shows the squad splitting; nothing else marks it.
   - An italic parenthetical after the time — `+7, 13 min *(parallel pull-out)*` — becomes a tag on the block.
   - Only the **first** table in this section is read as the run sheet, so a coach allocation or any other table can follow it.
4. **Activities** — a `### ` entry per activity. Each becomes a collapsed accordion **and** feeds its block on the timeline, so write them for a coach who is about to run the thing:

   - **`**Groups:**`** comes **first, directly under the `### ` heading**, and says how many children and how they are split — and nothing else. **A few words: "Groups of five", "All forwards", "Two pitches — 7 v 7 on each", "Whole squad, one circle".** It is lifted onto the timeline block as *Groups*, ahead of the setup, because splitting the squad is the first thing that has to happen and the slowest to fix once it is wrong. Unlike Setup and Coaching Points it is used **whole**, not first-sentence-only, so keep it to one short phrase. Every entry gets one; the generated warm-up entry has its own.
   - **`**Setup:**`** and **`**Coaching Points:**`** are lifted onto the timeline block as *Set up* and *Call* — **first sentence only**, so lead with the instruction and put the caveats after it. A bare cross-reference (`see \`activities.md\`.`) is skipped, so don't make it the whole first sentence.
   - **`**Description:**`**, **`**Coaching Points:**`** and **`**Progressions:**`** are what the block's **Details** modal shows.
   - An entry is matched to its row by the words in the title, so keep the two recognisably the same. No match means no setup, cues, Details button or link for that block — it falls back to the Plan table's summary.
   - The **player-led warm-up entry is generated automatically** from the team's `warmup.md` — don't write one.

   Write an entry for anything that warrants it (a new skill or system, anything worth a diagram or video); a row like a cool-down needs none. Check **`activities.md`** first for a reusable game/drill before inventing a new one. Each entry can include:
   - **Groups** — the numbers/split line above; on every entry, and always first
   - Coaching Points (kept to a small number of focus areas)
   - Setup
   - Description
   - **Progressions** — a bulleted list of ways the activity could be advanced, this week or in later weeks. List the options; it's the coach's call on the night which of them (if any) to apply, and how many.
   - **Adaptations** — a bulleted list of ways to vary the drill on the fly to get a different outcome — space, group size/numbers, player pairing, speed/tempo, etc. Unlike Progressions (which build the skill forward over time), Adaptations are about tuning today's version of the drill to the group actually in front of the coach.
   - **Diagram** and/or **Video example(s)**, where useful — see below.
5. **Notes** — a free-text section for caveats, placeholders (e.g. a call or system not yet finalised), and anything else worth flagging to whoever runs the session.
6. **Review** — **last on the page, after Notes**, and added *after* the session: what actually happened, from the coaches' feedback. What worked, what to change, and anything carried forward into the next weeks. Keep the durable lessons out of here and in the right doc — a coaching-delivery lesson belongs in `coaching.md`, a playing-style one in `playbook.md`, a next-week consequence in `blocks.md` — and leave the session-specific detail here.

**Diagrams, video, and sharing.** Diagrams should be produced as actual images (e.g. a simple PNG sketch), not plain-text/ASCII art — text diagrams don't render usefully once the plan is shared outside the project. The markdown file in `teams/<slug>/plans/` stays the authoritative working source (image referenced by filename). When a plan is ready to hand to the coaching group, export it as:

- A **responsive HTML page** — one page per session, built to read well on both a phone (checking the plan pitch-side on the day) and a desktop/tablet (planning ahead). This is the default share format going forward. **You don't write this page by hand, and you don't register it anywhere:** add the run-sheet to `teams/<slug>/plans/` with its frontmatter filled in (see the template above) and push — the workflow builds the page and its index card automatically. See Shared HTML reference below.
- A **PDF**, when a flat file that travels well over WhatsApp is specifically wanted instead of (or alongside) the HTML version.

See `teams/example-u14/plans/block1-week1-sun.md` for a worked example of the markdown source, and the page it builds for the responsive HTML output — build the site locally and open `_site/example-u14/block1-week1-sun.html` side by side with the markdown.

## Shared HTML reference

Alongside the per-session pages above, the site is a small linked reference built from the same markdown sources — this is what actually gets shared outside the coaching group (players, parents), so nothing goes in it that isn't fit for that audience.

**The HTML is generated, never hand-edited and never committed.** `tools/build_site.ts` builds every page from `teams/`, `club/` and `content/`, and the `.github/workflows/pages.yml` workflow runs it on each push to `main` and deploys the result straight to GitHub Pages. The link to hand out for a team is its stable next-session one — `<your-domain>/<slug>/next.html`, which always shows whatever session is coming up.

**Each team's pages are published into its own sub-directory** of the domain — `/u14/`, `/u15/` — with a landing page at the root listing them. Every link within a team's site is relative, and each team's footer links back up to the landing page.

So **publishing is just editing the markdown and pushing.** To preview locally first:

```
node tools/build_site.ts _site          # Node 23.6+
node --experimental-strip-types tools/build_site.ts _site   # Node 22.6–23.5
```

Then open the files in `_site/` (git-ignored). Node runs the TypeScript directly by stripping types, so **the build itself needs no dependencies and no compile step** — nothing to install before previewing. TypeScript is a dev dependency for `npm run typecheck` (`tsc --noEmit`) only, which CI runs before every build, because stripping types does not check them. Run `npm ci` first if you want to type-check locally.

The script **exits non-zero on any warning** (a diagram it can't find, a plan with no frontmatter, a run-sheet row it can't read as `+N, N min`), so a problem fails the build loudly instead of quietly publishing a broken page. A stale rewrite rule in `club/rewrites.json` is the one thing reported as a **note** rather than a warning — a reworded sentence leaves one slightly awkward cross-reference, which is not worth refusing to publish over.

Pages on the site:

- **`index.html`** — the entry point, with cards linking to every page below. This is the one link to hand out for "a simple reference."
- **`playbook.html`** — full HTML export of the team\'s `playbook.md`, including the diagrams. The master reference for how we play.
- **`block1-overview.html`** — full HTML export of the team\'s `blocks.md`'s Block 1 section (session list, weekly outlines).
- **the Coaching Notes page** — `age-group.md` and `coaching.md` combined onto one page (two docs naming the same `page:` are concatenated in `order`). The instructions in the `CLAUDE.md` files are **not** part of the shared site.
- **`activities.html`** — full HTML export of the team\'s `activities.md`.
- **`calendar.html`** — full HTML export of the team\'s `calendar.md`.
- **`laws.html`** — full HTML export of the team\'s `laws.md`.
- **`warmup.html`** — full HTML export of the team's `warmup.md`.
- **`next.html`** — **the stable link.** It carries the upcoming session's page itself, so the URL you hand out never changes and stays `next.html` in the address bar. Today counts as next all day; if every session is in the past it shows the most recent one. The same page also lives at its dated URL, and `next.html` links to that as the permanent one.
- **`<plan>.html`** — **one page per session**, built to be read top-down at the ground and in depth when planning. The session objective at the top under its own **Objective** heading, then a collapsed **Logistics** accordion (the rest of the session details, and the pitch map), then the run sheet as a **timeline** — time down the page, and a stretch where several things happen at once splits into that many columns. Each block shows only what you need to *run* it (setup and cues, taken from the plan's own Activities entry) with a **Details** button opening a modal of that activity. The modal is filled at click time by cloning the activity's own section out of the page below, so the detail exists once in the HTML and the modal is only a view onto it — and it offers *Show it in the plan* to jump there instead. Below the timeline: the coach allocation, then the Activities as **accordions, collapsed by default** with Expand all / Collapse all, so the plan reads as a contents list rather than a wall; then Notes and Review. A link to `#<activity-id>` opens that accordion on arrival. Every heading carries an anchor id, which is what those jumps use.
- Session pages keep their dated names permanently and are **the archive** — once a session has passed, its page stays exactly where it was, and only `next.html` moves on.

**Build requirements — apply to every page above, no exceptions:**

- **Responsive.** Every page must display well on both mobile (checking a plan pitch-side on a phone) and desktop/tablet (planning ahead) — this is the whole point of the HTML export over a flat document.
- **Consistent style.** All pages share one design system — club blue/gold palette, Oswald (headings) + Public Sans (body), both sans-serif — defined once in **`tools/theme.css`** and inlined into every page by the build script, so each page is standalone. Change the look there, not per page.
- **Diagrams are same-origin files, lazily loaded.** They used to be inlined as data URIs, because pages were standalone files shared through Drive and an external Drive URL broke under content-security policies. On a hosted site that reasoning no longer applies: the build copies the web-sized images into **each team's `img/`** and references them with `loading="lazy"`, so they are cached between pages and sessions and the HTML stays small enough to render on a bad signal at the ground. (This took the playbook from 418 KB to 27 KB and the Sunday plan from 172 KB to 36 KB.) **Never link an image to an external host** — that part of the old rule stands. Full-size originals live in the team's `images/originals/` (several MB each); the copies that ship are in **the team's `images/web/`** (~800–1100px, 35–50 KB). **Adding a diagram is adding the web-sized copy** — e.g. `sips -Z 900 teams/<slug>/images/originals/new.png --out teams/<slug>/images/web/new.png` — and then referencing it by filename: `![A caption](new.png)`. Everything in that folder is copied into the site; there is no list to keep in step with it. An image the markdown asks for and the folder doesn't have fails the build.
- **Highlighting a table row.** Start a row's **first cell with `%%`** and the whole row gets a highlighted background on the site (the marker itself is stripped). Used in `calendar.md` to pick out dates worth noticing. Keep it rare — it stops working the moment several rows use it.
- **Cross-references point to the site, not the source files.** Where the markdown source mentions another doc (e.g. `` `playbook.md` ``), the generated HTML should link to that doc's page on the site (`playbook.html`) — not show a `.md` filename, which isn't a real link anyone reading the site can follow.
- **Keep working-notes provenance off the public pages.** Source notes, cross-references to another club's diagram library, internal naming — useful in the markdown, noise or worse on a page players and parents read. Configure what gets stripped in `club/rewrites.json` rather than maintaining two copies of a document.

**Open feedback on the site:** after the first session the coaches said the pages are *"a little hard to follow"*. The session pages have since been rebuilt around the timeline described above, with the detail below it — worth checking that this actually answers the feedback before assuming it does.

**Keeping this in date:** nothing to do — the workflow rebuilds every page from the markdown on each push to `main`, so the site cannot drift out of sync with the sources. The index's cards are generated too, so adding a session plan needs no separate index edit.

The workflow **also runs daily at 05:00 UTC**, because `next.html` depends on the date rather than on anything in the repo: without a scheduled rebuild it would still be advertising last week's session. (GitHub disables scheduled workflows after 60 days with no repo activity — if `next.html` ever goes stale, check the Actions tab first.)
