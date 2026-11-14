# Hoop mobile product and frontend plan

## Authority and current state

The user's master Hoop brief and subsequent correction are the current product requirements. The older hobby/basketball narrative provides supporting context; it does not transfer ownership of the curriculum or vision implementation to the frontend developer.

Hoop is a React Native / Expo mobile app. The confirmed demonstration target is the user's iPhone through Expo Go. Expo web is a secondary development preview on Windows. Browser rendering does not establish that touch interactions, navigation, camera behavior, or safe areas work on a phone. Select Expo Go-compatible dependencies for this scope; verify SDK compatibility on the actual phone before the demo.

The current Welcome / Setup / Home implementation is an incomplete prototype. It lacks category proficiency, persistent profile/progress, primary tab navigation, and an interactive graph. Its three sample skills do not constitute the skill tree.

## Product structure

First launch:

Welcome (basketball already selected) -> one goal -> two compact category proficiency screens -> Dashboard with the starting recommendation embedded.

Practice time is excluded from the current onboarding, profile, dashboard, and recommendation scope. Daily Practice remains a later milestone; its duration selector and content-length adaptation are deferred.

Returning launch:

Load saved profile and progress -> Dashboard. The user can revisit proficiency/preferences through an edit action without repeating onboarding.

Main navigation has two primary tabs:

- Dashboard: what to do today, resume learning, Daily Practice, meaningful progress.
- Skill Tree: explore lessons, understand prerequisites, and choose a skill.

Skill detail and lessons open above the tabs in a navigation stack. Finishing onboarding leaves its stack; Back from Dashboard must not reopen completed setup. Switching tabs preserves the selected category and graph position.

## Onboarding and proficiency

Welcome explains the specific promise: learn basketball through short lessons and demonstrate skills to unlock new ones. Basketball is the active sport; other sports do not need an extra selection step.

Ask for one immediate improvement goal (including "Learn the basics"), then rate these six areas:

1. Ball handling / dribbling
2. Shooting
3. Layups and finishing
4. Defense
5. Game moves / creating space
6. Basketball IQ / understanding play

Group the six areas into two proficiency screens with three category rows each: ball handling/shooting/finishing, then defense/game moves/IQ. Each row has three labeled choices: New / Learning / Comfortable, plus a Not sure action and an accessible explanation with category-specific behavior examples. Do not use numeric sliders. Offer "I'm new to all of these" to set all six to New and proceed directly to Dashboard. Preserve answers on Back. Leave unrated areas explicit until answered or the beginner shortcut is chosen. This grouping is a design hypothesis to validate for readability on the iPhone, not a researched universal optimum.

Each category uses behavior descriptions, not unexplained numeric sliders or advanced terms. Example for ball handling:

- New: "I'm learning to keep the ball bouncing."
- Learning: "I can dribble standing still, but moving is hard."
- Comfortable: "I can move with the ball and switch hands."
- Not sure: use a foundational recommendation without asserting mastery.

Write equivalent descriptions for the other categories and review them as UX copy. Self-reports are stored separately from assessed progress.

Show the recommendation and its reason directly on Dashboard; avoid a separate confirmation or fake analysis screen. Include an edit starting-point action. No practice-time question. The first welcome view should demonstrate a small skill-path example and promise a concrete outcome: build basketball skills and unlock the next move. Do not pretend a displayed example is assessed user progress.

Placement MVP: proficiency changes priority and recommended starting focus. It does not mark prerequisites completed. Experienced users may need a placement challenge, but its scope and supported assessments require agreement with the graph and vision owners. Until that exists, explain any prerequisite requirement honestly.

## Dashboard

Prioritize:

1. Resume the current lesson, or one recommended available lesson with a reason.
2. Clear access to the Skill Tree; add Daily Practice in the later practice milestone.
3. Link into the relevant part of the Skill Tree.
4. Actual completed-skill and category progress from the shared progress state.

Use a helpful first-session empty state. Do not display invented XP, streaks, skill scores, or practice minutes. Begin rewards with completed skills and newly unlocked lessons; add one XP rule only if it improves the demo after the core loop works.

## Skill Tree

Recommend one canonical directed graph with category-focused views. Separate views must not produce separate prerequisite systems.

Phone interaction:

- Category selector with text labels and category colors.
- Vertically arranged branching nodes and visible prerequisite connectors.
- Completed, available, and locked states; recommendation is an additional highlight, not an unlock state.
- Start focused near the recommended node; offer a return-to-recommendation action.
- Tap any node to inspect its lesson summary, completion state, and prerequisites.
- Locked-node detail lists each prerequisite and its status. Cross-category requirements link to the other category and node.
- Example requirement: a step-back shot requires both the relevant shot lesson and step-back movement lesson. Every incoming requirement must be satisfied.
- Provide a readable list alternative for accessibility; never rely on color alone or precision gestures.

The graph teammate supplies IDs, categories, nodes, edges, lesson content, and unlock semantics. UI layout positions, selection, scrolling, category filtering, and connector appearance belong to the frontend. Request optional layout hints only if the teammate already produces them; do not require a new graph format for screen layout.

Start the frontend preview with a clearly identified fixture of roughly 8-12 nodes across a few categories, including a branch and a cross-category join. This is a rendering fixture, not a replacement basketball curriculum. Agree on demo curriculum scope with the teammate before integration. Select a native-compatible connector implementation after inspecting their data/layout output; no web-only graph component or new graph engine is assumed.

## Shared frontend state and integration

Screens read the same state:

- Learner profile: sport, category proficiency, selected goal, onboarding completion.
- Catalog: canonical nodes, category metadata, lesson content, prerequisite IDs.
- Progress: lesson position, completed skills, completion evidence, practice history.
- Future practice session: references to existing skill/drill IDs. Duration settings are deferred.

Persist profile and progress locally for the MVP. On launch, distinguish loading from a genuinely new user. Save errors preserve answers and offer retry. Reset is explicit. Avoid passing the whole profile in route query strings.

Use a small catalog adapter at the integration boundary and pure selectors for availability/recommendations. Validate duplicate IDs, missing prerequisite IDs, and cycles at catalog ingestion. Do not scatter independent unlock calculations through screens or replace the teammate's authoritative rules.

The existing app/data/skills.json and curriculum schema disagree about root shape, IDs, spec/analyzer fields, and lesson validity. Coordinate reconciliation with the curriculum owner. docs/contracts.md says shared contract changes need all three teammates to agree; this plan proposes additions without modifying that contract.

## Lessons and vision boundary

Lesson sequence: text explanation -> visuals -> video -> practice activity.

Content comes from the catalog/content service, not screen-local generation. Select a suitable default demonstration for each lesson; time-based adaptation is deferred. Missing media gets an honest fallback. Do not assume arbitrary TikTok/Instagram URLs support native embedding or offline viewing.

The current schema has text and short/long video URLs but lacks structured visual assets. Propose visual-asset additions to the curriculum teammate, or use a temporary frontend content adapter agreed with them. Never silently change the schema.

Assessment is deferred until the vision teammate confirms supported skills, capture method (uploaded clip vs live camera), setup instructions, duration, result timing, and measurable feedback. Current POST /analyze accepts video + skill_id and returns a mock result. A 0-1 score is not automatically a confidence percentage or proficiency rating. Do not present its current always-pass response as genuine analysis.

Later, a frontend assessment adapter maps the agreed API into UI states. Transport errors, unusable recordings, and failed skill attempts must remain distinguishable. Mock results have explicit provenance and cannot silently become verified real progress. Record self-check completion separately from vision verification.

Daily Practice reuses existing skills and drills, emphasizes reinforcement and foundations, and records practice without automatically granting mastery. Its planner and duration data are shared content concerns, not a second lesson database.

## Design and tools

Use the inspected Expo skills as focused reference material:

- Expo Native UI: safe areas, native controls, readable mobile layouts, platform behavior.
- Expo Router: onboarding stack, primary tabs, lesson navigation and back behavior.
- Expo Design System: extend the existing theme and extract reusable components.
- Expo Animation: purposeful Reanimated/Gesture Handler motion after interaction states work.

Sources:

- https://github.com/expo/skills
- https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-native-ui/SKILL.md
- https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-router/SKILL.md
- https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-design-system/SKILL.md
- https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-animation/SKILL.md

Skill Issue is a discovery catalog, not a design editor or a source of executable authority. Its skill records require inspection at their source. Appllama's design skill is optional reference; the Appllama design library/MCP is a separate service and is not established as connected here. No Figma, Appllama, or new design service is required to begin.

Visual direction: charcoal surfaces, basketball orange for primary actions, controlled category accents, strong type hierarchy, restrained court geometry, clear branching connectors. Node status uses icon/shape/text as well as color. Keep screens useful outdoors, with readable body text, generous touch targets, and controls reachable above safe areas. Avoid decorative statistics and excessive cards.

Before building the full flow, review phone-size layouts for Welcome, proficiency, Dashboard, and Skill Tree together. Sketches can be screen layouts or visual artifacts; the implementation remains native React Native. Prototype key interactions in Expo and review on an actual phone. Windows web preview remains useful for fast layout checks.

## Delivery order and acceptance

1. Establish the four-screen visual direction and the shared profile/catalog/progress model. Include every node state and a multiple-prerequisite example in the design.
2. Implement streamlined onboarding: one goal, six category ratings on two screens, beginner shortcut, and persistent state. Dashboard contains the starting summary. Verify Back, beginner shortcut, edits, restart, and save failure recovery.
3. Implement Dashboard AND Skill Tree against one frontend fixture/state model. Verify category switching, node selection, prerequisite navigation, returning from a lesson, and state consistency between tabs. A list of three skills is not acceptance for the tree.
4. Integrate teammate catalog, lesson sequence, and confirmed assessment capabilities. Verify pass -> completion -> newly unlocked node, and retry/failure behavior.
5. Add Daily Practice using the same lesson/drill IDs; then add limited rewards and polish.

Run typecheck and lint for implementation changes, then test the primary flow on a real phone in Expo Go or the required development build. Report separately what was verified in web, Android, and iOS. Browser export success is not mobile QA.

## Inputs still useful

- Confirmed physical demo/test device: the user's iPhone with Expo Go.
- Graph teammate's current sample/export and any existing layout output, when ready.
- Vision teammate's actual supported assessment capabilities, before assessment UI implementation.

The local repository contains survey takeaways, not the full raw survey or the approximately 54 binder images mentioned in the older narrative. Do not claim to have reviewed unavailable material. Those assets are not required to begin frontend architecture or onboarding design.

## Research applied to the first experience

Reviewed on 2026-11-14. These sources guide hypotheses; they do not establish that Hoop's onboarding is already validated.

- Apple HIG Onboarding: teach through interaction and postpone nonessential setup. Application: show a meaningful path preview, keep the setup small, and request camera access only when starting an assessment. https://developer.apple.com/design/human-interface-guidelines/onboarding
- Nikita Bier's Lenny's Podcast interview: expose core value rapidly and cut friction around the aha moment. Application: show the concrete basketball progression promise immediately. A verified athletic improvement needs real practice; a three-second screen is not proof of mastery or retention. https://www.lennysnewsletter.com/p/how-to-consistently-go-viral-nikita-bier
- Duolingo's official onboarding explanation: plain-language ability descriptions and a route into lessons. Application: behavioral proficiency labels and one clear next lesson. https://blog.duolingo.com/add-new-course/
- Duolingo's local research: friendlier placement wording improved uptake in its experiment. Application: use "Find your starting point" rather than intimidating test language. Do not infer that the same effect size applies to Hoop. https://blog.duolingo.com/lessons-from-asia-turning-local-research-into-global-experiments/

Duolingo influence: clear next action, visible progression, small learning steps, and meaningful completion feedback. Basketball identity: court geometry, athletic typography, movement-specific lesson names, charcoal/orange palette, and skill branches. Bier influence: demonstrate the benefit early and make each setup tap earn its place.

First design review: Welcome, Goal, both proficiency screens, Dashboard, and Skill Tree shown as one phone flow. First usability check: have a few fresh testers on iPhone explain the promise, complete or skip setup, find the first lesson, switch to Skill Tree, and explain a locked node's prerequisites. Observe hesitations and misunderstandings; record time to first lesson as a baseline, not a claimed conversion improvement. Full learning-loop validation later requires real practice and assessment.
