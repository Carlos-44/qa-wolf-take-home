const { chromium } = require("playwright");
const {
  sortNewestFirst,
  compareOrder,
  findOutOfOrderPairs,
} = require("./lib/sorting");

const HN_URL = process.env.HN_URL || "https://news.ycombinator.com/newest";
const ARTICLES_NEEDED = 100;
// Hacker News robots.txt sets Crawl-delay: 30, and it throttles cloud runners without it
const PAGE_DELAY_MS = Number(process.env.PAGE_DELAY_MS ?? (process.env.CI ? 30000 : 0));

/**
 * Extracts timestamp from a Hacker News article.
 * The .age element lives in the next sibling <tr> (subtext row), not inside .athing itself.
 * @param {import('playwright').Page} page - The Playwright page object
 * @param {string} articleId - The id attribute of the .athing row
 * @returns {Promise<number|null>} Unix timestamp or null if not found
 */
async function extractTimestamp(page, articleId) {
  try {
    // Use CSS adjacent sibling selector to find .age in the subtext row
    const ageElement = await page.$(`[id="${articleId}"] + tr .age`);
    if (!ageElement) return null;

    const timestamp = await ageElement.getAttribute("title");
    if (!timestamp) return null;

    return new Date(timestamp).getTime();
  } catch (error) {
    console.error("Error extracting timestamp:", error.message);
    return null;
  }
}

/**
 * Collects unique articles across pages until it has enough or runs out of pages.
 * New posts can push an article onto the next page while paging, so duplicates are skipped by ID.
 * @returns {Promise<{articles: Array, duplicatesSkipped: number, pagesVisited: number}>}
 */
async function collectArticles(page, { pageDelayMs, log }) {
  const articles = [];
  const seenIds = new Set();
  let duplicatesSkipped = 0;
  let pagesVisited = 1;

  while (articles.length < ARTICLES_NEEDED) {
    log(`   Processing page ${pagesVisited}...`);

    const rows = await page.$$(".athing");

    for (const row of rows) {
      if (articles.length >= ARTICLES_NEEDED) break;

      // Get the article's id to locate its sibling subtext row
      const id = await row.getAttribute("id");
      if (!id) continue;

      if (seenIds.has(id)) {
        duplicatesSkipped++;
        continue;
      }

      const timestamp = await extractTimestamp(page, id);
      if (timestamp) {
        const titleElement = await row.$(".titleline > a");
        const title = titleElement ? await titleElement.textContent() : "Unknown";

        seenIds.add(id);
        articles.push({ id, title, timestamp });
      }
    }

    if (articles.length < ARTICLES_NEEDED) {
      const moreLink = await page.$("a.morelink");
      if (!moreLink) break;

      if (pageDelayMs > 0) await page.waitForTimeout(pageDelayMs);
      await moreLink.click();
      await page.waitForLoadState("domcontentloaded");
      pagesVisited++;
    }
  }

  return { articles, duplicatesSkipped, pagesVisited };
}

function formatTime(timestamp) {
  return new Date(timestamp).toISOString().replace(".000Z", "Z");
}

/** Prints each article next to what the merge sort expects at that position. */
function printComparison(articles, sorted, log) {
  log("#    Collected ID  Posted                Merge-sorted ID  Match  Title");
  log("-".repeat(100));

  articles.forEach((article, index) => {
    const expected = sorted[index];
    const match = article.id === expected.id ? "OK" : "DIFF";
    log(
      [
        String(index + 1).padEnd(4),
        article.id.padEnd(13),
        formatTime(article.timestamp).padEnd(21),
        expected.id.padEnd(16),
        match.padEnd(6),
        article.title.slice(0, 40),
      ].join(" "),
    );
  });
}

function printFailures({ mismatches, outOfOrderPairs }, log) {
  if (mismatches.length > 0) {
    log(`\n⚠️  Merge sort comparison: ${mismatches.length} positions differ`);
    mismatches.forEach(({ position, collected, expected }) => {
      log(`   Position ${position}: found ${collected.id} (${formatTime(collected.timestamp)}), expected ${expected.id} (${formatTime(expected.timestamp)})`);
    });
  }

  if (outOfOrderPairs.length > 0) {
    log(`\n⚠️  Adjacent-pair check: ${outOfOrderPairs.length} violations`);
    outOfOrderPairs.forEach(({ position, current, next }) => {
      log(`   Article ${position} (${formatTime(current.timestamp)}) is older than article ${position + 1} (${formatTime(next.timestamp)})`);
    });
  }
}

/**
 * Collects articles from the page and validates their order two ways:
 * against a merge-sorted copy, and by checking each adjacent pair.
 * @returns {Promise<Object>} Results, with passed set to true only if every check passes
 */
async function validateArticles(page, { url = HN_URL, pageDelayMs = PAGE_DELAY_MS, log = console.log } = {}) {
  log(`🔍 Navigating to ${url}...\n`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  log("📊 Collecting article data...\n");
  const { articles, duplicatesSkipped, pagesVisited } = await collectArticles(page, { pageDelayMs, log });

  const sorted = sortNewestFirst(articles);
  const mismatches = compareOrder(articles, sorted);
  const outOfOrderPairs = findOutOfOrderPairs(articles);
  const countOk = articles.length === ARTICLES_NEEDED;
  const methodsAgree = (mismatches.length === 0) === (outOfOrderPairs.length === 0);
  const passed = countOk && mismatches.length === 0 && outOfOrderPairs.length === 0;

  log(`\n✓ Collected ${articles.length} articles from ${pagesVisited} pages (${duplicatesSkipped} duplicates skipped)\n`);
  printComparison(articles, sorted, log);
  printFailures({ mismatches, outOfOrderPairs }, log);

  log(`\n${"═".repeat(70)}`);
  log(`Article count:        ${countOk ? "PASS" : "FAIL"} (${articles.length} of ${ARTICLES_NEEDED})`);
  log(`Merge sort compare:   ${mismatches.length === 0 ? "PASS" : "FAIL"} (${mismatches.length} positions differ)`);
  log(`Adjacent-pair check:  ${outOfOrderPairs.length === 0 ? "PASS" : "FAIL"} (${outOfOrderPairs.length} violations)`);
  log(`Methods agree:        ${methodsAgree ? "YES" : "NO"}`);
  if (articles.length > 0) {
    log(`Newest article:       ${formatTime(sorted[0].timestamp)}`);
    log(`Oldest article:       ${formatTime(sorted[sorted.length - 1].timestamp)}`);
  }
  log("═".repeat(70));
  log(passed
    ? `✅ SUCCESS: All ${articles.length} articles are correctly sorted from newest to oldest\n`
    : "❌ FAILURE: Validation failed\n");

  return { articles, sorted, mismatches, outOfOrderPairs, duplicatesSkipped, countOk, passed };
}

async function main() {
  const browser = await chromium.launch({
    headless: !!process.env.CI, // headless in CI, visible locally
    slowMo: 500,
  });

  try {
    const page = await browser.newPage();
    const { passed } = await validateArticles(page);
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { validateArticles };
