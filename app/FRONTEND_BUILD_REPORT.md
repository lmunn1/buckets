# Hoop frontend build report

Updated November 14, 2026. The latest revision implements the requested tree, onboarding, lesson, and camera changes on `frontend`. No backend, computer-vision implementation, author graph data, or author prerequisite/placement functions were changed. Earlier frontend commits were already pushed; this revision's final Git status is reported in the chat.

## Implemented experience

- **Tree first:** one persistent canvas replaces selection-driven remounts and layout-driven resets. A single transform moves the scene; nodes no longer resize separately during zoom. Button zoom preserves the viewport anchor, browser wheel preserves the cursor anchor, and pinch preserves the finger midpoint. Resizing the detail sheet preserves the world center and scale. Bounds and explicit overview/recenter controls prevent losing the graph.
- **Browser gestures:** pointer capture avoids the gesture library's large web activation threshold. Pinch responds immediately, supports moving focal points, and rebases when a finger lifts so one-finger panning can continue. Wheel uses a non-passive handler and does not scroll the page. Native continues using Gesture Handler/Reanimated worklets. The scene is memoized and has no per-frame React state updates.
- **Clearer categories:** stronger but restrained track colors, matching node rings/edges/regions, native icon chips, and tappable category badges in overview. Choosing a category frames it and chooses a category entry skill. All 107 skills and 158 links remain in one scene; cross-track bridges are preserved. Ready badges, checks, locks, labels, and experience-placement labels distinguish state from category color. Search ignores punctuation, so stepback finds Step-Back. Screen-space nearest-node selection helps small nodes.
- **Short onboarding:** experience, one focus, and usual practice time. Large selectable cards replace the per-category familiarity questionnaire. A real next-lesson preview shows the result before saving. Experience calls the supplied placement helper with scores 1 / 3 / 5; focus follows actual available skills or their cross-category prerequisites; session time defaults Practice. An unfinished available lesson is resumed first. Setup remains editable.
- **Honest placement:** `placedOut` is distinct from earned/demo `completed`. Placed foundations satisfy author prerequisites but do not count as earned mastery. Settings and tree details identify placement. Editing experience recalculates placement while preserving existing completions. Older profiles migrate safely.
- **Lesson parts:** Understand it, See the technique, Your turn. Readable steps, cues, and common mistakes; then the official video; then practical drill instructions and camera entry. Parts are selectable and resume locally. Opening the video part loads the player without autoplay. Photos and schematic movement guides no longer render in lessons. Their original source resources remain intact.
- **Actual capture:** contextual permission, live preview, front/back camera, Start, a real ten-second positioning countdown, automatic recording for up to twenty seconds, manual finish/discard, replay, and retake. Backgrounding or leaving interrupts active capture and releases the preview. Recordings are temporary and local; audio is disabled. Nothing uploads automatically or grants skill mastery.
- **Vision architecture:** a typed, abortable `VisionService.assess` receives skill ID, the author's CV template/checks/pass rule, and local clip metadata. Its current adapter explicitly returns analysis unavailable. An assessed result can display feedback; verified persistence still needs the teammate's authoritative result validation. Development-only simulated completion remains a clearly labeled secondary preview, separate from recording.
- All fifteen quizzes remain blank and blocked from completion. Daily warmup behavior and the full interconnected curriculum are preserved.

## Teammate handoff

See [camera and placement handoff](design/CAMERA_AND_PLACEMENT_HANDOFF.md) for exact interfaces, platform ownership, URI lifetime, cancellation, and placement mapping. See [curriculum integration](design/CURRICULUM_INTEGRATION.md) for source boundaries.

Native capture uses [capture-surface.tsx](src/components/capture-surface.tsx); browser capture uses [capture-surface.web.tsx](src/components/capture-surface.web.tsx). The shared [practice-recorder.tsx](src/components/practice-recorder.tsx) owns the session. [vision-service.ts](src/lib/vision-service.ts) is the model/transport seam. The existing shared `/analyze` backend contract was not changed or called. A browser Blob URL must be read into a Blob before upload; a native cache URI must be sent as a local file, not treated as a public URL.

Local profile/progress remain AsyncStorage. The frontend does not implement account sync, server validation, computer vision, actual quiz scoring, or fabricated XP/streaks. Temporary native files stay in OS-managed cache; browser object URLs are revoked on discard/unmount. Do not treat these as durable saved videos.

## Free components and research

No paid components, APIs, subscriptions, UI kits, or animation-only dependencies were added.

| Component/tool | License and purpose |
|---|---|
| Expo Camera 58.0.14 | MIT; native permission, preview and video capture, installed with Expo's SDK-compatible installer. |
| Expo Video 58.0.14 | MIT; native playback of the recorded clip. |
| Browser MediaRecorder / pointer capture / video | Standard browser APIs; recording and interaction have no paid service. |
| Existing Lucide React Native | ISC; the same native SVG icon family, now also camera/flip controls. |
| Existing beUI Native adaptations | MIT notices retained; tactile buttons and measured segmented controls. The button now preserves caller-provided accessibility roles. No Pro source. |
| Existing Reanimated / Gesture Handler / SVG / Expo / AsyncStorage | Free open-source runtime. No new visual style or animation stack. |
| Existing Inter fonts | OFL 1.1; local assets and notice retained. |
| TypeScript / ESLint / Playwright / Prettier | Free development tools. Playwright stays in the temporary QA environment; Prettier was used as a pinned one-off formatter. |

The short setup, immediate recommendation preview, and contextual camera permission are informed by [NN/g's mobile onboarding guidance](https://www.nngroup.com/articles/mobile-app-onboarding/) and [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding). These are design decisions, not claims from user studies of Hoop. API work follows [Expo Camera SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/camera/) and [Expo Video SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/video/).

The original references remain the visual direction. Existing Expo design/animation skill research and free beUI/Lucide work are retained. No web UI library was installed into native. Rare UI code, paid beUI Pro resources, and paid transitions MCP were not used. Supplied image metadata remains in source, but galleries/schematics are absent from the current lesson UI. Official YouTube embeds retain original controls, alternate/external actions, and creator ownership; no video is downloaded or rehosted.

## Validation

Run from the Expo app directory:

```sh
npx tsc --noEmit
npm run lint
npx expo install --check
node scripts/verify-frontend.cjs
node scripts/verify-learning.cjs
npx expo export --platform all --output-dir dist-frontend-all
node scripts/preview-export.cjs
node scripts/smoke-experience.cjs
```

The preview is `http://127.0.0.1:8085`. Browser smoke accepts `HOOP_PREVIEW_URL` and `HOOP_PLAYWRIGHT_PATH`; by default it uses the temporary Playwright installation under `%TEMP%/hoop-frontend-qa`. Existing smoke entry points delegate to the revised experience smoke.

Pure checks cover all 107 lessons, 158 links, 46 cross-track links, 53 multi-parent nodes, every AND prerequisite, exact source positions, all blank quizzes, safe repeat/locked/unknown completion, distinct experience placement, recommendations, 500 inverse zoom cycles with a preserved anchor, overview fit, camera bounds, and countdown boundaries.

Browser checks cover the short onboarding and saved preferences, placement changes, all nodes, category selection, persistent canvas on selection, repeated centered zoom, cursor-centered wheel, pan/pinch/finger transitions, punctuation-tolerant search, separate lesson parts without images, video container, actual ten-second timing, cancellation, actual MediaRecorder encoding and replay from a deterministic synthetic camera stream, automatic recording limit, retake, unavailable vision result, denied permission, navigation cleanup, and small-phone layout. No physical webcam is used. Windows Edge's built-in fake camera ended tracks inconsistently, so the deterministic fixture is an animated canvas stream; the browser's real encoder and playback still run. A disconnected camera is handled as an error and never as successful assessment.

Browser video tests stub the external YouTube iframe response. They verify UI integration, not actual external playback. QA captures are in [design/qa](design/qa), with `curriculum-revision` in the current filenames.

## Remaining verification and limits

- Physical iOS/Android camera permissions, recording/replay, interruptions and gesture feel require device testing. Exports check bundle compatibility, not device execution or measured native frame rate. Custom development builds need rebuilding for the added camera/video modules and permission configuration.
- Vision analysis, upload, authentic feedback/scoring, and verified progress writes need the teammate adapter. Blank quizzes can still block later prerequisites until their content/scoring are supplied.
- Placement is a conservative global experience estimate across tracks. Per-track assessment can replace that mapping through the existing seam without changing the source rules.
- Live YouTube availability/playback, app/store identity, and publication privacy/terms remain external/device checks.
- `npm audit --omit=dev` still reports the existing three moderate findings through Expo/fingerprint/minimatch. No newly added camera/video package is named; the suggested Expo downgrade is incompatible and was not applied.

### Current validation status at commit

TypeScript, lint, Expo dependency compatibility, pure learning/frontend checks, and web/iOS/Android exports passed before the local dependency repair. The initial revised browser flow passed with a deterministic synthetic camera, including recording/replay/retake and denied permission. The subsequently expanded final regression run did not complete successfully; its additional gesture-transition, automatic-stop and navigation-cleanup assertions still need investigation. Native device testing remains outstanding. Do not read the coverage list above as a claim that the expanded final run passed.
