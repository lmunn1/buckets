# Vision handoff for the app

The vision server can grade 4 skills now. This branch adds **two new files and changes nothing else in app/**. Wiring them into screens, recording, and saving progress are yours to decide; below is everything you need.

| File | What it is |
|---|---|
| `app/src/lib/vision.ts` | Client for the vision server. No UI. |
| `app/src/components/vision-assessment.tsx` | Optional results UI (`VisionAssessment`). Not imported anywhere. |

## 1. Point the app at the server
In `app/.env` (gitignored; `.env.example` already has the key), use the laptop's LAN IP, not localhost:
```
EXPO_PUBLIC_VISION_URL=http://192.168.x.x:8000
```
Restart Expo with `npx expo start -c` after changing it. The server runs from `vision/`: `uvicorn main:app --host 0.0.0.0 --port 8000`.

## 2. Which skills have a camera check
```ts
import { getGradableSkills, useGradableSkill } from "@/lib/vision";

const all = await getGradableSkills();   // { "sh-beef": {...}, "sh-onehand": ..., "sh-guide": ..., "sh-fake": ... }
const state = useGradableSkill(node.id); // { status: "loading" | "gradable" (with .skill) | "not_gradable" | "unavailable" (with .error) }
```
Each entry has `{ spec, name, setup: { stand, camera, camera_tip }, criteria, mistakes }` from `app/data/skills.json`. `setup.camera_tip` is the filming instruction to show before recording. Keys are the app's ids (the ones in `hooptree/curriculum.json`). Any skill not in the list keeps the demo flow.

## 3. Grade a video: `analyzeSkill(skillId, uri)`
```ts
import { analyzeSkill, VisionError } from "@/lib/vision";

try {
  const result = await analyzeSkill(node.id, uri);                 // iPhone .mov
  // await analyzeSkill(node.id, uri, { mimeType: "video/mp4" });  // other formats
} catch (e) {
  if (e instanceof VisionError) e.kind; // "not_configured" | "offline" | "timeout" | "bad_video" | "server"
}
```
- `uri` is a local video file uri, e.g. `assets[0].uri` from `expo-image-picker` (`launchCameraAsync` / `launchImageLibraryAsync` with `mediaTypes: ["videos"]`). Neither is installed yet; `expo-image-picker` is included in Expo Go.
- Please record at 720p and keep clips short (one rep, ≤15 s). On iOS that's `videoQuality: UIImagePickerControllerQualityType.IFrame1280x720` and `videoExportPreset: VideoExportPreset.H264_1280x720`. A 5 s 720p clip is about 1.2 MB and takes about 5 s to grade on a laptop; 4K clips take 13 s or more.
- Nothing is ever faked: if the server can't be reached, `analyzeSkill` throws. If you fall back to the demo completion, keep it labeled as demo.

### Response
```ts
{
  graded: boolean,            // false = this skill has no vision check (metrics empty)
  passed: boolean,            // every check ok
  score: number,              // 0-1, fraction of checks ok
  spec: string | null,        // grader used, e.g. "shoot_form"
  skill_id: string,           // what you sent
  attempt_id: string,         // unique per upload; store it with the completion
  analyzed_at: string,        // ISO 8601 UTC
  metrics: [{ name, label, value: number | null, unit: "deg" | "s" | "bool", target: [lo, hi], ok }],
  feedback: string[],         // coaching lines, one per failed check (or one success line)
  debug: {...}                // for the vision side; ignore it
}
```
`formatMetric(m)` gives display text ("92°", "0.38 s", "yes"); `m.label` is the user-facing name ("Knee bend").

## 4. Optional UI: `VisionAssessment`
```tsx
import { VisionAssessment } from "@/components/vision-assessment";

<VisionAssessment
  skillId={node.id}
  videoUri={uri}
  onPassed={(result) => { /* save the completion, then navigate */ }}
  onRetry={() => setUri(null)}  // back to your record step
/>
```
It uploads on mount (and again whenever `videoUri` changes), shows "Analyzing…", then the checks with ✓/✗, the feedback and the time taken. It uses only `hoop-ui` parts and doesn't record, save or navigate. Use it, restyle it, or ignore it and render the response yourself.

## 5. The progress change you'll need: saving "vision" completions
**Bug to avoid:** the saved-progress load check in `player-store.tsx` rejects any completion whose `source` isn't `"demo"`. If a vision completion is saved as-is, the **next launch shows "Your saved progress could not be loaded"** and the user is stuck. These are the exact changes I tested (then removed from this branch):

`src/lib/curriculum.ts`:
```ts
export type Completion =
  | { source: "demo"; completedAt: string }
  // Verified by the vision server: attemptId/spec identify the graded upload.
  | { source: "vision"; completedAt: string; attemptId: string; spec: string };
```

`src/lib/player-store.tsx`, in the load check:
```ts
!Object.values(data.progress.completed).every(
  (c) =>
    c &&
    typeof c.completedAt === "string" &&
    (c.source === "demo" ||
      (c.source === "vision" &&
        typeof c.attemptId === "string" &&
        typeof c.spec === "string")),
)
```

`src/lib/player-store.tsx`, a new store action next to `completeDemo` (also add it to the `Store` type). It reuses `completeSkillDemo`'s guards (unknown, locked, quiz, already done) and then records the vision provenance:
```ts
completeVision: (id, attempt: { attemptId: string; spec: string; completedAt: string }) => {
  try {
    const progress = current.current.progress;
    const next = completeSkillDemo(catalog, progress, id);
    if (next === progress) return Promise.resolve(true); // already completed
    return commit({
      ...current.current,
      progress: {
        ...next,
        completed: { ...next.completed, [id]: { source: "vision", ...attempt } },
      },
    });
  } catch {
    setError("This skill still has prerequisites. Return to the tree to review them.");
    return Promise.resolve(false);
  }
},
```
Call it as `completeVision(node.id, { attemptId: result.attempt_id, spec: result.spec!, completedAt: result.analyzed_at })`. With these changes `tsc`, `expo lint`, `verify-frontend.cjs` and `verify-learning.cjs` passed, and demo completions still saved as `"demo"`. You may also want `complete/[id].tsx` to say "verified" instead of "DEMO SKILL COMPLETE" when `source === "vision"`.

## 6. Unrelated bug found while testing: "Unmatched route" on launch
After onboarding (a saved profile), launching the app shows **Unmatched route**. In `src/app/_layout.tsx` the `index` screen is inside `<Stack.Protected guard={!player.profile}>` with no `redirectTo`. expo-router then falls back to the first allowed route, the `(main)` group, which also maps to `/` but has no index screen. A one-prop fix that worked:
```tsx
<Stack.Protected guard={!player.profile} redirectTo="/home">
```

## 7. Grading conflicts to settle as a team
Thresholds come from `vision/specs/*.json`, not from `cvActivity.checks` in `hooptree/curriculum.json`. Where they differ (for example BEEF follow-through 1 s in hooptree vs 0.3 s in the spec), see the conflicts table in `docs/` once it's added.
