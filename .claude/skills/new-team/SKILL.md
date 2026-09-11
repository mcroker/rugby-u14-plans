---
name: new-team
description: Add an age group to the club's site — creates teams/<slug>/ with its config and starting documents, inheriting the shared defaults. Use when asked to add a team, an age group, or a second squad to the site.
---

# Adding a team

A team is a folder in `teams/` with a `team.json` in it. Everything else it inherits from `club/` and `content/` until it writes its own.

## 1. Ask what you need

Don't guess these:

- **Slug** — the URL sub-directory, lowercase: `u15`, `u13g`. This is permanent once shared, so get it right.
- **Display name** — "U15 Rugby".
- **Age group** — picks the laws doc from `content/laws/<ageGroup>.md`. Check that file exists; if it doesn't, say so and offer to write it.
- **Pin label** — what this team is called on the club's pitch allocation map, e.g. `U15M`.
- **Squad shape** — how many teams within the age group, rough skill level, anything about the group that changes how sessions should be planned (neurodiversity, physical profile, split by ability).
- **Training days and venues** — which days, where, and whether that changes through the season.

## 2. Create the folder

```
teams/<slug>/
  team.json          name, title, sub, sub2, ageGroup, pinLabel, order, card
  CLAUDE.md          team facts, for whoever works on it next
  age-group.md       squad context — always the team's own
  blocks.md          block themes and the session list
  calendar.md        fixtures and training dates
  playbook.md        copied from content/playbook.md and filled in
  plans/             empty until the first session is written
  images/web/        empty until there is a diagram
```

Copy `content/playbook.md` as the starting skeleton — **don't copy another team's playbook**, and don't inherit one. A playing style is the most team-specific thing a squad has.

**Leave out anything the team is happy to inherit.** `coaching.md`, `warmup.md`, `activities.md` and the laws all have shared defaults. Only copy one into the team folder when the team actually wants to change it — a copied file stops tracking the default from that moment.

## 3. Frontmatter on every doc

Each markdown doc needs frontmatter declaring its page, or it won't appear:

```
---
page: blocks.html
h1: Block 1 — Session Plans
sub: …
crumb: Block 1 overview
group: Block 1 · Weeks 1–6
order: 0
withPlans: true
card: …
---
```

`group` puts its card on the team's index; `withPlans: true` lists the session run-sheets under that group. A doc with no `group` gets a page but no card.

## 4. Check it builds

```
node tools/build_site.ts _site
```

Confirm `_site/<slug>/index.html` exists, that the new team appears on `_site/index.html`, and that the pages it inherited (warm-up, activities, laws) are there. A clean exit means no warnings.

## Don't

- **Don't touch `tools/`.** Adding a team needs no code change. If something seems to, that's a gap in the config — say so.
- **Don't put PII in `calendar.md`** — no player, parent or guardian names, contact details or attendance data. It is a public page.
