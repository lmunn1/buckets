# Curriculum and assessment integration

The latest supplied 107-node author export is active. Screens import [learning-service.ts](../src/lib/learning-service.ts); they do not read teammate files directly.

## Data flow

1. [hooptree/curriculum.json](../src/lib/hooptree/curriculum.json) and [hooptree/skillTree.ts](../src/lib/hooptree/skillTree.ts) are unchanged copies of `basketball_skill_tree_with_videos (1).json` and the helper from `hooptree-handoff (2).zip`.
2. [hooptree-adapter.ts](../src/lib/hooptree-adapter.ts) maps title/track/prerequisites/lesson fields to frontend contracts, supplies Hoop category accents and native icon keys, and calls the author status helper.
3. [learning-service.ts](../src/lib/learning-service.ts) exports the active pack, categories, catalog, sourceNodeFor, lesson sections, and completion guards.
4. [graph-layout.ts](../src/lib/graph-layout.ts) uniformly scales supplied XY coordinates around the existing UI hub. All 158 edges remain; filters only dim context. It contains presentation/navigation helpers, not mastery logic.

Keep stable IDs when replacing content. Validate the new export before changing the active assignment. Existing category familiarity defaults safely; removed goals become basics. Old demo IDs are not silently promoted into new curriculum completions.

## Lesson parts and camera

The current lesson flow is **Understand it -> See the technique -> Your turn**, with selectable parts and saved resume metadata. Explanation includes cues and common mistakes; See the technique uses the official video. Photos and diagrams no longer render in the lesson. Your turn leads to a separate camera practice screen with permission, countdown, real recording, replay, and a vision adapter.

See the [camera and placement handoff](CAMERA_AND_PLACEMENT_HANDOFF.md) for platform files, temporary video lifetime, interruption behavior, and the exact teammate interface.

`sourceNodeFor(id)` retains every source field, including tier, XP, supplied photo credits/fallbacks, video alternates, layout, and full `cvActivity` checks/passRule. The UI does not expose technical CV rules as user instructions.

The typed `CurriculumDocument` / `LearningPack` authoring adapter remains available for an alternate export format. Content and hierarchy changes within the agreed schema do not require individual screen rewrites. New interactive lesson types need a registered renderer, validation, and a completion capability; they cannot be treated as ordinary text automatically. The current implementation supports shared movement/knowledge/drill shells. The 15 QUIZ activities intentionally have no questions or pass action.

## Media policy

The source image metadata and existing media utilities are retained unchanged, but images and movement guides are no longer rendered in lessons. The app does not download or rehost video frames.

[lesson-video.tsx](../src/components/lesson-video.tsx) loads the pinned video when the learner opens See the technique, without autoplay, permits alternate selection, and always exposes an external YouTube action. Native [youtube-player.tsx](../src/components/youtube-player.tsx) uses the official IFrame API in WebView, the real installed application ID as referrer, and automatic backup on player errors. Web [youtube-player.web.tsx](../src/components/youtube-player.web.tsx) uses an official iframe with manual backup selection. No files are downloaded from YouTube. Live playback remains a device/network check.

## Progress and ownership

Local progress includes `completed` (demo-only provenance), distinct `placedOut` foundation placement, `lessonSteps` for the selected lesson part, and `practiceCount`. Profile adds optional `experience` and `sessionMinutes` fields; existing local profiles migrate safely. Completion is guarded against unknown IDs, locked nodes, repeats, and blank quizzes. Daily warmup and recap logging only increment practiceCount.

The author `applyPlacement()` is now connected. Experience choices map to scores 1 / 3 / 5 across tracks; its existing cross-track pruning stays authoritative. Placement is persisted separately and labeled; it never increases earned completion or XP. Focus can recommend prerequisite lessons in another category. Session time defaults the Practice picker.

Teammate-owned [curriculum/](../../curriculum), [data/](../data), [vision.ts](../src/lib/vision.ts), backend modules, and [docs/contracts.md](../../docs/contracts.md) have not been changed by this integration.

## Vision seam

Implement [VisionService](../src/lib/vision-service.ts) using the supplied CV template/check/passRule and the local recorded clip. The UI handles permissions, a ten-second countdown, automatic recording, interruption, replay, retake, and cancellation. The default adapter reports analysis unavailable. No actual pass/fail or verified completion is fabricated. DemoAssessment remains an explicitly labeled developer preview, separate from capture.

The existing shared endpoint contract remains `POST /analyze`, multipart `video` and `skill_id`, returning `{ passed, score, metrics: [{ name, value, target, ok }], feedback }`, and `GET /health` returning `{ ok }`. Agree on supported skills and authentic result validation before connecting it. The current UI sends no recordings or analysis requests. An always-pass placeholder must remain labeled mock.

## Checks

`node scripts/verify-learning.cjs` verifies 107 lessons, 158 links, all-prerequisite rules, source coordinates, safe demo completion, all 15 blocked quizzes, placement helper invariants, and the licensed photo subset. `node scripts/smoke-curriculum.cjs` exercises browser interactions; native release-device checks remain required. See [the build report](../FRONTEND_BUILD_REPORT.md) for exact test coverage and limitations.
