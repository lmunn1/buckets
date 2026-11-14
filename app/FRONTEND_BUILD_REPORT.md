# Hoop frontend implementation

Updated November 14, 2026. Work stays on `frontend`; local commits were requested after implementation. Nothing pushed or merged. Existing unrelated work and teammate-owned curriculum/vision modules were preserved.

## Active curriculum and lesson experience

The app now uses the latest supplied `basketball_skill_tree_with_videos (1).json` and `hooptree-handoff (2).zip`, rather than the earlier 30-skill fixture. The frontend copy of the JSON and author helper is unchanged in [src/lib/hooptree](src/lib/hooptree). [hooptree-adapter.ts](src/lib/hooptree-adapter.ts) translates the author export into the existing UI contract. [learning-service.ts](src/lib/learning-service.ts) remains the single source used by screens.

- All **107 skills / 8 tracks / 158 prerequisite links** are connected. There are 46 cross-track links and 53 multi-parent skills. Author positions are uniformly normalized for rendering, not replaced with independent paths. The author status helper supplies access rules; the frontend guards unknown, locked, repeated, and unfinished quiz completion.
- Each lesson is one continuous reading/practice surface: explanation and steps, coaching cues and expandable mistakes, visual explanation, video, then inline practice. No five-page lesson wizard.
- The 48 explicitly open-license photo slots retain author, license, source, and license links. Failed images advance through supplied URLs and show a useful unavailable state. The 273 YouTube-frame slots have no explicit open reuse license and are excluded from the photo gallery. Original interactive schematic guides and the official video fill those lessons. Schematics are template/category guides, not 107 bespoke anatomical illustrations.
- Each supplied pinned video and alternate is available. Players load only after a tap, do not autoplay, preserve YouTube controls, and provide alternate/external watch actions. Native uses the official IFrame API inside WebView and identifies the installed app through `expo-application`. Web uses an official iframe. Native errors advance through backups; web offers manual backups because an iframe load cannot verify cross-origin playback. Loading timeout and link failure states are present.
- **All 15 QUIZ activities remain intentionally blank.** They have no invented questions, answers, pass, or simulated-completion action; the service also rejects completion.
- Camera assessment is still an explicit simulation, with consent, retry, completion, and local persistence. Nothing records video or claims real pose analysis. Practice logging never completes a skill.
- Daily warmup uses the supplied eight-minute grip/body/nervous-system routine (three timed groups), plus a two-minute completed beginner review when available. A stable daily selection avoids rerender reshuffles. Separate practice sessions retain 5/10/20-minute durations and use available/completed non-quiz lesson drills.

## UI actually implemented

Near-black surfaces, basketball orange, restrained green for access/completion, Inter typography, consistent borders and rounded native controls. The existing theme is extended rather than replaced with another styling stack.

- Home now has a prominent lesson hero, a concise coaching cue, a tactile warmup row, honest four-root foundation progress, and a miniature of the actual 107-node network linking into the map.
- The tree uses actual native Lucide icons, compact icon controls, searchable categories, full dependency focus, a selectable detail sheet, and reduced-detail overview rendering. A label collision pass keeps related labels apart. Filters dim context rather than deleting cross-track prerequisites.
- Pan and pinch use Gesture Handler 3 hooks and Reanimated shared values; React receives the camera after a gesture ends instead of rerendering 107 nodes on every movement. Focus/zoom controls transition transforms. Overview selection follows the same small-node level of detail as the rest of the map.
- Lessons use a single typographic rail with inline disclosures, highlighted coaching cues, a tappable setup/focus schematic, real credited photo galleries where licensed, a lazy video player, and inline practice.
- beUI buttons provide spring press feedback; the adapted beUI measured selector glides between duration/technique options. Occasional disclosure, selected-detail, practice, and success reveals use short Reanimated transitions. Reduced-motion preferences remove spatial reveals and shorten feedback. Tab switches do not slide.
- Inactive screens are hidden from accessibility so screen readers do not find duplicate buttons from another tab. Selectors expose checked states; icon buttons have labels. Tabs have adequate bottom spacing, and detail sheets use less vertical space on short phones.

## Free components, tools, and sources

No paid UI kits, APIs, subscriptions, or animation-only dependencies were added.

| Used | License / purpose |
|---|---|
| [Lucide React Native](https://lucide.dev/guide/react-native) 1.73.0 | ISC, native SVG icons. Package includes its license. Hoop basketball mark remains an original SVG. |
| [beUI Native](https://github.com/starc007/beui-native/tree/ab3e58aa751bffccb725208db2c3740eb2bf643b/src/components) | Public MIT button and TabsList/TabsTrigger indicator architecture adapted to Hoop StyleSheets; full MIT notice retained in [component license](src/components/ui/beui/LICENSE). No Pro components or Uniwind installation. |
| [react-native-webview](https://github.com/react-native-webview/react-native-webview) 14.0.1 | MIT; native official YouTube player container. |
| [expo-application](https://docs.expo.dev/versions/v58.0.0/sdk/application/) | MIT; reads installed app ID for YouTube referrer, no device tracking IDs used. |
| [Inter](https://github.com/rsms/inter) via @expo-google-fonts/inter | OFL 1.1 font, MIT package; local four-weight assets, full font notice in [assets/fonts/Inter-OFL.txt](assets/fonts/Inter-OFL.txt). |
| Existing Reanimated / Gesture Handler / SVG / Expo / AsyncStorage | Existing free open-source runtime, no additional animation stack. |
| Wikimedia images | Only supplied explicit Public domain, CC0, CC BY, and CC BY-SA licenses accepted. Per-photo credits/links displayed. Images are remote; upstream availability remains external. |
| Playwright / TypeScript / ESLint / Prettier | Free local testing/development tools. Playwright stays in the temporary QA environment, outside app dependencies. |

Online skills were actually read and applied: Expo [design system](https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-design-system/SKILL.md), [animation](https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-animation/SKILL.md), and its [recipes](https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-animation/RECIPES.md) (MIT). Discovery used Skill Issue. Applied guidance includes extending existing tokens, measurable control state, purposeful short motion, shared-value gestures, reduced motion, and screenshot critique. These are development instructions, not a paid runtime service.

The supplied component brief was reviewed: Rare UI's framework-porting restrictions exclude copying its code; shadcn/Beautiful UI are web-oriented; transitions.dev paid MCP and beUI Pro are not used. Selective native beUI adaptation avoids a new styling system.

[YouTube player requirements](https://developers.google.com/youtube/terms/required-minimum-functionality) inform the app ID referrer, minimum player dimensions, original controls, user-initiated loading, and external fallback. No videos are downloaded/rehosted, no YouTube Data API key is required, and playback has no paid API integration. YouTube is a third-party hosted service, not an open-source asset library.

## Validation

Run from the Expo app directory:

```sh
npx tsc --noEmit
npm run lint
npx expo install --check
node scripts/verify-frontend.cjs
node scripts/verify-learning.cjs
node scripts/smoke-curriculum.cjs
npx expo export --platform all --output-dir dist-frontend-all
```

The browser smoke defaults to an Expo web server on port 8083 (override `HOOP_PREVIEW_URL`) and the temporary Playwright installation at `%TEMP%/hoop-frontend-qa/node_modules/playwright` (override `HOOP_PLAYWRIGHT_PATH`). For the production build without development overlays, run `node scripts/preview-export.cjs`, open `http://127.0.0.1:8085`, and set `HOOP_PREVIEW_URL` to that address before the smoke. `scripts/smoke-browser.cjs` delegates to the current curriculum smoke; the legacy 30-node fixture remains separately tested and inactive.

Pure curriculum tests cover all 107 lessons, every AND prerequisite, exact source layout, connectedness, empty quiz rejection, repeated/locked/unknown completion, preserved author placement contract, and licensed image filtering. Browser tests cover onboarding, pan/pinch/zoom/search, cross-category prerequisites, continuous lesson content, cue selection, disclosure state, video option selection, inline practice/retry/consent, persistence, daily warmup pause/resume/logging, duration selection, blank quiz, photo attribution/error fallback, profile, and 320px layout. QA screenshots are in [design/qa](design/qa).

TypeScript, lint, Expo dependency compatibility, pure curriculum tests, final web/iOS/Android exports, and the full production-preview browser smoke pass. The production smoke finished with no uncaught runtime errors, including photo attribution/fallback and the 320px compact tree. Separate browser checks confirm all eight profile categories, the Home miniature-to-full-tree entry, no runtime errors, and a reduced-motion preference that preserves button scale during press. Direct per-icon imports reduce the web module graph from roughly 3,500 modules to 1,450 and native Hermes bundles from about 7 MB to 4.5-4.7 MB.

Video UI tests substitute a local iframe response. They verify metadata/selection/container behavior, **not live playback**. Native exports verify bundle compatibility, **not physical device execution**. Real iOS/Android player permissions/referrer behavior and gesture feel need on-device checks. Publication also needs final app/store identities and privacy/terms content.

## Integration remaining

- **Vision teammate:** replace `DemoAssessment` with a typed assessment adapter keyed by the supplied ten `cvActivity.template` names; receive full source node checks/passRule through `sourceNodeFor(id)`. Return a verified result with node ID, attempt ID, outcome, and timestamp. The current persistence only records `source: demo`; verified results must get their own provenance and validation. Do not wire a raw camera event straight into demo completion.
- **Curriculum teammate:** replace/version the author export at the integration seam. All categories, hierarchy, supplied lesson content, links, cues and practice data now flow from it. New activity types need an explicit renderer/capability contract; content changes inside the current format do not require screen rewrites.
- **Quizzes:** supply actual question/scenario/answer data and scoring before enabling assessment. Passing quizzes will unlock dependent IQ/passing/defense nodes; no workaround grants those completions now.
- **Placement:** supplied helper is preserved and tested. Onboarding still uses familiarity only to prioritize lessons; it does not turn self-report into mastery. Wiring the new 1-10 tier-skip placement requires a distinct `placedOut` persisted field and UI state, never fake completion or XP.
- **Services:** profiles/progress are local AsyncStorage. Account sync, server assessment validation, authoritative reward/badge tracking, and actual camera analysis are not connected. Source XP/badge definitions remain intact but no invented streak/XP is displayed.

## Known limits

The diagrams are shared instructional schematics; 273 unlicensed video-frame image slots are deliberately not reused as photos. All videos are supplied picks, not independently certified to remain available or correct. A web iframe may show YouTube's own blocked/removed state; manual alternate and external controls remain available. Gesture performance and motion feel need a release build on a real, slower device. Small-screen tree labels reduce at overview scale and search/list view remain available for precise access.

`npm audit --omit=dev` reports three moderate transitive findings through the existing Expo/fingerprint/minimatch chain. Its suggested change is an incompatible Expo downgrade; no forced downgrade or unrelated dependency migration was applied. No newly added icon/player package was named in that report.
