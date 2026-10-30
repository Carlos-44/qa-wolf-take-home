/**
 * Stable merge sort. Returns a new array and leaves the input unchanged.
 * @param {Array} items - Items to sort
 * @param {(a: *, b: *) => number} compare - Negative if a comes before b
 * @returns {Array} Sorted copy
 */
function mergeSort(items, compare) {
  if (items.length <= 1) return [...items];

  const middle = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, middle), compare);
  const right = mergeSort(items.slice(middle), compare);

  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    // <= takes from the left on ties, which is what keeps the sort stable
    if (compare(left[leftIndex], right[rightIndex]) <= 0) {
      merged.push(left[leftIndex++]);
    } else {
      merged.push(right[rightIndex++]);
    }
  }

  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
}

/**
 * Sorts articles newest to oldest. Articles with the same timestamp keep their order.
 * @param {Array<{timestamp: number}>} articles
 * @returns {Array} Sorted copy
 */
function sortNewestFirst(articles) {
  return mergeSort(articles, (a, b) => b.timestamp - a.timestamp);
}

/**
 * Compares the collected order to the merge-sorted order, position by position.
 * @returns {Array<{position: number, collected: Object, expected: Object}>} Positions that differ
 */
function compareOrder(collected, sorted) {
  const mismatches = [];

  collected.forEach((article, index) => {
    if (article.id !== sorted[index].id) {
      mismatches.push({
        position: index + 1,
        collected: article,
        expected: sorted[index],
      });
    }
  });

  return mismatches;
}

/**
 * Finds adjacent articles where the first is older than the second.
 * @returns {Array<{position: number, current: Object, next: Object}>} Violating pairs
 */
function findOutOfOrderPairs(articles) {
  const violations = [];

  for (let i = 0; i < articles.length - 1; i++) {
    if (articles[i].timestamp < articles[i + 1].timestamp) {
      violations.push({
        position: i + 1,
        current: articles[i],
        next: articles[i + 1],
      });
    }
  }

  return violations;
}

module.exports = {
  mergeSort,
  sortNewestFirst,
  compareOrder,
  findOutOfOrderPairs,
};
