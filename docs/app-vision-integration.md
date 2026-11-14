# App ↔ vision integration: what changed in app/

Changes are kept to the minimum needed to connect the lesson practice step to the vision server.

## Flow
1. The lesson screen's "Start practice" renders `PracticeAssessment` instead of `DemoAssessment`.
2. `PracticeAssessment` asks the server (`GET /skills`, once per app session) whether this skill has a camera check.
   - **Yes** (currently `sh-beef`, `sh-onehand`, `sh-guide`, `sh-fake`): the camera check is shown. It has the setup tip from `skills.json`, **Record a rep** (camera) and **Choose a video** (library). The video is uploaded to `POST /analyze` and the per-check results and coaching feedback are shown. Passed → **Complete skill**; failed → **Try again**.
   - **No**: the existing `DemoAssessment`, unchanged.
   - **Server unreachable**: "Camera check unavailable" with a retry button, then the existing `DemoAssessment`. Nothing is ever faked as a vision result.
3. A passed check is saved as a completion with `source: "vision"`, so it stays distinguishable from demo completions (as the frontend build report asked).

## Files

| File | Change | Why |
|---|---|---|
| `src/lib/vision.ts` | **new** | Server client: `getGradableSkills`, `analyzeSkill`, `useGradableSkill`, typed `VisionError`. Reads `EXPO_PUBLIC_VISION_URL`. |
| `src/components/vision-assessment.tsx` | **new** | `PracticeAssessment` (chooses camera check or demo) and the camera-check UI. Uses only existing `hoop-ui` parts. |
| `src/app/lesson/[id].tsx` | 2 lines | Import and render `PracticeAssessment` instead of `DemoAssessment`. |
| `src/lib/curriculum.ts` | `Completion` type | Added `{ source: "vision"; completedAt; attemptId; spec }` next to the existing `{ source: "demo"; completedAt }`. |
| `src/lib/player-store.tsx` | load check + new action | **Load check:** saved progress was rejected unless every completion had `source: "demo"`, so the first verified completion would have made the app refuse to load. It now also accepts `"vision"` entries that have `attemptId` and `spec`. **New action:** `completeVision(id, attempt)` runs the same guards as `completeDemo` (unknown, locked, quiz, already done) through `completeSkillDemo`, then stores the vision provenance. `completeDemo` is unchanged. |
| `src/app/complete/[id].tsx` | label only | Shows "SKILL VERIFIED" and a camera-check message for vision completions; demo completions show the same text as before. |
| `app.json` | plugin | `expo-image-picker` with camera, microphone and photos permission strings (used by dev/store builds; Expo Go has its own). |
| `package.json`, `package-lock.json` | dependency | `expo-image-picker ~58.0.10` via `npx expo install` (included in Expo Go). |

Nothing else in app/ changed. `tsc`, `expo lint`, `scripts/verify-frontend.cjs` and `scripts/verify-learning.cjs` pass; demo completions still save as `source: "demo"`.

## Video settings
iOS records and exports at 720p H.264 (`IFrame1280x720`, `H264_1280x720`), max 15 s. A 5 s clip is about 1.2 MB and takes about 5 s to analyze on a laptop.

## Not done (on purpose)
- The lesson caption "Camera assessment preview · no camera analysis yet" under "Start practice" is unchanged; it's now inaccurate for the four graded skills. Your call how to word it.
- No in-app framing overlay (system camera UI only).
