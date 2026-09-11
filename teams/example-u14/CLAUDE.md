# Example U14 — team facts

> **This is the example team.** Everything in this folder is invented. Delete the folder once you have your own team, or keep it around as a worked reference.

This age group's own context. Framework mechanics are in the root `CLAUDE.md`; the club's grounds are in `club/CLAUDE.md`.

**Read `age-group.md` and `coaching.md` before producing session plans, playbooks or drills for this team.** Session plans and drills should use the terminology in `playbook.md`.

We are **`U14`** on the club's pitch allocation (`pinLabel` in `team.json`).

## What belongs in a file like this

Whatever a person or an agent needs to work on **this squad** and would otherwise have to ask for:

- Where the team's fixtures, results and league table are published, and anything awkward about getting at them — a site that needs a browser user-agent, a page that renders client-side, two sides in different divisions that have to be checked separately.
- Where the source files actually live, if it isn't just this repo — a synced Drive folder, say — and any mechanical quirk of editing them there.
- Anything about the squad that shapes planning and isn't already in `age-group.md`.

**Not** the club's grounds (that's `club/CLAUDE.md`) and **not** how the build works (that's the root `CLAUDE.md`).

## This team's documents

Each overrides the shared default of the same name in `content/`, where there is one.

| File | Shared default? |
|---|---|
| `age-group.md` | No — always the team's own |
| `playbook.md` | Skeleton only, in `content/playbook.md` |
| `blocks.md` | No |
| `calendar.md` | No |
| `plans/` | No |
| `coaching.md`, `warmup.md`, `activities.md` | Yes — inherited here, not overridden |
| `laws.md` | Yes — taken from `content/laws/u14.md` via `ageGroup` |

This team deliberately **does not** copy `coaching.md`, `warmup.md` or `activities.md`, so it keeps inheriting improvements to them. Copy one in only when you actually want to change it.

## Keep these pages publishable

Everything here becomes a public web page. **No player, parent or guardian names, contact details, medical information or attendance data** — not in `calendar.md`, not in `age-group.md`, not in a session plan's Review. Squad-level facts that shape planning are fine and useful; anything that identifies a child is not.
