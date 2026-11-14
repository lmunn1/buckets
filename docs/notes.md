# Brainstorm notes

## Original concept

- Dashboards to track progress.
- Show where to get equipment, what research to do, and which skills to learn.
- Structure: hobby → skill → goal.

## Motivation

- Gamification: tiers, levels, badges, quests.
- A Duolingo-style level map.
- A board game / RPG feel.

## Pivot

- Moved from general hobbies to sports.
- Look for overlap between sports in computer vision.
- Reuse the same ML tools across sports.

## Skill graph plan

1. Tell the AI we're building a beginner basketball app where skills form a web of nodes that starts small.
2. The AI generates ~100 basketball skills across beginner, intermediate, and advanced.
3. The AI determines the unlock order: what each node requires. Some nodes need no prerequisites, some need several.
4. Once every skill has its prerequisites, use an AI template to generate a lesson for each skill (text, YouTube video, practice).
5. The AI must understand what's actually needed to move on, not just a linear order.

## Starting skill categories

- **Shooting:** form, free throws, mid-range, threes
- **Layups:** regular, reverse, floater
- **Finishes:** TBD
- **Moves**
- **IQ:** understanding different plays
