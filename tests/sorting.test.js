const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  mergeSort,
  sortNewestFirst,
  compareOrder,
  findOutOfOrderPairs,
} = require("../lib/sorting");

const article = (id, timestamp) => ({ id, timestamp });

test("U1: sorts shuffled articles newest first", () => {
  const sorted = sortNewestFirst([article("a", 200), article("b", 300), article("c", 100)]);

  assert.deepEqual(sorted.map((a) => a.id), ["b", "a", "c"]);
});

test("U2: articles with identical timestamps keep their original order", () => {
  const sorted = sortNewestFirst([
    article("a", 100),
    article("b", 200),
    article("c", 100),
    article("d", 200),
  ]);

  assert.deepEqual(sorted.map((a) => a.id), ["b", "d", "a", "c"]);
});

test("U3: does not change the input array", () => {
  const input = [article("a", 100), article("b", 200)];
  const copy = [...input];

  sortNewestFirst(input);

  assert.deepEqual(input, copy);
});

test("U4: handles an empty list and a single item", () => {
  assert.deepEqual(sortNewestFirst([]), []);
  assert.deepEqual(sortNewestFirst([article("a", 100)]), [article("a", 100)]);
});

test("U5: matches a reference sort on 1,000 random items", () => {
  const numbers = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 500));
  const compare = (a, b) => a - b;

  assert.deepEqual(mergeSort(numbers, compare), [...numbers].sort(compare));
});

test("U6: comparing a sorted list finds no mismatches", () => {
  const articles = [article("a", 300), article("b", 200), article("c", 100)];

  assert.deepEqual(compareOrder(articles, sortNewestFirst(articles)), []);
});

test("U7: comparing a list with two swapped articles reports both positions", () => {
  const articles = [article("a", 200), article("b", 300), article("c", 100)];

  const mismatches = compareOrder(articles, sortNewestFirst(articles));

  assert.deepEqual(mismatches.map((m) => m.position), [1, 2]);
  assert.equal(mismatches[0].collected.id, "a");
  assert.equal(mismatches[0].expected.id, "b");
});

test("U8: the adjacent-pair check reports the violating pair", () => {
  const violations = findOutOfOrderPairs([article("a", 300), article("b", 100), article("c", 200)]);

  assert.equal(violations.length, 1);
  assert.equal(violations[0].position, 2);
  assert.equal(violations[0].current.id, "b");
  assert.equal(violations[0].next.id, "c");
});
