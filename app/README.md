# Hoop app - frontend preview

The Hoop mobile app uses Expo SDK 58, React Native, TypeScript, and Expo Router.

The frontend includes a short experience/focus/time onboarding, a persistent connected 107-skill graph, three-part video-focused lessons, local camera recording with a 10-second positioning countdown, timed warmups, and Profile. Experience sets prerequisite-respecting placement; camera capture is real, but vision analysis is not connected. See the [build report](FRONTEND_BUILD_REPORT.md), [curriculum guide](design/CURRICULUM_INTEGRATION.md), and [camera/placement teammate handoff](design/CAMERA_AND_PLACEMENT_HANDOFF.md).

## Run it

```bash
cd app
npm install
npx expo start            # scan with Expo Go or press w for web
```

Use `npx expo install <package>` to add packages so versions match the Expo SDK.

## Layout

- `src/app/`: screens (Expo Router: every file is a route).
- `src/components/`, `src/hooks/`, `src/constants/`: shared code.
- `src/lib/learning-service.ts`: shared catalog boundary and typed curriculum authoring adapter.
- `src/lib/hooptree/`: unchanged supplied curriculum/helper; `hooptree-adapter.ts` connects it to the UI.
- `src/lib/curriculum.ts`: inactive legacy fixture and guarded demo progression types/selectors.
- `data/skills.json`: older sample data; do not use for progression until its format is reconciled with the curriculum team.
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

The [build report](FRONTEND_BUILD_REPORT.md) documents the browser smoke script, phone-size screenshots, free-tool licenses, and native testing limits. Web uses client rendering with local player state. Lessons have Understand it, See the technique (video), and Your turn parts. Images and movement guides are removed from the lesson flow. Practice records temporary local video and can replay/retake it; analysis and verified completion remain teammate integration points.

## First-time setup (each person)
1. Make a free Expo account and accept the Buckets org invite (check your email).
2. Sign in with YOUR account on both sides:
   - Laptop: `npx expo login` (GitHub signup? use `npx expo login --browser`)
   - Phone: Expo Go > account icon > sign in (same account)
   - Check: `npx expo whoami`
3. `npm install && npx expo start`, scan the QR with Expo Go.
   Won't connect? `npx expo start --tunnel`

## Ownership
- UI: everything in app/ except app/data/
- Lessons: app/data/skills.json (format in docs/contracts.md)
- Vision: vision/ and app/src/lib/vision.ts
