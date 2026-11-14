# Buckets

An app that teaches sports beginners skills through an unlockable skill graph, with AI-checked skill tests.

Basketball comes first. Later sports will reuse the same computer vision tools (form and pose checks, rep counting, tallies), so the ML work isn't duplicated for each sport.

## User flow

1. The user picks a sport (basketball first).
2. The user rates their proficiency in pre-seeded categories (shooting, dribbling, defending, etc.) so they start at the right node, not at zero.
3. The app builds skill trees in the areas they emphasized.
4. Each node has a lesson: video, text, or picture examples.
5. Skill test: a vision model interprets the user's video and gives feedback.
6. Pass the test to unlock the next node.

## The skill graph

Skills are nodes. A node can need zero, one, or several prerequisite nodes before it unlocks, so the graph is a web rather than a straight line.

Example: "Dribbling" and "Shooting" are separate nodes, and both must be mastered to unlock "Step-back" (a move node).

```
Shooting form --+
                +--> Step-back
Dribbling ------+
```

## The three parts

| Part | Folder | What it covers |
| --- | --- | --- |
| 1. UI/UX and user flow | [`app/`](app/) | Screens, flows, wireframes, and later the app code |
| 2. Lesson plans | [`curriculum/`](curriculum/) | The skill graph, node schema, and the lesson for each skill |
| 3. Vision model and completion criteria | [`vision/`](vision/) | How a video gets checked, and what "passed" means for each skill test (knowledge base) |

Supporting folders:

- [`docs/`](docs/): concept, brainstorm notes, survey takeaways, decisions
- [`archive/`](archive/): material from the earlier general-hobby version, kept for reference

## Status

Planning stage for HackUMass. No app code yet.
