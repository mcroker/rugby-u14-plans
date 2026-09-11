# Rugby session plans

A small static-site generator for a rugby club's coaching material. You write markdown — squad notes, a playbook, session run-sheets — and it publishes **one site per age group**, built to be read on a phone at the side of a pitch.

It ships with sensible defaults for the generic parts of coaching (how sessions are structured, a player-led warm-up, a bank of games and drills, the RFU age-grade laws), so a new team starts with something rather than nothing and overrides only what it wants to change.

## What you get

- **A page per session** — objective at the top, logistics folded away, then the run sheet as a **timeline**: time down the page, and a stretch where the squad splits into parallel columns. Each block carries only what you need to run it, with a **Details** button for the rest.
- **A stable link** — `/<team>/next.html` always shows the upcoming session, so the URL you hand to the coaching group never changes.
- **Live logistics** — the sunset time and a weather forecast are computed for the club's location and added to each upcoming session; both disappear once the session has passed, so an archived page never claims to know what the weather was going to be.
- **A pitch map** with your team's slot pinned on it, from a one-word zone code in the plan.
- **The archive** — every session keeps its dated URL permanently.

## Getting started

1. **Fork this repository.**
2. **Settings → Pages → Source: GitHub Actions.**
3. Set up your club and first team. If you use [Claude Code](https://claude.ai/code), the repo ships skills for this — run `/setup-club`, then `/new-team`. Otherwise follow [`.claude/skills/setup-club/SKILL.md`](.claude/skills/setup-club/SKILL.md) by hand; it's a short checklist.
4. Push. The workflow builds and deploys.

To preview locally — **no install step, no dependencies**:

```
node tools/build_site.ts _site          # Node 23.6+
node --experimental-strip-types tools/build_site.ts _site   # Node 22.6–23.5
```

Then open `_site/index.html`.

## How it fits together

Three layers. The build takes the first one that has a file, and takes it **whole**:

| Layer | Holds |
|---|---|
| **`teams/<slug>/`** | What that team wrote — playbook, blocks, calendar, squad notes, `plans/`, `images/`, and a `team.json`. Publishes to `/<slug>/`. |
| **`club/`** | What the whole club shares — name and location, pitch zones, the allocation map, redactions. |
| **`content/`** | The defaults every team inherits. |

So **a team overrides a default by copying it into its own folder and editing it.** There's no merging and no partial override: from that moment the team owns the file.

**Adding a team is adding a folder with a `team.json` in it.** Nothing in `tools/` changes — location, pitch zones, map-pin labels, page titles and index cards are all config or markdown frontmatter. If something team-specific looks like it needs a code change, that's a gap in the config, and worth an issue.

## Writing a session

A run-sheet is a markdown file in `teams/<slug>/plans/` with a frontmatter block on top:

```markdown
---
date: 2026-09-17
start: "18:45"
h1: Week 2 — Thursday
sub: Scrum on the machine, and exit kicks introduced for the backs.
sub2: Thu 17 Sep 2026, 6.45–8.15pm
crumb: Week 2 (Thu)
draft: true
card: Run-sheet for the midweek session.
---
```

That's all the registration there is — no second list to update. `date` decides which session is "next"; `draft: true` banners the page so nobody prints a half-finished plan.

Below it, the file follows a template the build reads structurally: `## Session details`, `## Initial setup`, `## Plan` (whose first table becomes the timeline), `## Activities`, `## Notes`, `## Review`. The full contract is in [`CLAUDE.md`](CLAUDE.md).

**The build exits non-zero on any warning** — a missing diagram, a plan with no frontmatter, a run-sheet row it can't read — so a mistake fails loudly instead of quietly publishing a broken page.

## Working with Claude Code

The repo ships skills in [`.claude/skills/`](.claude/skills/):

| Skill | What it does |
|---|---|
| `/setup-club` | One-time setup of a fresh fork. |
| `/new-team` | Adds an age group. |
| `/new-session` | Writes a session run-sheet — reads the block brief, checks the pitch allocation, reuses drills from the activities bank. |
| `/session-review` | Records what happened after a session, and routes the durable lessons into the right document. |
| `/check-build` | Builds and explains whatever it reports. |

Context lives in three `CLAUDE.md` files, matching the three layers: the root one is the framework, `club/CLAUDE.md` is your grounds, `teams/<slug>/CLAUDE.md` is that squad. A fork replaces the second and third and leaves the first alone — which is what keeps `git merge upstream/main` boring.

## Staying up to date

```
git remote add upstream https://github.com/<upstream>/rugby-plans
git merge upstream/main
```

Engine fixes and default-content improvements land cleanly as long as your own content stays out of `tools/`.

## Licence

MIT. The coaching content in `content/` is offered as a starting point — check it against current RFU age-grade regulations for your season before relying on it, since those are reviewed annually.
