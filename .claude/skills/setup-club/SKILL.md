---
name: setup-club
description: Set up a freshly forked copy of this framework for a new club — club name, location, pitch map and zones, then a first team. Use once, on a fork, before anything else.
---

# Setting up a fork for your club

Run this once on a fresh fork. It replaces the previous club's details with yours.

## 1. Clear out what isn't yours

The fork arrives with the previous club's content. Delete it:

- Everything in `teams/` — you'll add your own next.
- `club/images/` — the previous club's allocation map.

**Keep** `content/` (the shared defaults, which are yours to inherit) and `tools/` (the engine). If you keep the engine untouched you can `git merge upstream/main` later for fixes.

## 2. `club/club.json`

```json
{
  "name": "Your RFC",
  "shortName": "YRFC",
  "latitude": 51.132,
  "longitude": 0.263,
  "timezone": "Europe/London",
  "locale": "en-GB",
  "allocationUrl": "",
  "pitchMap": "pitch-map.jpg",
  "site": { "title": "…", "sub": "…", "sub2": "…" }
}
```

**Latitude and longitude** drive the sunset time and the weather forecast on every session page. The clubhouse to within a mile is plenty.

**`site`** is the wording on the landing page at the root of the domain, above the per-team sites.

## 3. The pitch map — optional

Only needed if your club publishes a pitch allocation and you want the Map button on session pages.

1. Put the map image at `club/images/web/pitch-map.jpg` — web-sized, roughly 800–1100px, well under 200 KB.
2. Write `club/pitch-zones.json`: one entry per pitch or half-pitch, with `left` and `top` as **percentages of the image** from its top-left corner, plus the `pitch` and `half` names people actually say.
3. Write `club/CLAUDE.md` — how your grounds are numbered, how halves are named, where the allocation is published. Replace the previous club's file entirely.

If you skip this, leave `pitch-zones.json` out and don't write `![…](pitch:…)` in plans; everything else works.

## 4. `club/rewrites.json`

Anything that belongs in your working notes but not on a page players and parents read. Most clubs need nothing here — **an empty `redact` and `rewrite` is a fine answer.** Delete the previous club's rules; they were about its own diagram library.

## 5. Your first team

Use the **`new-team`** skill.

## 6. Publishing

- GitHub **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/pages.yml` builds and deploys on every push to `main`, plus daily at 05:00 UTC so the "next session" link keeps moving.
- For a custom domain, set it in the Pages settings.
- **The scheduled rebuild is what keeps `next.html` current.** GitHub disables scheduled workflows after 60 days with no repo activity — if the next-session link ever goes stale, check the Actions tab first.

## 7. Check

```
npm ci && npm run typecheck
node tools/build_site.ts _site
```

A clean exit and a `_site/index.html` listing your team means you're set up. Open `_site/<slug>/index.html` in a browser to look at it.
