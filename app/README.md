# app - Part 1: UI/UX and user flow

The Buckets mobile app (Expo / React Native, Expo Router), plus wireframes.

Everything about what the user sees and how they move through the app: onboarding (sport pick, proficiency rating), the skill graph view, lesson screens, and the skill test / feedback screens.

## Run it

```bash
cd app
npm install
cp .env.example .env      # set EXPO_PUBLIC_VISION_URL to the vision API, e.g. http://<your-laptop-ip>:8000
npx expo start            # scan the QR code with Expo Go, or press i / a / w
```

Use `npx expo install <package>` to add packages so versions match the Expo SDK.

## Layout

- `src/app/`: screens (Expo Router: every file is a route).
- `src/components/`, `src/hooks/`, `src/constants/`: shared code.
- `data/skills.json`: copy of `curriculum/sample.json` for the app to read.
- `design/`: wireframes and mockups (`wireframe.html` is the pre-pivot hobby-era wireframe).
- `AGENTS.md` / `CLAUDE.md`: Expo's notes for AI coding assistants.

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
