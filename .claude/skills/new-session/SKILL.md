---
name: new-session
description: Write a session run-sheet for a team — scaffolds the plan file with correct frontmatter, pulls the pitch and time from the club allocation, reuses drills from the activities bank, and checks it builds. Use when asked to plan, write or draft a training session for a given week/day.
---

# Writing a session run-sheet

A run-sheet is read **while running a session**, on a phone, on a pitch, in the rain. Everything below serves that.

## 1. Work out which session this is

Ask if it isn't clear: which team, which block, which week, Sunday or Thursday.

Then read, in this order:

1. The team's **`blocks.md`** — the row for this session. It names the focus, the forwards/backs split, and anything carried forward from the last session's Review. **This is the brief.** If the row says "Needed", this is the session to write.
2. The team's **`age-group.md`** and **`coaching.md`** — squad, venue, how sessions are run.
3. The team's **`calendar.md`** — confirm the date, and that it is a training session and not a match.

If `blocks.md` and `calendar.md` disagree about a date, **stop and say so** rather than picking one.

## 2. Get the logistics right

- **Home Sunday session:** the time and pitch come from the club's pitch allocation (the URL is in `club/CLAUDE.md`). Find this team's row for that date; use its time and its zone code.
- **Midweek:** the venue is in `age-group.md`. It can change mid-season — check rather than assuming.
- Write the zone code into the plan as `![caption](pitch:2b)`. Codes are in `club/pitch-zones.json`; an unknown one fails the build.

## 3. Check the activities bank first

**Read the team's `activities.md` before inventing anything.** Reusing a game the squad already knows costs no explaining time, and a block is meant to build week to week — the same game with the constraint tightened beats a new one. Only write a new activity when nothing there fits.

## 4. Write it

Follow the **session plan template** in the root `CLAUDE.md` exactly — the headings and the two tables are a contract the build reads, not just prose. In particular:

- **Frontmatter first**, before the H1. `date` (ISO) decides which session is "next", so it must be right. Set `draft: true` while you are still working on it.
- The **Plan** table's first cell must read `+<start>, <n> min`. Rows sharing a start time are drawn side by side — that is the only thing that marks the squad splitting.
- Every **Activities** entry starts with `**Groups:**` — a few words on how the squad splits, nothing else.
- `**Setup:**` and `**Coaching Points:**` are lifted onto the timeline **first sentence only**, so lead with the instruction and put caveats after.

**House style: say the thing, not why it was decided.** No rationale in a run-sheet — that belongs in `blocks.md` or the Review. Cut every clause that explains why.

## 5. Check it builds

```
node tools/build_site.ts _site
```

(Node 22.6–23.5 needs `--experimental-strip-types`.) It **exits non-zero on any warning**, so a clean exit means the frontmatter parsed, every activity matched its row, and every image and pitch zone resolved. Fix anything it reports before saying you're done.

Then update the team's `blocks.md`: point the session's row at the new file and take it off the "still to write" list.

## Don't

- **Don't edit a session that has already happened.** Its file is the record of what was actually done. Improvements go into the next plan forward. The Review is the only thing added after the fact.
- **Don't put the plan anywhere but `teams/<slug>/plans/`**, and don't register it anywhere else — there is no second list.
