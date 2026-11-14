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
