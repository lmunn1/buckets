# HOOP — Mobile UX, Screens, Graph Behavior & Codex Implementation Handoff

**Purpose:** Source-of-truth design brief for the frontend of a 36-hour React Native / Expo hackathon MVP. The app helps basketball beginners learn through guided lessons, a comprehensive graph of prerequisite-linked skills, and vision-assisted skill checks. **This is NOT a linear Duolingo course; the underlying skill graph is a large interconnected web.**

## 0. Non-negotiables
- Product: basketball-first beginner learning, extensible to other sports later, not a fitness tracker or generic AI chatbot.
- Team ownership: frontend developer owns mobile UI, flows, tree **visual renderer**, lesson/presentation, warm-up interface, and integration; teammate A owns skill-node graph data, prerequisites, progression logic; teammate B owns computer vision and feedback capabilities. Coordinate boundaries; do not overwrite teammate code.
- App UI: mobile-first, legible, calm, useful on a basketball court, purpose-led. No generic AI dashboard cards, gratuitous glows, invented analytics, emojis-as-icons, or wall-of-nodes on every screen.
- Graph: ~100+ lessons spanning interconnected Shooting, Ball Handling, Finishing, Defense, Moves, IQ/Fundamentals. Nodes have 0, 1, or multiple prerequisites; edges can cross categories; some advanced moves combine several branches. The **same** complete graph powers home recommendations, warmups, and exploration.
- Hero principle: **Duolingo-like clarity on what to learn next; RPG-like depth when exploring the map.**
- Assessment: do not declare the camera system complete before teammate confirms capabilities. Mock assessment states must be explicitly labeled as demo/simulated.

## 1. Design decisions and navigation
Bottom tabs (MVP): **Home · Skill Tree · Practice · Profile** (only create separate Progress tab if clear need; profile can contain detailed progress). During onboarding/lesson/assessment, use stack screens, hide tabs where immersive use benefits.

Hierarchy:
1. **Home**: single next recommended lesson CTA; 5-minute Quick Warm Up; small, approachable progress summary (e.g. `3 of 8 Beginner Fundamentals`); small preview and `Explore the tree` entry. Avoid showing `97 skills remaining` as primary motivational metric.
2. **Skill Tree**: immersive, navigable *large web* with cross-category prerequisites, zoom, pan, focus, search, legend, and tap-for-detail sheet. Home's focus target selects/recenters the corresponding node in the same graph.
3. **Practice**: user chooses 5/10/20 minutes each session; a sequence assembled from already-unlocked or completed skills, favoring fundamental review. Short-form explanation for short sessions; longer clips/drills if time allows. No second unrelated lesson content source.
4. **Profile/Progress**: meaningful counts (completed / total or verified / total, category breakdown), optional badges/recent activity. No fabricated streaks / XP unless tracked.

Core path: `Welcome -> Short Skill Setup -> Home -> Next Lesson -> Lesson (text, visuals, video, practice CTA) -> Assessment (when ready) -> Feedback -> Completion -> Newly Available Skills -> Home or Tree`. Alternate: `Home -> Quick Warm Up -> 2–3 drills -> Session Complete`. Exploration: `Home/Tree -> Search/Category/Neighbor Focus -> Selected Node Sheet -> Lesson OR View Prerequisites`.

## 2. Screen-by-screen designs

### 01. Welcome / sport selection
- Basketball active; other sports 'coming soon' and not clickable.
- Single confident headline: 'Get better at basketball, one skill at a time.'
- CTA: `Get started`; optional `See how it works` only if it truly helps.
- Avoid 4-step questionnaire crammed onto welcome; progressive onboarding.

### 02. Onboarding / proficiency & goals
- 3 compact steps with step indicator: experience (`Brand new` / `Know the basics` / `Play sometimes`); skills to focus on (Shooting, Handling, Finishing, Defense, IQ, Moves with beginner-readable explanations); time available (5, 10, 20+ min). If useful add one confidence scale per priority skill, but don't force many questions.
- Choices are descriptive, not judgmental; advanced basketball words explained.
- Completion button: `Build my path`.
- Self-report influences recommendations/starting focus but **does not imply verified mastery of prerequisites**.

### 03. Home: daily learning dashboard
- Top: small Hoop mark; restrained optional streak only if real.
- Main hero: `UP NEXT` with actual recommended node title/category/time and `Start lesson` CTA. Visual treatment clean, no giant photo consuming half of phone.
- Second action: `Quick warm up · 5 min · Review what you've learned` or, for new users, `Try a 5-minute beginner warmup`.
- Compact fundamentals progress: `3 of 8 completed` with 8-step progress bar; optional `Explore your path` small tree fragment, not a fake linear depiction of the graph.
- Bottom nav persistent. No massive analytics blocks, weekly charts, or inflated badge cards.
- Empty state: `Let's start with ball control` and first lesson; warmup still works with beginner content.

### 04. Tree — overview (whole graph)
- Full-screen immersive, preferably top header + filter/search; bottom navigation or exit affordance.
- Reference composition: original screenshot radial/constellation web with central `You/Start`, subtle category-colored *regions*, curved/directional lines across category boundaries, rings/icons for nodes, category labels as geographical anchors. **Not** five disconnected vertical tracks.
- Overview shows many nodes (~100) as small readable **clusters/dots**, NOT 100 overlapping titles. Category legend / counts; colors secondary to icon/status. Search control; recenter `My position` and `Recommended` chip; `? How this works` lightweight guide.
- Categories are visual regions and filters, **not isolated graphs**. Cross-category edges stay visible at overview where useful.
- Far zoom: labels for category anchors only and selected/high-value milestones. Medium zoom: labels for nearby nodes. Near zoom: selected node and immediate neighbors/prerequisites.

### 05. Tree — neighborhood / selected node
- Default open to user's next recommended node with 1–2 hops around it highlighted while rest of web stays subdued. This makes large graph workable on phone.
- Tap node -> keep the selected node highlighted; render bottom sheet with: name, category, estimated duration, `READY / LOCKED / COMPLETED`, 1-line reason/value, prerequisite checklist, what this unlocks, CTA (`Start lesson` if ready, `Review` if completed, `See missing prerequisites` if locked).
- If locked: show missing prerequisites and offer `Take me to the closest available prerequisite` (never dead-end). Two-parent example: `Stepback Jumper` requires `Stepback Dribble` AND `Shooting Fundamentals`.
- Gestures: 1-finger pan, pinch zoom, tap, explicit `Recenter` button. Avoid tap conflicts with map dragging; min hit targets 44pt; bottom-sheet taps accessible.
- Search: highlights match and centers matching node. Filtering dims unrelated nodes and keeps relevant prerequisite bridges, not destructive hide-all filtering.
- Graph nodes: Ready = bright lime ring; Completed = orange/check; Locked = neutral gray/lock; Selected = focused outline distinct from mastery; status also conveyed by icon/text, not just color. Follow true project data; do not hardcode state in visuals.

### 06. Lesson detail
- Header `Shooting > BEEF Form` + short outcome, estimated time.
- Order mandated by concept: **Text explanation -> Visual step illustration(s) -> Verified video / video placeholder -> Practice instructions -> Start assessment**.
- Text concise and scannable: goal, 2–4 steps, 1–2 common mistakes. One primary CTA anchored near bottom. Keep screen practical while standing at court; no overwhelming textbook formatting.
- For MVP, use real verified tutorial links only; otherwise labeled video placeholder and safe fallback.
- Optional contextual Ask Coach only if there's time and a real capability.

### 07. Practice: choose time / quick session
- Home CTA quick warmup directly starts default short session OR navigates to compact duration picker if desired; dedicated Practice tab allows 5/10/20 min.
- Preview 2–5 small drill steps and approximate durations, sourced from same lesson/skill catalog. `Start 5-min warmup` primary button. Each drill card: skill, instruction, timer/reps and complete/next; short-form visuals for short sessions. Allow `Skip` or `I don't have a ball` adaptation if built.
- Practice completion is not automatically verified node mastery. It can count toward activity without unlocking new prerequisite paths.

### 08. Assessment readiness / recording / feedback (capability-dependent)
- Capability-dependent screens; don't promise real ball tracking, accuracy, or shot makes unless supported by teammate's model. MVP states: `Prepare` -> `Camera preview or demo placeholder` -> `Analyzing` -> `Feedback` -> `Retry` / `Complete`.
- Clear placement guidance and privacy/camera permission UI; communicate observable criteria from teammate. If unavailable, mark `Demo assessment` and never fake AI confidence as truth.
- Feedback: 1–3 specific observable cues, one main action; no unexplained raw score as sole feedback.

### 09. Completion/unlock
- Small but satisfying success moment: `Skill completed`, skill name, checkmark, **actual** newly unlocked nodes (if any), `Continue to next skill` and `See on map`.
- XP/badges only if defined and recorded. For mock prototype use no fake numerical achievements.

### 10. Profile/progress
- Completed count and percentage over a **defined denominator** (`X of Y total skills`, or beginner fundamentals count), category progress, recent completions, optional badge list. Preserve category cross-links; never imply category completion = independent path.
- Useful rather than heavy analytics; can be cut if time is short.

## 3. Visual system
- Appearance: near-black (#101113) canvas; elevated dark surfaces (#1A1C20 / #22252A); primary text near-white (#F4F5F7); secondary text #AEB3BC; thin divider #343840; orange CTA (#F47A20). These are design-starting examples, subject to contrast testing.
- Semantic category accents for graph: shooting green, ball handling orange, finishing cyan, defense coral/red, IQ violet, moves gold. Provide labels/icons for all categories. Node status (ready/completed/locked) is **separate** from category color so meaning remains legible.
- Typography: 28–32px main header; 20–24px section header; 16–18px card/primary; 14–16px secondary; avoid sub-12px labels. 8pt spacing scale; 16–20px horizontal page gutters; >=44x44pt hit regions.
- One dominant CTA per screen. Warmup row secondary CTA. Don't make every card orange; reserve orange for important actions/selected states.
- Depth: subtle strokes and minimal shadows; reserved glows only for selected/ready/achievement nodes on graph. No default glassmorphism, intense neon, random floating basketball images, or arbitrary empty stats.
- Bottom navigation: four tabs Home / Skill Tree / Practice / Profile, avoid fifth tab just for Progress. Consistent icons and active state, support safe areas, Android navigation bar and smaller phones.
- Ensure motion optional/reduced motion support if feasible.

## 4. Graph contract: data/layout/rendering separation
Single source of truth for graph and user progress. Frontend displays, selects, pans/zooms; teammate owns graph data/prerequisites/unlock computation. Proposed interfaces to agree with teammate (not final API):

```ts
type Category = 'shooting'|'ball_handling'|'finishing'|'defense'|'moves'|'iq';
type SkillStatus = 'locked'|'available'|'completed';
interface SkillNode {
  id: string;
  title: string;
  category: Category;
  tier?: number;
  prerequisites: string[]; // AND prerequisites by default
  lessonId: string;
  estimatedMinutes?: number;
  x?: number; y?: number; // normalized layout positions only; teammate may supply separately
}
interface SkillGraph { nodes: SkillNode[]; edges: {from: string; to: string}[]; }
interface UserProgress { completedNodeIds: string[]; recommendedNodeId?: string; }
interface Lesson {
  id: string; title: string; goal: string;
  explanation: string; steps: string[];
  visualAssets?: string[]; verifiedVideoUrl?: string;
  practice: {instructions: string; minutes?: number; reps?: number};
  assessmentId?: string;
}
interface AssessmentResult {skillId:string; passed:boolean; feedback:string[]; isMock:boolean;}
```

State derivation: completed from progress; available only if all required prerequisites completed or explicitly starter; locked otherwise. Recommended must be available; progress total calculated from graph. **No invented unlock logic inside UI components**.

Graph UX rendering proposal for Expo Native: inspect project first. `react-native-svg` offers nodes and edges; `react-native-gesture-handler` + Reanimated can add pan/zoom. 100 nodes can be challenging: render only visible labels at zoom, cache/optimize edge paths, avoid heavy per-node re-renders, measure performance. For web-only preview, `@xyflow/react` is a browser/React choice, **not a drop-in native renderer**. Another option is a WebView graph with consistent adapters if native SVG proves too costly; evaluate tradeoffs and demo target before choosing. Expo SVG install: `npx expo install react-native-svg` after inspection. Sources: https://docs.expo.dev/versions/v58.0.0/sdk/svg/ and https://docs.expo.dev/tutorial/gestures/.

**Graph viewport behaviors / test cases:**
- First open from home: focus recommended available node + immediate parents and children.
- Overview mode shows whole interconnected network, region labels, mostly dots at far zoom.
- Search `stepback` centers correct target and highlights parents, including prerequisites across two category regions.
- Tap locked node: missing prerequisites listed and clickable.
- User completes the last required parent node: dependent child becomes available; graph updates without refresh.
- Filter `Shooting`: keeps visible bridge to selected cross-category prerequisite; doesn't manufacture isolated graphs.
- `Recenter` returns to suggested node; no stranded user after free-pan.
- One-handed use: search, recenter, and major CTA reachable without tiny targets.
- Offline/demo: mock dataset preserves real graph structure (at least 20 representative interconnected nodes across categories) while backend incomplete.

## 5. MVP milestone plan
**Milestone A (first):** Establish navigation/design tokens, onboarding 3 steps, home next-lesson/warmup UI; seeded mock skills; Expo web and ideally Android preview.
**Milestone B:** The comprehensive graph visual renderer with 20 representative nodes + cross-category edges and AND dependencies; zoom/pan/search/recenter, selected node sheet. Graph data adapter accepts 100+ later.
**Milestone C:** Lesson detail; daily practice time-picker and two sample drills; persist progress.
**Milestone D:** assessment placeholder -> teammate real camera integration -> success/unlock; polish and demo rehearsals.
**Cut first if time constrained:** detailed profile analytics, advanced badges, conversational chatbot, fancy transitions, image-heavy onboarding. **Do not cut:** functioning graph + at least one end-to-end skill progression.

## 6. Codex instructions (copy to active Codex conversation)
Act as senior Expo React Native frontend engineer and product designer for Hoop. Read this file FIRST and treat it as the product/UX source of truth. Inspect the existing repository and available previously installed UI/UX/React Native agent skills; read selected skill instructions, don't assume availability. We own frontend and the TREE VISUAL RENDERER; teammate A owns graph data/prerequisites and teammate B computer vision. Do not modify teammate files. Build one cohesive mobile-first app with Home, Skill Tree, Practice, Profile and stack screens for onboarding, lesson, assessment and success. The primary distinction is a Duolingo-like *focused next action* on Home and a *large interconnected comprehensive basketball dependency web* in Tree. Do NOT convert graph into linear milestones or isolated category lanes. Implement visual pan/zoom, search and focus, selected-node bottom sheet, cross-category AND dependencies. UI should not be generic AI dashboard slop; follow the specifics in this handoff. Before writing code: inspect current branch, state, dependencies, Expo setup and graph teammate's API; report file ownership and plan. Then implement **one vertical slice**: Home -> focused Tree -> selected node -> lesson (mock) -> back, using local mock data. Keep code structured to swap adapters. Run TypeScript and Expo web verification, report known native testing gaps, and stop for UI review after that milestone.

## 7. Known open questions to coordinate (don't block initial UI)
- What exactly does teammate A return: graph data only, layout coordinates, node states, recommendation IDs? Who validates prerequisite logic?
- What exactly does teammate B measure, for which first demo skill? What camera states or pass/fail result fields exist?
- Where do lessons/videos live? How are URLs verified? What progress storage is canonical?
- Are users expected to try web, Android, or both for live demo? Determine graph renderer choice accordingly.

## 8. UX rationale / references
- Apple HIG visual hierarchy: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple touch targets and button hierarchy: https://developer.apple.com/design/human-interface-guidelines/buttons
- Nielsen Norman Group progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Duolingo learning path: https://blog.duolingo.com/new-duolingo-home-screen-design/
- Expo SVG: https://docs.expo.dev/versions/v58.0.0/sdk/svg/
- Expo gestures: https://docs.expo.dev/tutorial/gestures/

## 9. Mockup usage
Generated UI mockups are visual direction only, not production screen specifications. Ensure navigation, copy, node counts, progress and graph relationships are driven by actual data. Never hardcode numbers shown in an illustration. Save screenshots/mockups alongside this document in a design-references folder and show Codex the screens individually as visual targets; explicitly explain any differences from the production architecture.
