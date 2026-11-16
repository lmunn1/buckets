# HoopQuest

A mobile app that teaches basketball beginners through an unlockable skill tree, checks their form with the phone camera, and gives them an AI coach inside every lesson. Built at **HackUMass 14** by a team of three.

**Names:** **HoopQuest** is the app and the repo (it was called *Buckets* early on). **Buckets** is the AI chatbot inside the app: a cartoon-basketball coach you can ask about the lesson you're on.

## What the app does

HoopQuest works like a language-learning app for basketball: short lessons, a map of skills that opens up as you go, and a check before you can move on. The difference is that the check is real. You film yourself doing the skill, and a computer-vision model grades your form.

1. **Onboarding:** the player picks their experience, focus and practice time. Their experience places them past foundations they already know.
2. **Skill tree:** 107 basketball skills in 8 tracks (footwork, ball handling, shooting, finishing, passing, defense, live moves, IQ). A skill unlocks when *all* of its prerequisites are done, so the tree is a web, not a line.
3. **Lessons:** each skill has three parts: *Understand it* (steps, cues, common mistakes), *See the technique* (a YouTube demo) and *Your turn* (the drill).
4. **Camera form check:** the player props up their phone, gets a 10 s countdown to get into position, and records one rep (the clip stops itself after 5 s). The vision model grades it and sends back an annotated replay plus coaching tips. **One passed check completes the skill** and unlocks what's next.
5. **Buckets, the AI coach:** a chat button in every lesson opens Buckets, who knows which skill you're on and answers questions about it ("why does my elbow flare?", "what's a good drill for this?"). Buckets only coaches; it doesn't grade or unlock anything.

## The vision model

The form check runs on a small Python server (`vision/`, FastAPI) that the app uploads the clip to.

1. **Pose:** [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) finds the player's body landmarks (shoulders, elbows, wrists, hips, knees, ankles, nose) in every frame.
2. **Clean-up:** joint angles are smoothed, low-confidence points are dropped, and only frames where the whole body is in view at its normal size are kept. Walking up to the phone or reaching for it is ignored. If less than 1 s of usable video is left, the player is asked to film again.
3. **Grading with a spec:** each skill points at a **spec**, a JSON recipe in `vision/specs/`. A spec names key *moments* (for example, "release" is when the shooting wrist is highest) and *rules* that measure something at or around those moments, like knee bend, set-point elbow angle, arm direction at release, or how long the follow-through is held. Every rule has a target range and a coaching line for when you're too low or too high. The rep passes only if every rule passes.
4. **Replay:** the server draws the skeleton, joint angles and each check's pass or fail onto the clip and sends it back with the grade, so the player sees exactly what went wrong.

Because the grading lives in data rather than code, adding a camera check for a new skill means writing a spec, not new Python. A 5 s clip takes about 8–9 s to grade and render on a laptop. See [`vision/README.md`](vision/README.md) for the full spec format.

| Spec | Skills | What it checks |
|---|---|---|
| `shoot_form` | BEEF form, one-hand form, guide-hand form | knee bend, set-point elbow, release extension, release direction, follow-through |
| `shot_fake` | shot fake | ball to forehead, feet stay down, knees bent, arms bent at the top, fake speed |

## Team

Built at HackUMass 14. We split the project into three parts:

| Who | Part |
|---|---|
| [Linus Munn](https://github.com/lmunn1) | Vision model and grading server, and wiring the camera check into the app |
| [Drew](https://github.com/drewk145) | App frontend: the skill tree map, lesson screens, onboarding and the practice camera screens |
| [Anthony Cooper](https://github.com/antcoop096) | The curriculum: organized the skill tree into its skills and lessons from his notes and personal resources, wrote the lessons and found the YouTube demo for each one. Also built Buckets, the AI coach, and its Cloudflare proxy |

## What works today

| Area | Status |
|---|---|
| Skill tree, lessons, onboarding, warmups, profile | Working. Progress is saved on the device (no accounts). |
| Camera form checks | Working for 4 skills: BEEF form, one-hand form and guide-hand form (spec `shoot_form`), and shot fake (spec `shot_fake`). Ranges are provisional until calibrated on more real clips. |
| Other skills | No camera check yet; they use a clearly labelled demo completion. |
| Make counting (`shot_session`, 6 shooting skills) | Planned, not built. |
| Quizzes (Basketball IQ skills) | Questions exist in `app/data/skills.json` but aren't shown in the app yet. |
| Buckets (AI coach) | Working through a Cloudflare Worker (a deployed instance is the default). |

**Out of scope for now:** other sports, accounts or cloud sync, and badges, XP and streaks (defined in the curriculum data but not shown).

## How it fits together

```
 HoopQuest app (app/, Expo / React Native)
   |  POST /analyze (video)      ->  vision server (vision/, FastAPI + MediaPipe)
   |  <- grade + replay_url          runs on a laptop on the same Wi-Fi
   |
   |  Buckets chat               ->  proxy (proxy/, Cloudflare Worker)  ->  Gemini
                                     holds the API key, builds the prompt
                                     from the curriculum, rate-limits
```

- **Curriculum:** the app reads `app/src/lib/hooptree/curriculum.json` (skills, lessons, videos, prerequisites).
- **Grading specs:** the vision server reads `app/data/skills.json` to find which grading spec a skill uses (`completion.spec`). `vision/skill_ids.json` maps the app's skill ids to those entries.
- **Specs** are JSON files in `vision/specs/`. One spec can grade several skills.

## Repo layout

| Folder | What's in it |
|---|---|
| [`app/`](app/) | The HoopQuest app: Expo SDK 58, React Native, TypeScript, Expo Router. |
| [`vision/`](vision/) | Vision server: pose extraction, the spec engine that grades clips, annotated replays, tests. |
| [`proxy/`](proxy/) | Cloudflare Worker for Buckets, the AI coach. Deployed by `.github/workflows/deploy-buckets-proxy.yml` on pushes to `main`. |
| [`docs/`](docs/) | API contract, app ↔ vision integration notes, early notes and survey takeaways. |
| [`curriculum/`](curriculum/) | Early schema and examples, kept for reference. The live curriculum is in `app/`. |
| [`archive/`](archive/) | Material from the pre-pivot general-hobby idea. |

## Quick start

**App** (needs Node and the Expo Go app on your phone):
```bash
cd app
npm ci
npx expo start            # scan the QR code with Expo Go, or press w for web
```

**Vision server** (needs Python 3; one-time setup in [`vision/README.md`](vision/README.md)):
```bash
cd vision && source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```
Then point the app at it in `app/.env`, using your laptop's LAN IP (not localhost), and restart Expo with `npx expo start -c`:
```
EXPO_PUBLIC_VISION_URL=http://192.168.x.x:8000
```

**Buckets (AI coach):** works out of the box against the deployed proxy. To run your own, use `cd proxy && npm ci && npm run dev` with a `GEMINI_API_KEY` in `proxy/.dev.vars` (see `proxy/.dev.vars.example`), then set `EXPO_PUBLIC_BUCKETS_API_URL` as described in `app/.env.example`.

## Checks

```bash
cd app && npx tsc --noEmit && npx expo lint && node scripts/verify-frontend.cjs && node scripts/verify-learning.cjs
cd vision && python -m pytest tests && python regression.py
```

## More docs

- [`vision/README.md`](vision/README.md): running the server, testing clips, writing a grading spec
- [`docs/contracts.md`](docs/contracts.md): the vision API and the skill format
- [`docs/app-vision-integration.md`](docs/app-vision-integration.md): how the app calls the vision server
- [`app/README.md`](app/README.md): app structure and validation
