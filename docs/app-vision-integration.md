# App ↔ vision integration

How the HoopQuest app uses the vision server. The API itself is in [`contracts.md`](contracts.md).

## Flow
1. **Lesson → practice:** the lesson's *Your turn* part opens `src/app/practice/[id].tsx`, which renders `PracticeRecorder` with `service={serverVisionService}`.
2. **Recording** (`practice-recorder.tsx`, `capture-surface.tsx`):
   - expo-camera records 720p video after a 10 s countdown.
   - The clip auto-stops after `RECORDING_LIMIT_SECONDS` (5 s), set in `src/lib/vision-service.ts`.
   - The screen tells the player to take ONE shot and hold still.
3. **Check my technique:** `serverVisionService.assess` (`src/lib/vision.ts`) decides what happens.
   - **No server configured** (`EXPO_PUBLIC_VISION_URL` unset) or **skill not in `GET /skills`:** returns `"unavailable"` and the old review UI is shown ("Analysis not connected").
   - **Otherwise:** uploads the clip with `analyzeSkill` and returns the full report.
4. **Review:**
   - The player fills most of the screen, with an "Analyzing your shot…" overlay while waiting.
   - It then plays the annotated replay (`replayUri(report)`), falling back to the original clip if the replay fails to load.
   - `VisionReportView` (`src/components/vision-assessment.tsx`) shows the verdict, each check (value, target, ✓/✗) and the tips.
5. **Pass → Complete skill:**
   - `completeVision` (`src/lib/player-store.tsx`) saves `{ source: "vision", attemptId, spec, completedAt }` with the same guards as the demo completion.
   - The lesson and practice screens are dismissed, and `complete/[id]` shows "VERIFIED BY CAMERA CHECK" with what it unlocked.
   - **Fail → Try again:** nothing is saved.

Saved progress accepts both `"demo"` and `"vision"` completions (`isValidCompletion` in `src/lib/curriculum.ts`). `scripts/verify-frontend.cjs` checks that a vision completion survives a save and relaunch.

## Client API (`src/lib/vision.ts`)

| Export | Use |
|---|---|
| `analyzeSkill(skillId, uri, { mimeType, hand, signal })` | Upload a local video and return the `VisionReport`. Throws `VisionError` with `kind` `not_configured`, `offline`, `timeout`, `cancelled`, `bad_video` or `server`. |
| `getGradableSkills()`, `useGradableSkill(id)` | Which skills have a camera check (cached per session). |
| `serverVisionService` | The `VisionService` adapter used by the practice recorder. |
| `replayUri(report)`, `formatMetric(m)`, `formatTarget(m)` | Display helpers. |

**Upload uses `XMLHttpRequest`, not `fetch`.** Expo SDK 58 replaces global `fetch` with `expo/fetch`, which throws `Unsupported FormDataPart implementation` for React Native `{ uri, name, type }` file parts, so the upload would never leave the phone. `[vision]` lines in the Expo terminal log the URL, file, timing and any error.

## Setup
```
# app/.env (gitignored); use the laptop's LAN IP, not localhost
EXPO_PUBLIC_VISION_URL=http://192.168.x.x:8000
```
Restart Expo with `npx expo start -c` after changing it.

## Grading rules vs the curriculum's camera notes
The curriculum file's `cvActivity.checks` describe the original idea for each camera test. **Actual grading uses `vision/specs/`.** Where they differ:

| Skill | `cvActivity.checks` says | Spec does | Notes |
|---|---|---|---|
| BEEF / one-hand / guide-hand form | Set-point elbow 70–110° | `set_point_elbow` 50–110° | Provisional, calibrated on one clip |
| BEEF form | Follow-through held 1 s or more | `follow_through_s` at least 0.3 s | |
| BEEF form | Elbow under the wrist, wrist above the head | Not checked | Spec checks release extension and direction instead |
| One-hand / guide-hand form | Guide-hand position, make detection | Not checked | Same `shoot_form` spec as BEEF |
| All form skills | Form score 80%+ over 10–20 shots | One passed shot completes the skill | Decided for the app flow |
| Shot fake | Knee under 150° | `knee_at_top` 90–155° | |
| Shot fake | Wrist above eye level, back down within 0.6 s | Wrist above nose for 0.15–1.0 s; feet stay down; arms bent | |

Decide as a team whether to change the specs or the curriculum text so they agree.
