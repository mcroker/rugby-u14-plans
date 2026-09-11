---
name: check-build
description: Build the site locally and fix whatever it reports. Use before pushing, after editing any markdown or config, or when a page isn't appearing as expected.
---

# Checking the site builds

```
node tools/build_site.ts _site                            # Node 23.6+
node --experimental-strip-types tools/build_site.ts _site  # Node 22.6–23.5
```

No install needed — the build has no dependencies. `npm ci && npm run typecheck` is separate, and only type-checks the engine.

**The build exits non-zero on any warning.** A clean exit is the pass condition; there is no "it's only a warning".

## What the messages mean

| Message | What to do |
|---|---|
| `… has no frontmatter` | A plan with no `---` block. It needs at least `date`, `h1`, `sub`, `crumb`, `card`. |
| `… has no 'page' in its frontmatter` | A content doc that would never be published. Add `page: something.html`, or move the file out of the docs folder. |
| `missing required field 'x'` | Exactly that. Check for an unquoted value containing a colon — `start: 18:45` needs quotes. |
| `run sheet: no rows could be read as '+start, N min'` | The Plan table's first column is the contract. Every row must start `+7, 13 min`. |
| `run sheet: N row(s) did not start '+N, N min'` | Those rows were silently dropped from the timeline. Fix or remove them. |
| `image 'x' is not found in the site's images folder` | Put the web-sized copy in the team's `images/web/` and reference it by filename. |
| `image 'x' is an external URL` | Never link an image to an external host. Copy it into `images/web/`. |
| `unknown pitch zone 'x'` | Use a code from `club/pitch-zones.json`. |
| `no page metadata` / a page you expected is missing | Check the doc's `page:` — and remember a team file of the same name hides the shared default. |
| `note: … rewrite no longer matches` | **Not fatal.** A rule in `club/rewrites.json` no longer matches because the source was reworded. Update or delete the rule. |

## Checking it looks right, not just that it built

A clean build only means nothing was broken structurally. Open the pages:

- `_site/index.html` — the landing page lists every team.
- `_site/<slug>/index.html` — cards in the right groups, the next-session card on top.
- `_site/<slug>/next.html` — the session you expect, with the right date.
- A session page at a narrow window (~375px): the timeline, the Details modal, the Logistics accordion, the Map button.

If a timeline block shows the Plan table's summary instead of Groups/Set up/Call, its Activities entry didn't match the row — the match is on the words in the title, so make the two recognisably the same.
