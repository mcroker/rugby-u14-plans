# Riverside RFC — club facts

> **This is example content.** Riverside RFC is invented. Replace this whole file with your own club's facts — it is the layer between the framework (root `CLAUDE.md`) and a team (`teams/<slug>/CLAUDE.md`).

Everything here is about **this club's grounds and how they are allocated**. Nothing about a particular age group belongs in this file, and nothing about how the build works does either.

## What to write here

**Where the pitch allocation is published**, if your club publishes one, and how to read it. This is the source of the start time and the pitch for every home session, so a plan is written against it. Note anything non-obvious — for example, a zone labelled with two age groups may mean two consecutive slots on the same ground rather than two groups sharing it, which changes whether you can set cones out early.

**How your pitches are numbered**, in the words people actually use. A table mapping what the club's map shows to what coaches say:

| | |
|---|---|
| **Pitch 1** | Nearest the clubhouse. |
| **Pitch 2** | Beyond it. |
| **Training Area** | The floodlit square — where evening sessions are. |

**How you name half a pitch.** Teams are often allocated half a pitch. Say which half **as seen from a fixed point** — the clubhouse, usually — and be consistent, because "half of Pitch 2" is not enough for thirty players to find. Depending on how a pitch sits, that may be left/right on some and near-end/far-end on others; write down which is which.

Then map the club's own codes to those names, and put the same table in `pitch-zones.json` as data — so **a plan only ever writes the code** (`![caption](pitch:2b)`) and the map pin states the pitch and half itself.

## Files in this folder

| File | What it holds |
|---|---|
| `club.json` | Club name, location (for sunset and weather), allocation URL, and the landing page's wording. |
| `pitch-zones.json` | The zone codes, as data. Optional — delete it if your club has no pitch map. |
| `rewrites.json` | What gets redacted or reworded on the way to the public site. Optional; most clubs need nothing. |
| `images/web/pitch-map.jpg` | The allocation map the pins are placed on. Web-sized — 800–1100px, well under 200 KB. |

Anything in `club/` is shared by every team, and a team can still override a file of the same name by putting its own copy in its folder.
