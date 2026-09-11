# Tunbridge Wells RFC — club facts

Everything here is about **this club's grounds and how they are allocated**. It is the layer between the framework (root `CLAUDE.md`) and a team (`teams/<slug>/CLAUDE.md`). A fork replaces this whole file.

## Pitch allocation

[https://pitch.twrfc.com/](https://pitch.twrfc.com/) — the club's allocation of pitches and times for each Sunday at home. **This is the source of the start/end time and the pitch for every home session**, so check it when writing or running a Sunday plan. It covers club sessions only; away-from-the-club midweek venues aren't on it.

**Reading the map's labels.** Where a zone is labelled with two age groups — `U12M / U14M`, `U11 / U15M` — that is **two consecutive slots on the same ground, not two groups sharing it**. The club runs the minis and younger juniors from **9:00–10:30**, then the older juniors, academy and ladies from **10:45–12:30**. The second name has the zone to itself for its slot; the group named before is off it by 10:30.

It does mean the ground is still in use right up to the changeover, so nothing can be set out early.

## How the pitches are numbered

The allocation map shows the grounds from above, with the **Club House** at the bottom-left. Our names for what it shows:

| | |
|---|---|
| **Pitch 1** | Nearest the Club House. |
| **Pitch 2** | To the right of Pitch 1. |
| **Pitch 3** | To the right of Pitch 2. |
| **Pitch 4** | The pitch at the top of the map. |
| **Training Area** | The square blue area just below Pitch 4 — **the floodlit area**, and so where evening sessions are while we are at the club. Its zone code is `training`; it is not one of the club's Sunday allocation codes, and its pin position is estimated from the map rather than taken from the club's own data. |
| **Touch Pitch** | The blue rectangle above Pitch 1 — beyond it, away from the Club House. |

## Naming half a pitch

Teams are often allocated half a pitch, shared with another age group. Halves are named **as seen standing at the Club House looking out over the grounds**, so the split runs differently depending on where the pitch is:

- **Pitches 2 and 3** — **left** and **right**.
- **Pitches 1 and 4** — **near-end** and **far-end**.

**Always say which**, in the plan's Location row and on the night — "half of Pitch 2" is not enough for thirty players to find.

The club's allocation page labels the halves with its own codes:

| Code | Ours | | Code | Ours |
|---|---|---|---|---|
| `1a` | Pitch 1, near-end | | `3a` | Pitch 3, left |
| `1b` | Pitch 1, far-end | | `3b` | Pitch 3, right |
| `2a` | Pitch 2, left | | `4a` | Pitch 4, far-end |
| `2b` | Pitch 2, right | | `4b` | Pitch 4, near-end |

That table lives in `club/pitch-zones.json`, so **a plan only ever writes the club's code** — `![caption](pitch:2b)` — and the map pin states the pitch and half itself. An unknown code fails the build.

## Files in this folder

| File | What it holds |
|---|---|
| `club.json` | Club name, location (for sunset and weather), allocation URL, and the landing page's wording. |
| `pitch-zones.json` | The table above, as data. |
| `rewrites.json` | What gets redacted or reworded on the way to the public site. |
| `images/web/pitch-map.jpg` | The allocation map the pins are placed on. |
