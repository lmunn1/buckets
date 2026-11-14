# vision - Part 3: visual model and completion criteria

The knowledge base for skill tests: how the vision model reads a user's video and what counts as passing.

What belongs here:

- Analyzer specs: one file per reusable check (form/pose check, rep counting, tallies). Skill nodes in `/curriculum` reference these through `completion.analyzer`.
- Completion criteria: what the model looks for, thresholds, and the feedback it gives on a fail.
- Notes on models, datasets, and camera setup.

Analyzers should be sport-agnostic where possible, so a new sport reuses them instead of needing new ML work.

Planned analyzer specs (referenced by the curriculum example, not written yet):

- `analyzers/shot-form.md`
- `analyzers/dribble-count.md`
- `analyzers/step-back.md`
