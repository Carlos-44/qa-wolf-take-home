const { chromium } = require("playwright");

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
 * Validates that articles are sorted from newest to oldest
 * @param {number[]} timestamps - Array of timestamps to validate
 * @returns {Object} Validation result with pass/fail and details
 */
function validateSorting(timestamps) {
  const results = {
    passed: true,
    totalArticles: timestamps.length,
    outOfOrderPairs: [],
    message: "",
  };

  for (let i = 0; i < timestamps.length - 1; i++) {
    if (timestamps[i] < timestamps[i + 1]) {
      results.passed = false;
      results.outOfOrderPairs.push({
        index: i,
        currentTimestamp: new Date(timestamps[i]).toISOString(),
        nextTimestamp: new Date(timestamps[i + 1]).toISOString(),
      });
    }
  }

  if (results.passed) {
    results.message = `✓ SUCCESS: All ${results.totalArticles} articles are correctly sorted from newest to oldest`;
  } else {
    results.message = `✗ FAILURE: Found ${results.outOfOrderPairs.length} sorting violations`;
  }

  return results;
}

/**
 * Main function to validate Hacker News article sorting
 */
async function validateHackerNews() {
  const browser = await chromium.launch({
    headless: !!process.env.CI, // headless in CI, visible locally
    slowMo: 500,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("🔍 Navigating to Hacker News /newest...\n");
    await page.goto("https://news.ycombinator.com/newest", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("📊 Collecting article data...\n");

    const timestamps = [];
    const articles = [];
    let currentPage = 1;
    const ARTICLES_NEEDED = 100;

    while (timestamps.length < ARTICLES_NEEDED) {
      console.log(`   Processing page ${currentPage}...`);

      const rows = await page.$$(".athing");

      for (const row of rows) {
        if (timestamps.length >= ARTICLES_NEEDED) break;

        // Get the article's id to locate its sibling subtext row
        const articleId = await row.getAttribute("id");
        if (!articleId) continue;

        const timestamp = await extractTimestamp(page, articleId);
        if (timestamp) {
          const titleElement = await row.$(".titleline > a");
          const title = titleElement
            ? await titleElement.textContent()
            : "Unknown";

          timestamps.push(timestamp);
          articles.push({
            index: timestamps.length,
            title: title.substring(0, 60) + (title.length > 60 ? "..." : ""),
            timestamp: new Date(timestamp).toISOString(),
          });
        }
      }

      if (timestamps.length < ARTICLES_NEEDED) {
        const moreLink = await page.$("a.morelink");
        if (moreLink) {
          // Hacker News robots.txt sets Crawl-delay: 30, and it throttles cloud runners without it
          if (process.env.CI) await page.waitForTimeout(30000);
          await moreLink.click();
          await page.waitForLoadState("domcontentloaded");
          currentPage++;
        } else {
          console.log(
            `\n⚠️  Warning: Only found ${timestamps.length} articles before running out of pages`,
          );
          break;
        }
      }
    }

    console.log(`\n✓ Collected ${timestamps.length} articles\n`);

    if (timestamps.length !== ARTICLES_NEEDED) {
      console.log(
        `❌ ERROR: Expected exactly ${ARTICLES_NEEDED} articles, but found ${timestamps.length}\n`,
      );
      process.exitCode = 1;
      return;
    }

    // Show all 100 articles
    console.log("📋 All collected articles:");
    articles.forEach((article) => {
      console.log(`      ${article.index}. ${article.title}`);
      console.log(`         Posted: ${article.timestamp}`);
    });

    console.log("\n🔎 Validating chronological order...\n");
    const validationResults = validateSorting(timestamps);

    console.log("═".repeat(70));
    console.log(validationResults.message);
    console.log("═".repeat(70));

    if (!validationResults.passed) {
      process.exitCode = 1;
      console.log("\n⚠️  Sorting violations detected:");
      validationResults.outOfOrderPairs.forEach((pair, idx) => {
        console.log(
          `   ${idx + 1}. Article ${pair.index} is older than Article ${pair.index + 1}`,
        );
        console.log(`      Article ${pair.index}: ${pair.currentTimestamp}`);
        console.log(`      Article ${pair.index + 1}: ${pair.nextTimestamp}`);
      });
    }

    console.log("\n✅ Validation complete!\n");
  } catch (error) {
    console.error("❌ Error during validation:", error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

validateHackerNews().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
