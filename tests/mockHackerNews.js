const http = require("node:http");

const BASE_TIME = Date.parse("2026-01-01T12:00:00Z");

/** Builds n articles, newest first, one minute apart. */
function buildArticles(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(50000000 - index),
    title: `Mock article ${index + 1}`,
    timestamp: BASE_TIME - index * 60000,
  }));
}

function renderPage(articles, nextPage) {
  const rows = articles
    .map((article) => {
      const iso = new Date(article.timestamp).toISOString().replace(".000Z", "");
      return `<tr class="athing" id="${article.id}"><td><span class="titleline"><a href="#">${article.title}</a></span></td></tr>
<tr><td class="subtext"><span class="age" title="${iso}"><a href="#">1 minute ago</a></span></td></tr>`;
    })
    .join("\n");
  const more = nextPage ? `<a class="morelink" href="/newest?p=${nextPage}">More</a>` : "";

  return `<!doctype html><html><body><table>${rows}</table>${more}</body></html>`;
}

/**
 * Starts a local server that mimics the Hacker News /newest markup.
 * @param {Array<Array<Object>>} pages - Articles for each page
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
async function startMockSite(pages) {
  const server = http.createServer((request, response) => {
    const pageNumber = Number(new URL(request.url, "http://localhost").searchParams.get("p") || 1);
    const articles = pages[pageNumber - 1] || [];
    const nextPage = pageNumber < pages.length ? pageNumber + 1 : null;

    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(renderPage(articles, nextPage));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    url: `http://127.0.0.1:${server.address().port}/newest`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Splits articles into pages of 30, like Hacker News. */
function paginate(articles, pageSize = 30) {
  const pages = [];
  for (let i = 0; i < articles.length; i += pageSize) {
    pages.push(articles.slice(i, i + pageSize));
  }
  return pages;
}

module.exports = { buildArticles, paginate, startMockSite };
