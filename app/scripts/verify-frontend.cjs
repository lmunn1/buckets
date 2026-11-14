// Exercise real progression and graph-layout code without a native service or test dependency.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
const path = require("node:path");
const file = path.join(__dirname, "../src/lib/curriculum.ts");
const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loaded = { exports: {} };
new Function("module", "exports", "require", source)(
  loaded,
  loaded.exports,
  require,
);
const {
  demoCatalog,
  blankProfile,
  blankProgress,
  skillState,
  recommend,
  completeSkillDemo,
  layoutBranch,
  validateCatalog,
  adaptCatalog,
} = loaded.exports;
const node = (id) => demoCatalog.nodes.find((n) => n.id === id);
let progress = blankProgress();
assert.equal(skillState(node("change-direction"), progress), "locked");
assert.throws(
  () => completeSkillDemo(demoCatalog, progress, "change-direction"),
  /Prerequisites/,
);
progress = completeSkillDemo(demoCatalog, progress, "ball-control");
assert.equal(skillState(node("low-dribble"), progress), "available");
progress = completeSkillDemo(demoCatalog, progress, "low-dribble");
assert.equal(
  skillState(node("change-direction"), progress),
  "locked",
  "One of two prerequisites must not unlock a skill",
);
progress = completeSkillDemo(demoCatalog, progress, "switch-hands");
assert.equal(
  skillState(node("change-direction"), progress),
  "available",
  "Cross-category prerequisites should unlock the move",
);
assert.equal(progress.completed["switch-hands"].source, "demo");
assert.equal(
  completeSkillDemo(demoCatalog, progress, "switch-hands"),
  progress,
  "Completion is idempotent",
);
assert.deepEqual(
  JSON.parse(JSON.stringify(progress)),
  progress,
  "Progress survives storage serialization",
);
assert.equal(
  Object.keys(blankProgress().completed).length,
  0,
  "Demo completion must not mutate initial state",
);
const profile = blankProfile();
profile.goal = "shooting";
assert.equal(
  recommend(demoCatalog, profile, blankProgress()).id,
  "balanced-stance",
);
assert.equal(
  recommend(demoCatalog, { ...profile, goal: "moves" }, blankProgress())
    .prerequisites.length,
  0,
  "An unavailable goal must fall back to a real available foundation",
);
for (const category of loaded.exports.categories) {
  const nodes = demoCatalog.nodes.filter((n) => n.category === category.id);
  const positions = layoutBranch(nodes, 360);
  assert.equal(positions.length, nodes.length);
  for (const point of positions) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    for (const id of point.node.prerequisites) {
      const parent = positions.find((p) => p.node.id === id);
      if (parent) assert.ok(parent.y < point.y);
    }
  }
}
const cycle = {
  sport: "basketball",
  nodes: [
    { ...node("ball-control"), prerequisites: ["low-dribble"] },
    node("low-dribble"),
  ],
};
assert.throws(() => validateCatalog(cycle), /Circular/);
assert.throws(
  () => validateCatalog({ sport: "basketball", nodes: [node("low-dribble")] }),
  /Missing/,
);
assert.throws(
  () =>
    validateCatalog({
      sport: "basketball",
      nodes: [node("ball-control"), node("ball-control")],
    }),
  /Duplicate/,
);
assert.equal(
  adaptCatalog({
    sport: "basketball",
    nodes: [{ ...node("ball-control"), category: "dribbling" }],
  }).nodes[0].category,
  "handling",
);
assert.throws(
  () =>
    adaptCatalog({
      sport: "basketball",
      nodes: [{ ...node("ball-control"), category: "unknown" }],
    }),
  /Unknown category/,
);
validateCatalog({ sport: "basketball", nodes: [] });
console.log(
  "Passed: prerequisite joins, cross-category unlocks, demo provenance, idempotency, recommendation, serialization, data-driven layout, catalog validation and adapter.",
);
