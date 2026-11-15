const { chromium } = require(
  process.env.HOOP_PLAYWRIGHT_PATH ||
    process.env.TEMP + "/hoop-frontend-qa/node_modules/playwright",
);
const assert = require("node:assert/strict");
const source = require("../src/lib/hooptree/curriculum.json");
const base = process.env.HOOP_PREVIEW_URL || "http://127.0.0.1:8085";
(async () => {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    permissions: ["camera"],
  });
  // Deterministic camera fixture: Windows Edge's fake-device provider may end
  // its track unexpectedly. Real MediaRecorder still encodes/replays this stream.
  await context.addInitScript(() => {
    globalThis.__hoopTestStreams = [];
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const paint = canvas.getContext("2d");
      let frame = 0;
      const draw = () => {
        paint.fillStyle = "#14181c";
        paint.fillRect(0, 0, 640, 480);
        paint.fillStyle = "#ff7a00";
        paint.beginPath();
        paint.arc(320 + Math.sin(frame++ / 10) * 100, 240, 45, 0, Math.PI * 2);
        paint.fill();
      };
      draw();
      const stream = canvas.captureStream(24);
      globalThis.__hoopTestStreams.push(stream);
      const timer = setInterval(() => {
        if (stream.getTracks().every((t) => t.readyState === "ended"))
          clearInterval(timer);
        else draw();
      }, 40);
      return stream;
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const button = (name) => page.getByRole("button", { name, exact: true });
  const tab = (name) => page.getByRole("tab", { name, exact: true });
  const shot = (name) =>
    page.screenshot({ path: "design/qa/" + name + "-curriculum-revision.png" });
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("hoop.player.v1")));
  const wait = () => page.waitForTimeout(350);
  try {
    await page.route("https://www.youtube-nocookie.com/**", (r) =>
      r.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Player network stub</body></html>",
      }),
    );
    await page.goto(base);
    await button("Find my starting point").click();
    await page
      .getByRole("radio", { name: "Play regularly", exact: true })
      .click();
    await shot("onboarding-experience");
    await button("Continue").click();
    await page.getByRole("radio", { name: "Shooting", exact: true }).click();
    await button("Continue").click();
    await page.getByRole("radio", { name: "20 min", exact: true }).click();
    await shot("onboarding-plan");
    await button("Let's play").click();
    await tab("Home").waitFor();
    let data = await saved();
    assert.equal(data.profile.experience, "experienced");
    assert.equal(data.profile.goal, "SH");
    assert.equal(data.profile.sessionMinutes, 20);
    assert.ok(Object.keys(data.progress.placedOut).length > 0);
    assert.equal(Object.keys(data.progress.completed).length, 0);
    await tab("Practice").click();
    assert.equal(
      await page
        .getByRole("radio", { name: "20 minutes", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    await tab("Skill tree").click();
    await button("Show whole graph").click();
    await wait();
    assert.equal(
      await page
        .getByRole("button", { name: /, (locked|available|completed)$/ })
        .count(),
      107,
    );
    await shot("tree-overview");
    const world = page.getByTestId("skill-map-world");
    await world.evaluate((el) => {
      el.dataset.persistentCanvas = "yes";
    });
    const matrix = () =>
      world.evaluate((el) => {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        return { x: m.e, y: m.f, scale: m.a };
      });
    const before = await matrix();
    for (let i = 0; i < 6; i++) {
      await button("Zoom in").click();
      await wait();
      await button("Zoom out").click();
      await wait();
    }
    const after = await matrix();
    assert.ok(
      Math.abs(before.x - after.x) < 0.2 &&
        Math.abs(before.y - after.y) < 0.2 &&
        Math.abs(before.scale - after.scale) < 0.002,
      "Repeated zoom stays centered",
    );
    const canvas = await page.getByTestId("skill-map-canvas").boundingBox();
    const beforePan = await matrix();
    await page.mouse.move(
      canvas.x + canvas.width / 2,
      canvas.y + canvas.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      canvas.x + canvas.width / 2 + 40,
      canvas.y + canvas.height / 2 + 50,
      { steps: 10 },
    );
    await page.mouse.up();
    await wait();
    const panned = await matrix();
    assert.ok(Math.abs(panned.x - beforePan.x) > 10, "Pan changes transform");
    const wheelAnchor = { x: canvas.width / 2, y: canvas.height / 2 };
    const wheelWorld = {
      x: (wheelAnchor.x - panned.x) / panned.scale,
      y: (wheelAnchor.y - panned.y) / panned.scale,
    };
    await page.mouse.move(canvas.x + wheelAnchor.x, canvas.y + wheelAnchor.y);
    await page.mouse.wheel(0, -80);
    await page.waitForTimeout(180);
    const wheeled = await matrix();
    assert.ok(wheeled.scale > panned.scale, "Wheel zoom responds");
    assert.ok(
      Math.abs(wheelWorld.x * wheeled.scale + wheeled.x - wheelAnchor.x) < 1 &&
        Math.abs(wheelWorld.y * wheeled.scale + wheeled.y - wheelAnchor.y) < 1,
      "Wheel preserves cursor anchor",
    );
    await button("Show whole graph").click();
    await wait();
    await page.getByRole("button", { name: /^Explore .*Shooting/ }).click();
    await wait();
    await shot("tree-category");
    await button("Recenter selected skill").click();
    await wait();
    const focused = await matrix();
    assert.ok(focused.scale > 0.9);
    await world.getByRole("button", { pressed: true }).click();
    await wait();
    assert.equal(
      await world.getAttribute("data-persistent-canvas"),
      "yes",
      "Opening details preserves canvas instance",
    );
    assert.ok(
      Math.abs((await matrix()).scale - focused.scale) < 0.002,
      "Opening details preserves zoom",
    );
    await shot("tree-focused");
    await button("Collapse skill details").click();
    const search = page.getByRole("textbox", {
      name: "Search skills",
      exact: true,
    });
    await search.fill("stepback");
    await search.press("Enter");
    await button("Collapse skill details").waitFor();
    await button("Show whole graph").click();
    await wait();
    const client = await context.newCDPSession(page);
    const bounds = await page.getByTestId("skill-map-canvas").boundingBox();
    const cx = bounds.x + bounds.width / 2,
      cy = bounds.y + bounds.height / 2;
    const startPinch = await matrix();
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: cx - 35, y: cy, id: 1 },
        { x: cx + 35, y: cy, id: 2 },
      ],
    });
    for (let i = 0; i < 10; i++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: cx - 35 - i * 4, y: cy, id: 1 },
          { x: cx + 35 + i * 4, y: cy, id: 2 },
        ],
      });
      await page.waitForTimeout(16);
    }
    const pinched = await matrix();
    assert.ok(
      pinched.scale > startPinch.scale * 1.5,
      "Pinch zoom updates persistent transform",
    );
    const pinchWorld = {
      x: (bounds.width / 2 - startPinch.x) / startPinch.scale,
      y: (bounds.height / 2 - startPinch.y) / startPinch.scale,
    };
    assert.ok(
      Math.abs(pinchWorld.x * pinched.scale + pinched.x - bounds.width / 2) <
        2 &&
        Math.abs(pinchWorld.y * pinched.scale + pinched.y - bounds.height / 2) <
          2,
      "Pinch preserves focal anchor",
    );
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [{ x: cx - 71, y: cy, id: 1 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: cx - 51, y: cy + 10, id: 1 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await wait();
    const oneFinger = await matrix();
    assert.ok(
      Math.abs(oneFinger.scale - pinched.scale) < 0.002 &&
        Math.abs(oneFinger.x - pinched.x - 20) < 2 &&
        Math.abs(oneFinger.y - pinched.y - 10) < 2,
      "Pinch-to-pan transition has no jump",
    );
    await page.goto(base + "/setup");
    await page.getByRole("radio", { name: "Brand new", exact: true }).click();
    await button("Continue").click();
    await page
      .getByRole("radio", { name: "All-round game", exact: true })
      .click();
    await button("Continue").click();
    await button("Let's play").click();
    data = await saved();
    assert.equal(Object.keys(data.progress.placedOut).length, 0);
    await button("Start lesson").click();
    await tab("Understand it").waitFor();
    await shot("lesson-understand");
    assert.equal(
      await page.locator("img").count(),
      0,
      "No lesson photos or movement guide images",
    );
    await button("See the technique").click();
    await tab("See the technique").waitFor();
    await page.locator("iframe").waitFor();
    assert.equal(
      await page.locator("iframe").count(),
      1,
      "Video demonstration is technique part",
    );
    await shot("lesson-video");
    await button("Try it yourself").click();
    await button("Open practice camera").click();
    await button("Allow camera").click();
    await button("Start").waitFor();
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("[role=button]"))
          .find((el) => el.textContent === "Start")
          ?.getAttribute("aria-disabled") !== "true",
    );
    await button("Start").click();
    await page.getByTestId("position-countdown").waitFor();
    assert.equal(
      (await page.getByTestId("position-countdown").textContent()).trim(),
      "10",
    );
    await page.waitForTimeout(1300);
    await button("Cancel countdown").click();
    assert.equal(await button("Finish recording").count(), 0);
    await button("Start").click();
    await page.waitForTimeout(900);
    await shot("camera-countdown");
    await page.waitForTimeout(7800);
    assert.equal(
      await button("Finish recording").count(),
      0,
      "Recording must not start before 10 seconds",
    );
    await button("Finish recording").waitFor({ timeout: 5000 });
    await page.waitForTimeout(1300);
    await shot("camera-recording");
    await button("Finish recording").click();
    await page.getByLabel("Your recorded practice").waitFor();
    const video = page.getByLabel("Your recorded practice");
    assert.ok((await video.getAttribute("src")).startsWith("blob:"));
    await video.evaluate((el) => el.play());
    await page.waitForTimeout(300);
    assert.ok(
      await video.evaluate((el) => el.videoWidth > 0),
      "Real encoded clip replays",
    );
    await shot("camera-review");
    await button("Check my technique").click();
    await button("Analysis not connected").waitFor();
    assert.equal(
      Object.keys((await saved()).progress.completed).length,
      0,
      "Recording is not fabricated mastery",
    );
    await button("Record again").click();
    await button("Allow camera").click();
    await button("Start").click();
    await button("Finish recording").waitFor({ timeout: 13000 });
    // 5 s auto-stop plus margin; would time out under the old 20 s limit.
    await page.getByLabel("Your recorded practice").waitFor({ timeout: 9000 });
    assert.ok(
      await page
        .getByLabel("Your recorded practice")
        .evaluate((el) => el.src.startsWith("blob:")),
      "Recording automatically stops at its duration limit",
    );
    await button("Record again").click();
    await button("Allow camera").click();
    await button("Start").click();
    await button("Cancel countdown").waitFor();
    await button("Go back").click();
    await page.waitForTimeout(11000);
    assert.equal(
      await page.locator("video").count(),
      0,
      "Leaving releases capture",
    );
    assert.ok(
      await page.evaluate(() =>
        globalThis.__hoopTestStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === "ended"),
        ),
      ),
      "SPA navigation releases every camera track",
    );
    // Explicitly denied browser permission, without accessing any physical device.
    const denied = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await denied.addInitScript(
      (player) => {
        localStorage.setItem("hoop.player.v1", JSON.stringify(player));
        navigator.mediaDevices.getUserMedia = () =>
          Promise.reject(new DOMException("Denied", "NotAllowedError"));
      },
      await saved(),
    );
    const blocked = await denied.newPage();
    await blocked.goto(
      base +
        "/practice/" +
        source.nodes.find(
          (n) =>
            !n.unlock.requiresAll.length &&
            n.lesson.practice.cvActivity.template !== "QUIZ",
        ).id,
    );
    await blocked
      .getByRole("button", { name: "Allow camera", exact: true })
      .click();
    await blocked.getByText(/Camera access was denied/).waitFor();
    assert.equal(
      await blocked
        .getByRole("button", { name: "Start", exact: true })
        .isDisabled(),
      true,
    );
    await denied.close();
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(base + "/setup");
    await button("Continue").click();
    await button("Continue").click();
    await shot("onboarding-small");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "No small-phone horizontal overflow",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: short onboarding, placement/preferences, 107 nodes, category selection, persistent canvas, centered zoom, pan/pinch/search, lesson parts without images, real countdown, cancellation, synthetic-device recording/replay/retake, unavailable vision seam, denied camera, small mobile, no uncaught page errors.",
    );
  } catch (error) {
    await page.screenshot({ path: "design/qa/experience-failure.png" });
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
