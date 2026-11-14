# Capture, placement, and revised learning flow

## Ownership and entry points

Frontend changes are confined to the Expo app. The supplied [curriculum](../src/lib/hooptree/curriculum.json) and [skillTree helper](../src/lib/hooptree/skillTree.ts) remain unchanged. No computer-vision model, backend, prerequisite algorithm, or graph positions are replaced.

- `/setup`: three short choices: experience, one focus, usual practice time; a real next-lesson preview before saving.
- `/lesson/:id`: selectable parts **Understand it → See the technique → Your turn**. The second part loads the official video player, without autoplay. Photos and schematics are no longer part of the lesson UI. Old media components and source assets are retained as unused resources.
- `/practice/:id`: camera permission, preview, Start, **10-second positioning countdown**, automatic **20-second maximum recording**, finish/discard, replay/retake, analysis handoff. Quiz and locked routes cannot record.
- Quizzes remain blank and cannot be completed. Camera capture does not grant mastery.

## Vision teammate: connection contract

Implement [VisionService](../src/lib/vision-service.ts). The default adapter returns `status: "unavailable"`; no upload, model call, fake score, or success is produced.

```ts
interface VisionService {
  assess(request: VisionRequest, signal: AbortSignal): Promise<VisionResult>;
}
```

The request includes `skillId`, author-provided `template`, `checks`, `passRule`, and `recording`:

```ts
type PracticeRecording = {
  uri: string;
  mimeType: string;
  durationMs: number;
  recordedAt: string; // ISO timestamp
  facing: "front" | "back";
  platform: "ios" | "android" | "web";
};
```

- Native URI: Expo Camera's temporary local cache file. Record with microphone muted and 720p requested. Actual resolution and supported quality depend on the device.
- Browser URI: session-scoped Blob URL, recorded using `MediaRecorder`; codec is selected from supported browser formats. Read it with `fetch(uri).then(r => r.blob())` inside the adapter before upload/inference. It is revoked when discarded/unmounted. Do not send the Blob URL string to a server as if it were public media.
- No video URI or bytes are written to AsyncStorage. Native cache is not a durable media library; add explicit retention/upload policies when connecting the backend. Temporary native cache files are left to the OS rather than copied into permanent storage.
- Use the supplied AbortSignal for upload and inference. Leaving the screen cancels the request; backgrounding interrupts an active countdown/recording and releases the preview.
- Successful analysis returns `{ status: "assessed", passed, feedback, assessmentId }`. The UI displays the feedback. **Persisting verified completion is deliberately not connected**: agree the result validation and canonical progress API first; extend the current demo-only completion provenance rather than writing a real result as `source: "demo"`.
- A development-only simulated completion remains behind an explicitly labeled secondary action. It is separate from recording and never applies to quizzes.

The capture surfaces are separated by platform: [native](../src/components/capture-surface.tsx), [web](../src/components/capture-surface.web.tsx), and a shared [session controller](../src/components/practice-recorder.tsx). Replay uses Expo Video on native and a browser video element on web. No paid services are required. Both Expo packages are MIT licensed.

## Curriculum teammate: placement and recommendations

The frontend calls your existing `applyPlacement` unchanged through [placementFor](../src/lib/learning-service.ts). Experience maps conservatively to a shared track score: **Brand new = 1; Know some basics = 3; Play regularly = 5**. These are product defaults, not a new placement algorithm. The original helper enforces cross-track prerequisites when placing nodes.

`progress.placedOut` stores placement separately from `progress.completed`. Tree access passes both to the author status helper. Placement is labeled as experience placement and does not increase earned completion counts. Editing experience recalculates placement and preserves earned/demo completions. Older local profiles retain their saved work and default to beginner / 10 minutes until edited.

Focus prioritizes available lessons in that track. If the focus is blocked, recommendations follow its missing prerequisites across tracks. An unfinished available lesson is resumed first. Usual session time defaults the Practice duration selector; the daily eight-minute warmup remains the author's fixed routine.

## Tree rendering

- One graph remains: 107 nodes, 158 links, all source positions and cross-track dependencies.
- A persistent canvas uses one transform. Selection does not recreate it; layout resizing preserves its world center and zoom.
- [map-camera](../src/lib/map-camera.ts) owns projection, anchor-preserving zoom, overview fit, and pan bounds.
- Native uses Gesture Handler + Reanimated worklets. Web uses [pointer capture](../src/components/map-gesture-surface.web.tsx) for immediate pinch, moving focal points, wheel zoom, and rebaselining after a finger lifts. React scene reconciliation does not run per gesture frame.
- Category colors are distinct from status. Category badges and icon chips frame the category; all other nodes/bridges remain in the same scene. Search ignores punctuation, so “stepback” finds “Step-Back.” Screen-space nearest-node hit testing helps small nodes remain selectable.

## Research and verification scope

The short setup and immediate preview follow [NN/g's mobile onboarding guidance](https://www.nngroup.com/articles/mobile-app-onboarding/) and [Apple's onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding): ask for useful preferences, defer contextual permissions until needed, and let people start quickly. These are design decisions informed by guidance, not claims from user testing.

API implementation follows [Expo Camera SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/camera/) and [Expo Video SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/video/). Camera permission messages are configured through the Expo plugin; custom native development builds must be rebuilt for the new modules/configuration.

Run `node scripts/verify-learning.cjs` for graph, placement, camera math and countdown contracts. Run `node scripts/smoke-experience.cjs` against the local production preview for browser interactions. The smoke test uses a synthetic camera and stubs the external YouTube iframe response; it does not use a physical webcam or verify real YouTube playback. Native recording and gesture performance require device testing.
