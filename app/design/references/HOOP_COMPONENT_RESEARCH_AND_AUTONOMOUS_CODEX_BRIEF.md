# HOOP — Component Research & Autonomous Codex Build Brief

Updated: November 14, 2026. Companion to `HOOP_FRONTEND_HANDOFF.md` and visual references. This file adds component-library research and an autonomous implementation task; it does **not** replace the product/source-of-truth UX brief.

## Goal
Build a credible, polished, functional React Native/Expo Hoop frontend while the product owner is away. Do not use generic AI UI, and do not attempt to turn a 100+ node interconnected graph into independent tracks. Work from the existing code, approved handoff, and mockups; aim for a demonstrable app rather than an image-only reproduction.

## Source websites reviewed

| Website | Verified characterization | Appropriate for Hoop | Cautions |
|---|---|---|---|
| https://beui.dev/react-native | Actual React Native collection; buttons, cards, radio group, multiselect, tabs, alert, badges, number animation, modal, toast. Uses React Native Reanimated / Gesture Handler / Uniwind per site. https://beui.dev/react-native | First choice for polished native UI primitives when compatible with current Expo stack. Especially selectable onboarding cards, duration choices, tabs, lesson completion toast, node-detail modal/bottom-sheet motion. | Inspect component docs, license, dependencies and existing styling stack. Don't add Uniwind or switch styling globally just for one component; prefer adapted native implementation if integration cost too high. Test native **and** web where expected. |
| https://pro.beui.dev | Additional React Native screens/blocks, paid. | Optional visual inspiration or source if already licensed. | Do not purchase or claim access; don't depend on paid assets. |
| https://rareui.com | 30+ animated React **web** components including Duration Picker (web dependencies: motion, radix, react-use-measure, etc.). https://www.rareui.com/components/durationpicker | Visual inspiration only for tactile time-selection and polished interaction. | Explicit site's license restricts porting to another framework and requires attribution for usage. Do not port/copy Rare UI code into React Native without permission or license review. |
| https://transitions.dev | 43+ motion recipes for React interface craft; success check, panel reveal, tabs sliding, number changes, etc. https://transitions.dev | Inspiration for limited, purposeful native motions: node selection, unlock, lesson completion and small progress updates. | Web recipes aren't drop-in native. Its MCP requires Pro/Business access. Do not configure paid resources, start subscriptions, or introduce complex animation stacks without access and compatibility checks. |
| https://ui.shadcn.com | Web-oriented composable React design system; accessible design patterns. | Inspiration for information hierarchy, selection feedback, disabled/locked states, consistent tokens. | Never install shadcn/ui web primitives directly into React Native. |
| https://beautifului.dev | Primarily AI-agent UI primitives: chat, approval, recommendation, streaming, loading. | Optional Ask Coach later, if the core loop is functional. | Not a core mobile training component library. Web implementations cannot be assumed compatible with native. |

Post context: https://x.com/exm7777/status/2092250905655812121. Original X page was blocked to browser retrieval; post text surfaced via an indexed public mirror. It recommends beautifului.dev, beui.dev, rareui.com, transitions.dev, and ui.shadcn.com. Site observations above were made from the sites directly.

## Product constraints from the established Hoop handoff
- React Native/Expo, TypeScript. MVP basketball only. Native-first, test web for iteration.
- **Home** has one Up Next lesson CTA, one Quick Warm Up button, approachable progress (`3 / 8 beginner fundamentals` example; never invent real values), and entry into the tree.
- **Tree** is one comprehensive graph with 100+ lessons, visual category regions and many cross-category prerequisite edges. In mobile overview zoom, show the whole graph as clusters/dots with no overlapping labels. Normal default opens a 1–2 hop neighborhood around a recommended node. Tapping a node shows details, missing prerequisites and a usable CTA. Pan, zoom, recenter, search. Do NOT transform it into linear Duolingo stages, disconnected category screens, or a static image.
- **Lesson** follows text → illustration → video → practice assessment CTA, with readable mobile layouts.
- **Practice** offers quick recap and optional 5 / 10 / 20 minute sessions built from existing completed/unlocked lesson content; brand new users receive beginner practice, not falsely described as recap.
- **Assessment** functionality is owned by the vision teammate; frontend makes room for interface later, clearly label simulation and do not claim actual CV works.
- **Skill graph data/prerequisites** owned by graph teammate. Frontend owns visual renderer. Preserve all teammate modules and use adapters/mock data where necessary.
- UX should reflect authentic basketball learning, not arbitrary analytics, decorative XP or oversaturated glows.

## Autonomous Codex task (paste this, with handoff and mockups already in workspace)

You are the implementer of the Hoop mobile UI (React Native + Expo). The product owner is stepping away temporarily and wants substantive, verifiable progress without interactive micromanagement.

FIRST inspect `HOOP_FRONTEND_HANDOFF.md`, all available screenshots in the design-references folder, this research brief, the existing repository, AGENTS.md, installed skills, package.json, Git status, active branch, and teammate-owned modules. Identify what is already implemented. Do not reinitialize Git, clone into an existing working directory, overwrite others' work, or create a new Expo app if one exists.

Use the connected `skill-issue` MCP only if relevant existing skills are already available; inspect the skill instructions before using. Do not pull arbitrary scripts from untrusted sites. For UI source, prioritize compatible React Native components at https://beui.dev/react-native; consider select controls/cards/tabs/alerts/motion. Check exact dependencies/licensing before any installation; if expensive or incompatible, build small idiomatic RN equivalents. Treat the other four sites strictly as UX inspiration unless you have verified appropriate native source and rights. Do not purchase anything or request credentials.

Independently build the strongest usable frontend vertical slice that is safe within the existing team repo: Home -> immersive interconnected graph (overview, focused neighborhood, selected-node details) -> lesson -> Quick Warm Up entry. If graph ownership is in-progress, use a local fixture of 20–30 representative nodes with 2+ cross-category multi-prerequisite examples, connected via an adapter; do not make claims that this fixture is the full 100+ authoritative curriculum. Ensure the rendering architecture can scale to ~100+ nodes with level-of-detail behavior and real nodes from the teammate once available.

Keep these invariants: one underlying network; prerequisites never silently disappear across category filters; on zoom-out labels simplify to prevent clutter; tapping node keeps canvas context; bottom sheet shows locked/ready/completed and prerequisite chain; Home derives recommendations and progress from actual app state/fixture; lesson practice is not represented as real camera verification.

While working: inspect existing code first, keep changes to frontend files on the current intended feature branch, make minimal safe commits only if repo state is clean and branch is clearly appropriate; otherwise do not commit. Never push or merge to main without authorization. Do not modify computer vision or graph algorithms. Avoid package upgrades or large migrations. Never use uncontrolled external scripts or install paid tools. You may run standard package manager installs for verified, necessary packages already approved by the project setup and regular local checks.

Build in this order: (1) verify project build and navigation; (2) unify design tokens with restrained dark + basketball orange palette; (3) implement actionable Home and Quick Warm Up entry; (4) implement actual connected graph visualization with details and relevant filters/search; (5) implement lesson detail screen; (6) verify flow and polish. Don't spend hours on particle effects or badges.

After each milestone run TypeScript checks and smoke test Expo web where possible; note native-only features that cannot be validated. If commands fail, diagnose and fix safe local issues rather than declaring success. Capture screenshots if tooling permits, compare with references, improve once. If screenshots unavailable, report that honestly.

When finished, create `FRONTEND_BUILD_REPORT.md` containing files changed, major UX decisions, which external patterns/components were actually used (with source URLs and license notes), how to run it, what was tested, what remains mocked/unverified, any blockers, and the exact integration contract needed from each teammate. Do not claim that untested code works.

Do all safe independent tasks without asking routine questions. Pause only on genuinely blocking choices: unclear ownership/conflicting teammate changes, destructive actions, paid/licensed resources, credentials, or permissions. Work on the current task until its validation steps are done; do not claim to be running asynchronously beyond the active Codex agent session.

## Acceptance checklist
- [ ] Code stays in actual existing Hoop Expo repo and intended frontend feature branch.
- [ ] At mobile width the Home shows Up Next, Quick Warm Up, small genuine progress, Tree entry.
- [ ] A single connected web shows cross-category dependencies, 0/1/many prerequisites and zoom/focus states.
- [ ] Tree labels do not overlap catastrophically at 100-node scale; usable touch hit targets / focused node details.
- [ ] Node -> Lesson is navigable; lesson includes text, visuals, video block, practice CTA (mock if needed).
- [ ] Quick Warm Up uses existing skills and handles a brand-new user's empty history.
- [ ] Component dependencies are actually RN/Expo-compatible; no copied web-only code.
- [ ] TypeScript and available smoke checks run, failures disclosed.
- [ ] Scope and blocked work documented, no unauthorized push, purchases, or teammate overwrites.
