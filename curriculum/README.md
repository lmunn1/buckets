# curriculum (early drafts, kept for reference)

**Not the live curriculum.** The app uses `app/src/lib/hooptree/curriculum.json`, and skill tests live in `app/data/skills.json` (formats in [`docs/contracts.md`](../docs/contracts.md)). These files are the first schema and examples from planning.

- `skill-node.schema.json`: JSON Schema for one skill node (id, category, level, prerequisites, lesson, completion).
- `basketball.example.json`: 3 example nodes showing how prerequisites work. Not the real curriculum.

Rules for the graph:

- Every node lists its prerequisites as node ids. All of them must be mastered before the node unlocks.
- A node with no prerequisites is a starting node.
- `completion.analyzer` points to a spec in `/vision` when the skill test is checked by the vision model.
