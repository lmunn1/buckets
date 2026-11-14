# curriculum - Part 2: skill graph and lesson plans

The skill graph for each sport and the lesson attached to every node.

- `skill-node.schema.json`: JSON Schema for one skill node (id, category, level, prerequisites, lesson, completion).
- `basketball.example.json`: 3 example nodes showing how prerequisites work. Not the real curriculum.

Rules for the graph:

- Every node lists its prerequisites as node ids. All of them must be mastered before the node unlocks.
- A node with no prerequisites is a starting node.
- `completion.analyzer` points to a spec in `/vision` when the skill test is checked by the vision model.

The full ~100-skill basketball graph is a separate task.
