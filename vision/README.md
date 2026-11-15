# Vision server

Grades skill-test videos for the app. It runs MediaPipe pose detection on the clip, measures it against a **spec** (a JSON grading recipe), and returns a pass/fail result with per-check values, coaching tips and an annotated replay video.

## Setup (once)

```bash
cd vision
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdir -p models clips
curl -o models/pose_landmarker_full.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task
```

ffmpeg is optional. If installed, it lets phones start playing replays before they finish downloading.

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The phone must reach it: set `EXPO_PUBLIC_VISION_URL=http://<laptop LAN IP>:8000` in `app/.env`. If `http://<ip>:8000/skills` doesn't load in the phone's browser, the Wi-Fi is probably blocking device-to-device traffic; use a phone hotspot.

| Endpoint | What it does |
|---|---|
| `POST /analyze` | multipart `video`, `skill_id`, optional `hand` (`auto`/`left`/`right`). Returns the grade (format in [`docs/contracts.md`](../docs/contracts.md)). |
| `GET /replays/<attempt_id>.mp4` | The annotated replay for an attempt (H.264, 960 px long side). The newest 50 are kept. |
| `GET /skills` | App skill ids that have a camera check, with their setup tips. |
| `GET /specs` | Available spec names. |
| `GET /health` | `{ "ok": true }` |

A 5 s 720p clip takes about 8–9 s on a laptop: about 6 s for grading and about 3 s for the replay.

## How a skill gets graded

1. The app sends its skill id (e.g. `sh-beef`). `skill_ids.json` maps it to the lessons file's id (`shoot_beef_form`). Regenerate it with `python make_skill_ids.py` if either curriculum file changes.
2. `app/data/skills.json` gives that skill's `completion.spec` (e.g. `shoot_form`).
3. `engine.py` runs `specs/<spec>.json` on the pose frames.

| Spec | Skills | Checks |
|---|---|---|
| `shoot_form` | BEEF form, one-hand form, guide-hand form | knee bend, set-point elbow, release extension, release direction, follow-through |
| `shot_fake` | shot fake | ball to forehead, feet stay down, knees bent, arms bent at the top, fake speed |

Ranges are first guesses: `shoot_form`'s set point and release extension are marked provisional in the spec. Recalibrate them with real ball clips filmed through the app.

**Filming:** one shot, side view from the shooting-hand side, whole body in frame. Only frames where the full body (nose, shooting-side shoulder, hip, knee and ankle) is visible at its usual size are graded, so walking in and out or reaching for the phone is ignored. Under 1 s of usable video returns "Couldn't see a full shot…".

## Testing clips

Put clips in `clips/` (gitignored).

```bash
python test_clip.py clips/shot.mov --spec shoot_form [left|right] [--csv]   # result, optional per-frame numbers
python debug_video.py clips/shot.mov --spec shot_fake                        # annotated replay next to the clip
python spec_table.py shot_fake                                               # one spec on every clip
python regression.py                                                         # engine vs the original jump_shot.py
python -m pytest tests                                                       # unit tests, no video needed
```

## Writing a spec

A spec is `specs/<name>.json`. The engine checks it when it loads and gives a clear error naming the spec, rule and field if anything is wrong.

```json
{
  "title": "Shot fake",
  "success": "Great fake: quick, grounded and low.",
  "moments": [
    { "name": "top", "type": "highest", "point": "wrist" }
  ],
  "rules": [
    {
      "name": "knee_at_top", "label": "Knees at the top",
      "measure": { "type": "joint_angle", "joint": "knee", "pick": "at", "at": "top" },
      "target": [90, 155],
      "feedback": { "fail_high": "Stay low on the fake so you can explode after." }
    }
  ]
}
```

- **Spec fields:** `title` (replay header), `success` (feedback when every rule passes), `moments`, `rules`. The spec passes only if every rule passes.
- **Rule fields:**
  - `name`, `label` (shown to users), `measure`, and `target: [lo, hi]`
  - `feedback` with `fail`, `fail_low`, `fail_high` and/or `fail_missing`
  - optional `debug_frame` (an extra key in `debug`) and `note`

**Moments** are named key frames, evaluated in order, so later ones can use earlier ones.

| Type | Example |
|---|---|
| `highest` / `lowest` of a point (`wrist`, `elbow`, `shoulder`, `hip`, `knee`, `ankle`, `nose`) | `{ "name": "release", "type": "highest", "point": "wrist" }` |
| `first_when` / `last_when` a condition holds, optionally inside a `window` | `{ "name": "ball_up", "type": "first_when", "condition": "wrist_above_nose" }` |

**Windows:** `"all"`, or a moment plus seconds before and after it: `{ "moment": "release", "offset_s": [-0.6, 0] }` (both ends included).

**Conditions:** `wrist_above_shoulder`, `wrist_above_nose`, `feet_on_ground` (ankles near their resting level, within 3% of body height).

**Measurements:**

| Type | Unit | Example |
|---|---|---|
| `joint_angle`: `elbow` or `knee`; `pick` `min`/`max` over a `window`, or `at` a moment; optional `only_when` | deg | `{ "type": "joint_angle", "joint": "elbow", "pick": "min", "only_when": "wrist_above_shoulder", "window": { "moment": "release", "offset_s": [-0.6, 0] } }` |
| `arm_direction`: shoulder-to-wrist angle above horizontal at a moment (90 = straight up) | deg | `{ "type": "arm_direction", "at": "release" }` |
| `duration`: seconds a condition holds `forward` from a moment, or the unbroken run `around` it | s | `{ "type": "duration", "condition": "wrist_above_shoulder", "from": "release", "direction": "forward" }` |
| `air_time`: seconds with both feet off the ground in a window | s | `{ "type": "air_time", "window": "all" }` |
| `happened`: 1 if a moment was found, else 0 (target `[1, 1]`) | yes/no | `{ "type": "happened", "moment": "ball_up" }` |

**To add a spec:**
1. Write `specs/<name>.json`.
2. Check it on clips with `spec_table.py <name>` and `debug_video.py clip --spec <name>`.
3. Set `completion.spec` to `<name>` for the skills in `app/data/skills.json`.

The server picks it up without a restart, and `GET /skills` will list those skills.

## Files

| File | Role |
|---|---|
| `main.py` | FastAPI server: skill→spec lookup, `/analyze`, replays |
| `engine.py` | Spec loader and validator, the grader |
| `pose.py` | MediaPipe Tasks pose extraction (frames downscaled to 960 px; x scaled by aspect ratio so angles are correct) |
| `debug_video.py` | Annotated replay renderer |
| `jump_shot.py` | Original hand-written grader, kept as the regression reference |
| `specs/` | Grading specs |
| `skill_ids.json`, `make_skill_ids.py` | App id → lessons-file id mapping and its generator |
| `test_clip.py`, `spec_table.py`, `regression.py`, `clip_cache.py`, `tests/` | Testing tools |
