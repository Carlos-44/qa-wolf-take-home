# QA Wolf Take-Home Assignment

> Playwright script that validates Hacker News /newest sorts exactly 100 articles from newest to oldest.

![Tests](https://github.com/Carlos-44/qa-wolf-take-home/actions/workflows/test.yml/badge.svg)

## What It Does
Navigates to [Hacker News /newest](https://news.ycombinator.com/newest) and collects the first 100 unique articles across pages, then validates their order two independent ways:

1. **Merge sort comparison:** sorts a separate copy with a stable merge sort (`lib/sorting.js`) and compares it to the collected order, position by position.
2. **Adjacent-pair check:** confirms no article is older than the one after it.

It prints a table of every article next to what the merge sort expects at that position, then a summary of each check. It exits with code 1 if any check fails or it can't collect exactly 100 articles.

New posts can push an article onto the next page while paging, so duplicates are skipped by ID and counted.

## Tech Stack
- **Language:** JavaScript (Node.js)
- **Framework:** Playwright (chromium), Node's built-in test runner
- **CI:** GitHub Actions

## Getting Started
```bash
npm install
npx playwright install chromium

# Validate the live site
npm run validate

# Run the unit and mock-site tests
npm test
```

The browser is visible when run locally and headless in CI. In CI, the script waits 30 seconds between pages to respect the `Crawl-delay` in Hacker News' robots.txt.

## Testing
[TEST_PLAN.md](TEST_PLAN.md) has the test plan and results. A live run can only show the validator passing, so a local mock site (`tests/mockHackerNews.js`) feeds it out-of-order, duplicate and incomplete data to prove it catches them.

## Author
Carlos Ozoria — [LinkedIn](https://www.linkedin.com/in/carlos-ozoria-0a292030b)
