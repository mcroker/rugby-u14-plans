---
name: session-review
description: Record what actually happened after a training session — adds the Review to that session's run-sheet and routes the durable lessons into the right document. Use when given coach feedback after a session has run.
---

# Writing up a session after it has run

The job has two halves, and the second is the one that gets forgotten.

## 1. The Review goes on that session's own page

Add a **`## Review`** section to the run-sheet in `teams/<slug>/plans/`. It goes **last, after Notes**.

Write what actually happened: what worked, what didn't, what overran, what got cut. Keep it **session-specific** — this is the record of one evening.

Also fill in anything the plan left blank on the night: the **Coaches** and **Attendance** rows in Session details.

**The Review is the only thing ever added to a session after it has run.** Don't tidy the rest of the file, don't fix a drill description that turned out wrong, don't apply a better format you've since worked out. The archive is what was actually done, and it stops being that the moment it gets cleaned up.

## 2. Route the durable lessons out of it

A Review that holds a lesson nobody will read again has half-failed. **Anything that changes how future sessions are run belongs in a document that future sessions read:**

| The lesson is about… | It belongs in… |
|---|---|
| How to coach or deliver — a format that worked, a way of splitting the group, an intervention style | the team's **`coaching.md`** |
| How the team plays — a call, a shape, a principle | the team's **`playbook.md`** |
| What the next weeks should now do differently | **`blocks.md`**, in the block's "carried forward" notes |
| A drill worth keeping, or a variation of one | the team's **`activities.md`** |
| What happened on the day | stays in the **Review** |

Move the lesson, and leave the session-specific detail in the Review. A line can be in both — the Review says *"the pull-outs worked, five minutes was right"*, `coaching.md` says *"five minutes at a pop is the pull-out length that works"*.

Note in the Review where a lesson was carried to, so the trail is followable.

## 3. Check it builds

```
node tools/build_site.ts _site
```

A clean exit means nothing broke. If the team's `coaching.md` was a shared default and you have just edited it, check whether the edit belongs to this team only — if so it needed copying into the team folder first (see the layering in the root `CLAUDE.md`).
