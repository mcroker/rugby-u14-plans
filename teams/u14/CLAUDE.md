# U14 — team facts

This age group's own context. The framework mechanics are in the root `CLAUDE.md`; the club's grounds and allocation are in `club/CLAUDE.md`.

**Read `age-group.md` and `coaching.md` before producing session plans, playbooks, or drills for this team.** Session plans and drills should use the terminology defined in `playbook.md`.

We are **`U14M`** on the club's pitch allocation.

## This team's documents

Each of these overrides the shared default of the same name in `content/`, where there is one.

| File | What it holds | Shared default? |
|---|---|---|
| `age-group.md` | Squad context: the two teams, physical and skill profile, neurodiversity, training days and facilities, how the squad splits into training groups. | No — always the team's own |
| `coaching.md` | How sessions are coached: block model, whole–part–whole, skill zones, the contact warm-up, the skills pyramid, resources, the coaching team. | Yes — this is our edited copy |
| `warmup.md` | The five-minute player-led warm-up. | Yes |
| `activities.md` | Our bank of games and drills. | Yes |
| `playbook.md` | Our calls and shapes. Players-shareable: no squad or coaching context in it. | Skeleton only |
| `laws.md` | Not present — we take `content/laws/u14.md` via `ageGroup` in `team.json`. | Yes |
| `blocks.md` | Block themes and the session-by-session plan. | No |
| `calendar.md` | This season's fixtures and training dates (non-PII summary of the club calendar). | No |
| `plans/` | On-the-pitch run-sheets, one file per session. | No |

## Fixtures, results and league tables

The RFU's England Rugby site carries both teams' league fixtures. The base URL is the same for a team all season; only the `#` anchor changes:

| Team | Competition | Base URL |
|---|---|---|
| **Blue** — `team=23300`, `division=79245` | Kent Boys Youth Leagues, **U14 Boys Stage 1 Group 2** | `https://www.englandrugby.com/fixtures-and-results/search-results?team=23300&competition=2075&division=79245&season=2026-2027` |
| **White** — `team=128902`, `division=79250` | Kent Boys Youth Leagues, **U14 Boys Stage 1 Group 7** | `https://www.englandrugby.com/fixtures-and-results/search-results?team=128902&competition=2075&division=79250&season=2026-2027` |

Add **`#fixtures`**, **`#results`** or **`#tables`** to either. The two teams are in **different groups**, so they have different opponents and are not always both playing on the same Sunday — **check each separately** before assuming a fixture Sunday is a fixture for the whole squad.

A note for anyone re-reading these pages: the fixture list is rendered client-side, and the site returns **403 to a plain fetch** — it needs a normal browser user-agent. The season's fixtures are in the page HTML once it loads.

## Reference material

`ref/` at the repo root holds `Lineout FAQ.pdf` (law/mechanics questions), plus `Autism in Rugby.pdf` and `ADHD in Rugby.pdf` — club guidance on coaching neurodiverse players, which matters for this squad (see `age-group.md`).

## Where these files live

**Google Drive is the source of truth for this team's markdown.** The repo is a **U14 Rugby** folder in Drive (mcroker@gmail.com), synced locally — [https://drive.google.com/drive/folders/1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU](https://drive.google.com/drive/folders/1tkv05JdlpY1RWNV2iPv3RFixzATYbnFU).

When a computer is linked and has this folder synced, **edit the local synced copy** — fast, no round-trip. Fall back to the connected Google Drive tool only when no local sync is available.

**Per-subfolder Drive IDs are not recorded here any more.** The move to `teams/`, `club/` and `content/` renamed those folders in Drive as well as on disk, so any previously-noted `claude/` or `plans/` IDs no longer resolve. The top-level folder link above is stable; re-read subfolder IDs from Drive if a tool needs them.

**Mechanical note for the Drive tool:** it has no in-place content-update call — only file metadata (title/parent) can be patched. To "edit" a file's content in Drive: trash the old file (`trash_file`), then `create_file` with the same title in the same parent, with `disableConversionToGoogleType: true` and `contentMimeType` set to `text/markdown`, so it stays a plain file rather than becoming a Google Doc. A file's Drive ID therefore changes on every edit — don't rely on a bookmarked `/file/d/...` link surviving.
