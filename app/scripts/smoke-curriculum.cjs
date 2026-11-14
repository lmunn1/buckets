const { chromium } = require(
  process.env.HOOP_PLAYWRIGHT_PATH ||
    process.env.TEMP + "/hoop-frontend-qa/node_modules/playwright",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = require("../src/lib/hooptree/curriculum.json");
const base = process.env.HOOP_PREVIEW_URL || "http://localhost:8083";
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  page.setDefaultTimeout(45000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const button = (name) => page.getByRole("button", { name, exact: true });
  const tab = (name) => page.getByRole("tab", { name, exact: true });
  const shot = (name) =>
    page.screenshot({ path: "design/qa/" + name + ".png" });
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("hoop.player.v1")));
  const go = async (path) => {
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
  };
  try {
    fs.mkdirSync("design/qa", { recursive: true });
    await go("/");
    await button("Find my starting point").waitFor({ timeout: 120000 });
    await button("Find my starting point").click();
    await button("Continue").click();
    assert.ok(await button("Continue").isDisabled());
    await page.getByRole("button", { name: /new to all of these/ }).click();
    await tab("Home").waitFor();
    await button("Start lesson").waitFor();
    assert.equal(Object.keys((await saved()).progress.completed).length, 0);
    await shot("home-curriculum-mobile");
    await tab("Skill tree").click();
    await button("Show whole graph").click();
    await page.waitForTimeout(350);
    await shot("tree-curriculum-overview");
    assert.equal(
      await page
        .getByRole("button", { name: /, (locked|available|completed)$/ })
        .count(),
      107,
    );
    const world = page.getByTestId("skill-map-world");
    const transform = () =>
      world.evaluate((el) => getComputedStyle(el).transform);
    const beforeZoom = await transform();
    await button("Zoom in").click();
    await page.waitForTimeout(350);
    assert.notEqual(
      await transform(),
      beforeZoom,
      "Zoom changes the actual graph transform",
    );
    const canvas = await page.getByTestId("skill-map-canvas").boundingBox();
    const beforePan = await transform();
    await page.mouse.move(canvas.x + 35, canvas.y + 60);
    await page.mouse.down();
    await page.mouse.move(canvas.x + 105, canvas.y + 100, { steps: 12 });
    await page.mouse.up();
    assert.notEqual(await transform(), beforePan, "Dragging pans the graph");
    const client = await page.context().newCDPSession(page);
    const cy = canvas.y + canvas.height / 2,
      cx = canvas.x + canvas.width / 2;
    const beforePinch = await transform();
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: cx - 35, y: cy, id: 1 },
        { x: cx + 35, y: cy, id: 2 },
      ],
    });
    for (let i = 0; i < 8; i++)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: cx - 35 - i * 5, y: cy, id: 1 },
          { x: cx + 35 + i * 5, y: cy, id: 2 },
        ],
      });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.notEqual(
      await transform(),
      beforePinch,
      "Two-finger pinch zooms the graph",
    );
    const multi = source.nodes.find((n) => n.unlock.requiresAll.length > 1);
    await page
      .getByRole("textbox", { name: "Search skills" })
      .fill(multi.title);
    await button(multi.title).click();
    for (const id of multi.unlock.requiresAll)
      await button(
        "View prerequisite " + source.nodes.find((n) => n.id === id).title,
      ).waitFor();
    await button("Show full prerequisite path").click();
    await button("Shooting").click();
    for (const id of multi.unlock.requiresAll)
      assert.equal(
        await button(
          "View prerequisite " + source.nodes.find((n) => n.id === id).title,
        ).count(),
        1,
        "Filtering preserves cross-track prerequisites",
      );
    await shot("tree-curriculum-locked");
    await button("Find an available prerequisite").click();
    await page
      .getByRole("textbox", { name: "Search skills" })
      .fill("Athletic Stance & Triple Threat");
    await button("Athletic Stance & Triple Threat").click();
    await shot("tree-curriculum-focus");
    await button("Start lesson").click();
    await page.waitForURL("**/lesson/fw-stance");
    await page.getByText("Understand it", { exact: true }).waitFor();
    for (const title of [
      "Understand it",
      "See the technique",
      "Watch it flow",
      "Your turn",
    ])
      assert.equal(
        await page.getByText(title, { exact: true }).count(),
        1,
        "All learning sections coexist on one page",
      );
    await shot("lesson-curriculum-top");
    await button("Common mistakes").click();
    assert.equal(
      await button("Common mistakes").getAttribute("aria-expanded"),
      "true",
    );
    await page.getByRole("radio", { name: "Key focus", exact: true }).click();
    assert.equal(
      await page
        .getByRole("radio", { name: "Key focus", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    await page.waitForTimeout(250);
    await shot("lesson-curriculum-visual");
    // Player container, pinned/alternate selection, and lazy loading tested with a local response.
    // This is deliberately not represented as a live YouTube playback test.
    await page.route("**/www.youtube.com/embed/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><title>Player fixture</title><body style="background:black;color:white">Player fixture</body>',
      }),
    );
    await button("Load lesson video").click();
    await page.locator("iframe").waitFor();
    const firstVideo = await page.locator("iframe").getAttribute("src");
    assert.ok(firstVideo.includes(source.nodes[0].lesson.video.pinned.videoId));
    await button("Try another demonstration").click();
    assert.notEqual(
      await page.locator("iframe").getAttribute("src"),
      firstVideo,
    );
    await button("Watch on YouTube").waitFor();
    await button("Start practice").click();
    assert.ok(await button("Simulate skill completion").isDisabled());
    await page
      .getByRole("checkbox", {
        name: "I understand this is simulated completion",
      })
      .click();
    await button("Preview a retry").click();
    await button("Try demo again").click();
    await shot("lesson-curriculum-practice");
    await button("Simulate skill completion").click();
    await page.waitForURL("**/complete/fw-stance");
    await page.getByText("Your path just grew.", { exact: true }).waitFor();
    await page.waitForTimeout(300);
    assert.equal(
      (await saved()).progress.completed["fw-stance"].source,
      "demo",
    );
    await shot("lesson-curriculum-completion");
    await button("Back to my court").click();
    await page.waitForURL("**/home");
    await page.reload();
    await button("Quick warm up").waitFor();
    assert.equal(
      Object.keys((await saved()).progress.completed).length,
      1,
      "Completion survives a reload",
    );
    await button("Quick warm up").click();
    await button("Start 10-min warmup").click();
    await button("Pause timer").click();
    await button("Resume timer").click();
    await page.getByRole("button", { name: /I practiced this/ }).click();
    for (let i = 0; i < 3; i++) await button("Skip this drill").click();
    await button("Save practice session").click();
    await page
      .getByText("Your session is saved on this device.", { exact: true })
      .waitFor();
    assert.equal((await saved()).progress.practiceCount, 1);
    assert.equal(
      Object.keys((await saved()).progress.completed).length,
      1,
      "Practice never grants skill completions",
    );
    await button("Back to Home").click();
    await tab("Practice").click();
    await page.getByRole("radio", { name: "20 minutes", exact: true }).click();
    assert.equal(
      await page
        .getByRole("radio", { name: "20 minutes", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    await button("Start 20-min warmup").waitFor();
    await shot("practice-curriculum-duration");
    await go("/lesson/iq-basics");
    await page.getByText("Quiz coming soon", { exact: true }).waitFor();
    await page.getByText("Quiz coming soon", { exact: true }).scrollIntoViewIfNeeded();
    assert.equal(await button("Start practice").count(), 0);
    assert.equal(await button("Simulate skill completion").count(), 0);
    await shot("lesson-curriculum-quiz-blank");
    await go("/home");
    await tab("Profile").click();
    await page.getByText("Your game is growing.", { exact: true }).waitFor();
    await button("Preferences & local data").waitFor();
    await shot("profile-curriculum-mobile");
    const beforePhotos = await saved();
    const photoNode = source.nodes.find((n) =>
      n.lesson.visuals.images.some((p) => p.source === "web" && p.credit),
    );
    const photoFixture = structuredClone(beforePhotos);
    const addParents = (id) => {
      for (const p of source.nodes.find((n) => n.id === id).unlock
        .requiresAll) {
        addParents(p);
        photoFixture.progress.completed[p] = {
          source: "demo",
          completedAt: "2026-11-14T00:00:00Z",
        };
      }
    };
    addParents(photoNode.id);
    let failedImageRequests = 0;
    await page.route("**/*.wikimedia.org/**", (route) => {
      failedImageRequests++;
      return route.abort();
    });
    await page.evaluate(
      (data) => localStorage.setItem("hoop.player.v1", JSON.stringify(data)),
      photoFixture,
    );
    await go("/lesson/" + photoNode.id);
    const credit = photoNode.lesson.visuals.images.find(
      (p) => p.source === "web",
    ).credit;
    await page
      .getByRole("link", {
        name: `Photo credit: ${credit.author}, ${credit.license}`,
        exact: true,
      })
      .first()
      .waitFor();
    await page
      .getByText("Photo unavailable. Use the cues.", { exact: true })
      .first()
      .waitFor();
    assert.ok(
      failedImageRequests > 1,
      "Photo fallback URLs are attempted before an unavailable state",
    );
    await page.getByText("Photo unavailable. Use the cues.", { exact: true }).first().scrollIntoViewIfNeeded();
    await shot("lesson-curriculum-photo-fallback");
    await page.evaluate(
      (data) => localStorage.setItem("hoop.player.v1", JSON.stringify(data)),
      beforePhotos,
    );
    await go("/home");
    await page.setViewportSize({ width: 320, height: 568 });
    await tab("Home").click();
    await shot("home-curriculum-small");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await tab("Skill tree").click();
    await page.getByTestId("skill-map-canvas").waitFor();
    await button("Expand skill details").waitFor();
    if (await button("Expand skill details").count())
      await button("Expand skill details").click();
    await button("Start lesson").scrollIntoViewIfNeeded();
    assert.ok(await button("Start lesson").isVisible());
    await shot("tree-curriculum-small");
    assert.deepEqual(errors, [], "No uncaught runtime errors");
    console.log(
      "PASS: onboarding, 107-node graph, pan/pinch/zoom, search, cross-track prerequisites, continuous lesson, interactive visual, video selection (stubbed player), simulated retry/completion/persistence, 8+2-minute daily warmup, 20-minute selector, blank quiz, photo attribution and failed-image fallbacks, profile, 320px layout. No uncaught runtime errors.",
    );
  } catch (e) {
    await shot("curriculum-failure");
    console.error((await page.locator("body").innerText()).slice(-2500));
    throw e;
  } finally {
    await browser.close();
  }
})();
