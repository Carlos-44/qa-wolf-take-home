const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");
const { validateArticles } = require("../index");
const { buildArticles, paginate, startMockSite } = require("./mockHackerNews");

const silent = () => {};
let browser;

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser.close();
});

async function validate(pages) {
  const site = await startMockSite(pages);
  const page = await browser.newPage();
  try {
    return await validateArticles(page, { url: site.url, pageDelayMs: 0, log: silent });
  } finally {
    await page.close();
    await site.close();
  }
}

function runScript(url) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, "..", "index.js")], {
      env: { ...process.env, CI: "true", HN_URL: url, PAGE_DELAY_MS: "0" },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => resolve({ code, output }));
  });
}

function swapped(articles, first, second) {
  const copy = [...articles];
  [copy[first], copy[second]] = [copy[second], copy[first]];
  return copy;
}

test("M1: collects exactly 100 of 120 sorted articles and passes", async () => {
  const result = await validate(paginate(buildArticles(120)));

  assert.equal(result.articles.length, 100);
  assert.equal(result.passed, true);
  assert.deepEqual(result.mismatches, []);
  assert.deepEqual(result.outOfOrderPairs, []);
});

test("M2: two articles swapped on page 2 fails with both methods", async () => {
  const result = await validate(paginate(swapped(buildArticles(120), 35, 40)));

  assert.equal(result.passed, false);
  assert.ok(result.mismatches.length > 0);
  assert.ok(result.outOfOrderPairs.length > 0);
});

test("M3: articles repeated on the next page are skipped and counted", async () => {
  const articles = buildArticles(120);
  const pages = paginate(articles);
  pages[1] = [...articles.slice(25, 30), ...pages[1]];

  const result = await validate(pages);

  assert.equal(result.duplicatesSkipped, 5);
  assert.equal(result.articles.length, 100);
  assert.equal(new Set(result.articles.map((a) => a.id)).size, 100);
  assert.equal(result.passed, true);
});

test("M4: only 90 articles available fails on the count", async () => {
  const result = await validate(paginate(buildArticles(90)));

  assert.equal(result.articles.length, 90);
  assert.equal(result.countOk, false);
  assert.equal(result.passed, false);
});

test("M5: articles with identical timestamps pass", async () => {
  const articles = buildArticles(120);
  for (let i = 10; i < 15; i++) articles[i].timestamp = articles[10].timestamp;

  const result = await validate(paginate(articles));

  assert.equal(result.passed, true);
});

test("E1: the script exits with code 0 on sorted pages", async () => {
  const site = await startMockSite(paginate(buildArticles(120)));
  try {
    const { code, output } = await runScript(site.url);
    assert.equal(code, 0, output);
  } finally {
    await site.close();
  }
});

test("E2: the script exits with code 1 and prints violations on out-of-order pages", async () => {
  const site = await startMockSite(paginate(swapped(buildArticles(120), 35, 40)));
  try {
    const { code, output } = await runScript(site.url);
    assert.equal(code, 1, output);
    assert.match(output, /Position 36/);
  } finally {
    await site.close();
  }
});
