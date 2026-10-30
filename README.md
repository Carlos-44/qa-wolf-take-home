# QA Wolf Take-Home Assignment

> Playwright script that validates Hacker News /newest sorts exactly 100 articles from newest to oldest.

![Tests](https://github.com/Carlos-44/qa-wolf-take-home/actions/workflows/test.yml/badge.svg)

## What It Does
Navigates to [Hacker News /newest](https://news.ycombinator.com/newest), collects the first 100 articles across multiple pages, and checks that no article is older than the one after it, using each article's timestamp.

Prints all 100 articles and the result. Exits with code 1 and prints every violation if the order is wrong, or if it can't collect exactly 100 articles.

## Tech Stack
- **Language:** JavaScript (Node.js)
- **Framework:** Playwright (chromium)
- **CI:** GitHub Actions

## Getting Started
```bash
npm install
npx playwright install chromium
node index.js
```

The browser is visible when run locally and headless in CI.

## Author
Carlos Ozoria — [LinkedIn](https://www.linkedin.com/in/carlos-ozoria-0a292030b)
