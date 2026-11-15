# Contracts

The shapes the parts of the app agree on. Change them together.

## Curriculum the app uses
`app/src/lib/hooptree/curriculum.json`: `nodes[]` with `id` (e.g. `sh-beef`), `title`, `track`, `tier`, `unlock.requiresAll` (all prerequisites required), and `lesson` (`text`, `visuals`, `video`, `practice`). The app reads it through `app/src/lib/hooptree-adapter.ts` and `learning-service.ts`.

## Skill tests (`app/data/skills.json`)
The same 107 skills in the same order, with ids like `shoot_beef_form` (mapped from app ids by `vision/skill_ids.json`). Each skill:

```jsonc
{
  "id": "shoot_beef_form", "name": "BEEF Form", "category": "shooting", "level": 1,
  "prerequisites": ["..."],
  "lesson": { "summary": "...", "steps": ["..."], "practice": "...", "video_id": null },
  "setup": { "stand": "Anywhere. No hoop needed.", "camera": "side", "camera_tip": "Prop the phone at waist height..." },
  "completion": {
    "type": "vision",          // "vision" | "quiz" | "self_check"
    "spec": "shoot_form",      // vision grader in vision/specs/, or null
    "target": null,            // e.g. { "makes": 7, "attempts": 10 } for shot_session
    "criteria": "Knees bend before the shot, ...",
    "mistakes": ["Straight legs", "..."],
    "quiz": [{ "q": "...", "options": ["..."], "answer": 1 }]   // only for type "quiz"
  }
}
```

Specs: `shoot_form` and `shot_fake` are built; `shot_session` (make counting) is planned. A vision skill with `spec: null` has no camera check yet.

## Vision API (app → vision server)

**`POST /analyze`**, multipart: `video` (file), `skill_id` (app id, lessons-file id, or spec name), optional `hand` (`auto` | `left` | `right`).

```jsonc
{
  "graded": true,                  // false: no vision check for this skill (metrics empty)
  "passed": false,                 // every check ok
  "score": 0.6,                    // fraction of checks ok
  "spec": "shoot_form",
  "skill_id": "sh-beef",
  "attempt_id": "c7ed97f3...",     // unique per upload
  "analyzed_at": "2026-11-14T22:12:54+00:00",
  "metrics": [{ "name": "knee_bend", "label": "Knee bend", "value": 119.4,
                "unit": "deg", "target": [90, 140], "ok": true }],   // unit: "deg" | "s" | "bool"
  "feedback": ["Fully extend your arm at release, reach up toward the rim."],
  "replay_url": "/replays/c7ed97f3....mp4",   // or null if the replay couldn't be rendered
  "debug": { }                     // for the vision side
}
```

Errors: `400` for an unreadable video or a bad `hand`; `500` for a broken spec.

| Other endpoints | Response |
|---|---|
| `GET /replays/<attempt_id>.mp4` | annotated replay video (`video/mp4`, supports range requests) |
| `GET /skills` | `{ "<app id>": { "spec", "name", "setup", "criteria", "mistakes" } }` for gradable skills |
| `GET /specs` | `["shoot_form", "shot_fake"]` |
| `GET /health` | `{ "ok": true }` |

The app's client is `app/src/lib/vision.ts`; see [`app-vision-integration.md`](app-vision-integration.md).

## Saved progress (on device)
`completed[skillId]` is `{ source: "demo", completedAt }` or `{ source: "vision", completedAt, attemptId, spec }`. A skill unlocks when all its prerequisites are in `completed`.
