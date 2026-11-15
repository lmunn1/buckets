# Buckets

A mobile app that teaches basketball beginners through an unlockable skill tree, with camera-graded form checks and an in-lesson AI coach. Built at HackUMass.

**Names:** *Buckets* is the project and repo. The app ships as **HoopQuest**. *Buckets* is also the name of the AI coach inside lessons.

## What it does

1. **Onboarding:** the player picks their experience, focus and practice time. Experience places them past foundations they already know.
2. **Skill tree:** 107 basketball skills in 8 tracks (footwork, ball handling, shooting, finishing, passing, defense, live moves, IQ). A skill unlocks when *all* of its prerequisites are done, so the tree is a web, not a line.
3. **Lessons:** each skill has three parts: *Understand it* (steps, cues, common mistakes), *See the technique* (a YouTube demo) and *Your turn* (the drill).
4. **Camera form check:** the player props up their phone, gets a 10 s countdown to get into position, and records one shot (the clip stops itself after 5 s). The vision server grades it and sends back an annotated replay (skeleton, joint angles, pass/fail per check) plus coaching tips. **One passed check completes the skill** and unlocks what's next.
5. **AI coach:** *Buckets* answers questions about the current lesson.

## What works today

| Area | Status |
|---|---|
| Skill tree, lessons, onboarding, warmups, profile | Working. Progress is saved on the device (no accounts). |
| Camera form checks | Working for 4 skills: BEEF form, one-hand form and guide-hand form (spec `shoot_form`), and shot fake (spec `shot_fake`). Ranges are provisional until calibrated on more real clips. |
| Other skills | No camera check yet; they use a clearly labelled demo completion. |
| Make counting (`shot_session`, 6 shooting skills) | Planned, not built. |
| Quizzes (Basketball IQ skills) | Questions exist in `app/data/skills.json` but aren't shown in the app yet. |
| AI coach | Working through a Cloudflare Worker (a deployed instance is the default). |

**Out of scope for now:** other sports, accounts or cloud sync, and badges, XP and streaks (defined in the curriculum data but not shown).

## How it fits together

```
 HoopQuest app (app/, Expo / React Native)
   |  POST /analyze (video)      ->  vision server (vision/, FastAPI + MediaPipe)
   |  <- grade + replay_url          runs on a laptop on the same Wi-Fi
   |
   |  POST lesson chat           ->  proxy (proxy/, Cloudflare Worker)  ->  Gemini
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
| [`proxy/`](proxy/) | Cloudflare Worker for the AI coach. Deployed by `.github/workflows/deploy-buckets-proxy.yml` on pushes to `main`. |
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

**AI coach:** works out of the box against the deployed proxy. To run your own, use `cd proxy && npm ci && npm run dev` with a `GEMINI_API_KEY` in `proxy/.dev.vars` (see `proxy/.dev.vars.example`), then set `EXPO_PUBLIC_BUCKETS_API_URL` as described in `app/.env.example`.

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
