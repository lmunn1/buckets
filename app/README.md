# HoopQuest app

The HoopQuest mobile app uses Expo SDK 58, React Native, TypeScript and Expo Router.

It has:
- a short onboarding (experience, focus and practice time) whose experience answer places the player past foundations they already know
- a connected 107-skill tree
- three-part lessons with Buckets, the in-lesson AI chatbot coach
- timed warmups and a Profile screen
- a practice camera: 10 s countdown, 5 s one-shot clip, then grading by the vision server with an annotated replay and per-check feedback

A passed check completes the skill as verified. Skills without a camera check use a labelled demo completion. See [docs/app-vision-integration.md](../docs/app-vision-integration.md), the [build report](FRONTEND_BUILD_REPORT.md), the [curriculum guide](design/CURRICULUM_INTEGRATION.md) and the [camera/placement handoff](design/CAMERA_AND_PLACEMENT_HANDOFF.md).

## Run it

```bash
cd app
npm ci
npx expo start            # scan with Expo Go or press w for web
```

Optional `app/.env` (see `.env.example`): `EXPO_PUBLIC_VISION_URL=http://<laptop LAN IP>:8000` for camera grading, and `EXPO_PUBLIC_BUCKETS_API_URL` for a local AI-coach proxy (the deployed one is the default). Restart with `npx expo start -c` after changing it.

Use `npx expo install <package>` to add packages so versions match the Expo SDK.

## Layout

- `src/app/`: screens (Expo Router: every file is a route).
- `src/components/`, `src/hooks/`, `src/constants/`: shared code.
- `src/lib/learning-service.ts`: shared catalog boundary and typed curriculum authoring adapter.
- `src/lib/hooptree/`: unchanged supplied curriculum/helper; `hooptree-adapter.ts` connects it to the UI.
- `src/lib/curriculum.ts`: progression types (including demo and vision completions) and an inactive legacy fixture.
- `src/lib/vision.ts`, `src/lib/vision-service.ts`: vision server client and the recorder's assessment interface.
- `src/lib/buckets-ai.ts`, `src/lib/buckets-prompt.ts`, `src/components/buckets-coach.tsx`: the AI coach (talks to `proxy/`).
- `data/skills.json`: skill tests (grading spec, setup tips, quizzes) used by the vision server; not read by the app.
- `design/`: wireframes and mockups (`wireframe.html` is the pre-pivot hobby-era wireframe).
- `AGENTS.md` / `CLAUDE.md`: Expo's notes for AI coding assistants.

## Validation

```bash
npx tsc --noEmit
npm run lint
npx expo install --check
node scripts/verify-frontend.cjs
node scripts/verify-learning.cjs
node scripts/smoke-curriculum.cjs
npx expo export --platform all --output-dir dist-frontend-all
```

The [build report](FRONTEND_BUILD_REPORT.md) documents the browser smoke script, phone-size screenshots, free-tool licenses, and native testing limits. Web uses client rendering with local player state.

## First-time setup (each person)
1. Make a free Expo account and accept the Buckets org invite (check your email).
2. Sign in with YOUR account on both sides:
   - Laptop: `npx expo login` (GitHub signup? use `npx expo login --browser`)
   - Phone: Expo Go > account icon > sign in (same account)
   - Check: `npx expo whoami`
3. `npm install && npx expo start`, scan the QR with Expo Go.
   Won't connect? `npx expo start --tunnel`

## Formats
Skill and vision API formats are in [docs/contracts.md](../docs/contracts.md).
