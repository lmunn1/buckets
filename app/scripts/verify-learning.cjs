const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  if (!file.endsWith(".ts")) file += ".ts";
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("module", "exports", "require", output)(
    module,
    module.exports,
    (id) =>
      id.startsWith(".")
        ? load(path.resolve(path.dirname(file), id))
        : require(id),
  );
  return module.exports;
}
const service = load(path.resolve(__dirname, "../src/lib/learning-service"));
const graph = load(path.resolve(__dirname, "../src/lib/graph-layout"));
const author = load(path.resolve(__dirname, "../src/lib/hooptree/skillTree"));
const { catalog, sourceNodes, skillState, blankProgress, completeSkillDemo } =
  service;
assert.equal(catalog.nodes.length, 107);
assert.equal(service.categories.length, 8);
assert.equal(service.learningPack.provenance, "curriculum");
assert.equal(
  catalog.nodes.reduce((n, node) => n + node.prerequisites.length, 0),
  158,
);
const seen = new Set([catalog.nodes[0].id]);
for (let pass = 0; pass < catalog.nodes.length; pass++)
  for (const n of catalog.nodes)
    for (const p of n.prerequisites)
      if (seen.has(n.id) || seen.has(p)) {
        seen.add(n.id);
        seen.add(p);
      }
assert.equal(seen.size, 107, "One connected graph, not category paths");
let cross = 0,
  multi = 0;
for (const node of catalog.nodes) {
  const source = sourceNodes.find((n) => n.id === node.id);
  assert.deepEqual(node.prerequisites, source.unlock.requiresAll);
  assert.equal(node.lesson.summary, source.lesson.text.why);
  assert.equal(node.lesson.practice, source.lesson.practice.drill);
  assert.deepEqual(
    service.lessonSections(node).map((s) => s.type),
    ["text", "visual", "video", "practice"],
  );
  assert.deepEqual(
    service.lessonSections(node)[0].cues,
    source.lesson.text.cues,
  );
  assert.ok(source.lesson.video.pinned?.videoId);
  assert.ok(source.lesson.visuals.caption);
  if (node.prerequisites.length > 1) multi++;
  for (const id of node.prerequisites)
    if (catalog.nodes.find((n) => n.id === id).category !== node.category)
      cross++;
  const progress = blankProgress();
  for (const id of node.prerequisites)
    progress.completed[id] = {
      source: "demo",
      completedAt: "2026-11-14T00:00:00Z",
    };
  assert.equal(skillState(node, progress), "available");
  for (const id of node.prerequisites) {
    const partial = { ...progress, completed: { ...progress.completed } };
    delete partial.completed[id];
    assert.equal(
      skillState(node, partial),
      "locked",
      `Every prerequisite required for ${node.id}`,
    );
  }
  if (service.isQuiz(node.id))
    assert.throws(() => completeSkillDemo(catalog, progress, node.id), /Quiz/);
  else {
    const completed = completeSkillDemo(catalog, progress, node.id);
    assert.ok(completed.completed[node.id]);
    assert.deepEqual(
      completeSkillDemo(catalog, completed, node.id),
      completed,
      "Repeat completion is idempotent",
    );
  }
}
assert.equal(cross, 46);
assert.equal(multi, 53);
const empty = blankProgress();
assert.equal(
  catalog.nodes.filter((n) => skillState(n, empty) === "available").length,
  4,
);
assert.throws(() => completeSkillDemo(catalog, empty, "does-not-exist"));
const locked = catalog.nodes.find((n) => n.prerequisites.length);
assert.throws(() => completeSkillDemo(catalog, empty, locked.id));
assert.equal(sourceNodes.filter((n) => service.isQuiz(n.id)).length, 15);
const points = graph.layoutGraph(catalog.nodes);
const origin = sourceNodes[0],
  point = points[0];
const ratio = (point.y - 700) / origin.layout.y;
for (const p of points) {
  const n = service.sourceNodeFor(p.node.id);
  assert.ok(Math.abs(p.x - (700 + n.layout.x * ratio)) < 1e-6);
  assert.ok(Math.abs(p.y - (700 + n.layout.y * ratio)) < 1e-6);
}
for (const n of catalog.nodes) {
  const closest = graph.closestAvailable(catalog.nodes, n.id, {});
  assert.ok(closest && closest.prerequisites.length === 0);
}
const placement = author.applyPlacement(sourceNodes, { SH: 9, FW: 1 });
assert.deepEqual(placement.completed, {});
for (const id of Object.keys(placement.placedOut))
  assert.ok(
    service
      .sourceNodeFor(id)
      .unlock.requiresAll.every((p) => placement.placedOut[p]),
  );
console.log(
  "PASS: 107 lessons, 158 edges, 46 cross-track edges, 53 multi-parent nodes, exact source layout, all-prerequisite gating, 15 blank quizzes, repeat/locked/unknown guards, author placement contract.",
);

const media = load(path.resolve(__dirname, "../src/lib/lesson-media"));
const photos = sourceNodes.flatMap((n) => media.licensedPhotos(n.id));
assert.equal(photos.length, 48);
assert.ok(
  photos.every(
    (p) =>
      p.source === "web" &&
      p.credit &&
      p.credit.author &&
      p.credit.sourceUrl.startsWith("https://commons.wikimedia.org/"),
  ),
);
assert.equal(
  sourceNodes.flatMap((n) => n.lesson.visuals.images).length - photos.length,
  273,
);
console.log(
  "PASS: all 48 explicitly open-license photos retain credits; 273 video-frame slots excluded from image reuse.",
);
const cameraMath = load(path.resolve(__dirname, "../src/lib/map-camera"));
const vision = load(path.resolve(__dirname, "../src/lib/vision-service"));
for (const experience of ["new", "some", "experienced"]) {
  const profile = { ...service.blankProfile(), experience, goal: "SH" };
  const placedOut = service.placementFor(profile);
  assert.equal(Object.keys(placedOut).length === 0, experience === "new");
  const progress = { ...blankProgress(), placedOut };
  assert.equal(
    Object.keys(progress.completed).length,
    0,
    "Placement is not earned mastery",
  );
  for (const id of Object.keys(placedOut)) {
    assert.equal(
      skillState(
        catalog.nodes.find((n) => n.id === id),
        progress,
      ),
      "completed",
    );
    assert.ok(
      service.sourceNodeFor(id).unlock.requiresAll.every((p) => placedOut[p]),
    );
  }
  const next = service.recommend(catalog, profile, progress);
  assert.ok(next && skillState(next, progress) === "available");
  if (experience === "experienced")
    assert.ok(service.sourceNodeFor(next.id).tier > 1);
}
let camera = { x: -600, y: -500, scale: 1.35 };
const anchor = { x: 195, y: 240 };
const worldAnchor = {
  x: (anchor.x - camera.x) / camera.scale,
  y: (anchor.y - camera.y) / camera.scale,
};
for (let i = 0; i < 500; i++) {
  camera = cameraMath.zoomAt(camera, camera.scale * 1.25, anchor);
  camera = cameraMath.zoomAt(camera, camera.scale * 0.8, anchor);
}
assert.ok(Math.abs(worldAnchor.x * camera.scale + camera.x - anchor.x) < 1e-7);
assert.ok(Math.abs(worldAnchor.y * camera.scale + camera.y - anchor.y) < 1e-7);
const viewport = { width: 390, height: 480 };
const fit = cameraMath.fitMap(viewport, points);
for (const p of points) {
  assert.ok(
    p.x * fit.scale + fit.x >= 0 && p.x * fit.scale + fit.x <= viewport.width,
  );
  assert.ok(
    p.y * fit.scale + fit.y >= 0 && p.y * fit.scale + fit.y <= viewport.height,
  );
}
const constrained = cameraMath.constrainMap(
  { x: 1e9, y: -1e9, scale: 1 },
  viewport,
);
assert.equal(constrained.x, viewport.width - 60);
assert.equal(constrained.y, 60 - 1400);
assert.equal(vision.POSITION_COUNTDOWN_SECONDS, 10);
assert.equal(vision.RECORDING_LIMIT_SECONDS, 5, "One-shot clips auto-stop at 5 s");
assert.equal(vision.countdownRemaining(10000, 0), 10);
assert.equal(vision.countdownRemaining(10000, 9001), 1);
assert.equal(vision.countdownRemaining(10000, 12000), 0);
vision.visionService.assess({}, new AbortController().signal).then((result) => {
  assert.equal(result.status, "unavailable");
  console.log(
    "PASS: experience placement, honest mastery, available recommendations, 500 anchor-preserving zoom cycles, overview fit, camera bounds, 10-second countdown, 5-second auto-stop, unavailable vision adapter.",
  );
});
