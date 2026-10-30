# Test Plan: Hacker News /newest Sort Validation

## Objective
Confirm that the first 100 articles on [Hacker News /newest](https://news.ycombinator.com/newest) are sorted newest to oldest, and confirm that the validator itself catches wrong data.

## Approach
1. Collect exactly 100 unique articles across pages.
2. Sort a separate copy with a stable merge sort, newest first.
3. Compare the collected order to the merge-sorted order, position by position.
4. Check every adjacent pair as a second, independent method. Both methods must agree.
5. Print the values and exit with code 1 on any failure.

## Why a mock site
A live run can only show the validator passing, because Hacker News is normally in order. A local mock site serves controlled pages, so the failure paths can be tested too.

## Risks
| Risk | Effect | How it's handled |
|---|---|---|
| New posts arrive while paging, pushing articles onto the next page | The same article appears twice | Deduplicate by article ID and report the count (M3) |
| Two articles posted in the same second | A false failure from an arbitrary tie order | Stable sort keeps ties in place (U2, M5) |
| Hacker News throttles requests | Too few articles | 30-second delay in CI, and a clear failure instead of a false pass (M4) |
| The validator always passes | The check proves nothing | Failure paths tested directly (U7, U8, M2, E2) |

## Test Cases

### Unit: merge sort and comparison logic
| ID | Case | Expected |
|---|---|---|
| U1 | Sort shuffled articles | Newest first |
| U2 | Articles with identical timestamps | Ties keep their original order |
| U3 | Check the input after sorting | Input array unchanged |
| U4 | Empty list and single item | Returned as-is |
| U5 | 1,000 random items | Same result as a reference sort |
| U6 | Compare an already sorted list | No mismatches |
| U7 | Compare a list with two swapped articles | Mismatches reported at those positions |
| U8 | Adjacent-pair check on an out-of-order list | The violating pair is reported |

### Mock site: collection and validation in a real browser
| ID | Case | Expected |
|---|---|---|
| M1 | 120 sorted articles across pages | Exactly 100 collected, in sorted order; passes |
| M2 | Two articles swapped on page 2 | Fails, with both methods reporting the problem |
| M3 | Page 2 repeats articles from page 1 | Duplicates skipped and counted; 100 unique; passes |
| M4 | Only 90 articles available | Fails on the count, without crashing |
| M5 | Several articles with the same timestamp | Passes |

### End to end: the real script as a separate process
| ID | Case | Expected |
|---|---|---|
| E1 | `node index.js` against sorted mock pages | Exit code 0 |
| E2 | `node index.js` against out-of-order mock pages | Exit code 1, violations printed |

### Live
| ID | Case | Expected |
|---|---|---|
| L1 | `node index.js` against real Hacker News, locally | 100 articles, both methods agree, exit code 0 |
| L2 | The same run in GitHub Actions | Green |

## Out of Scope
- Comparing article IDs as a pass/fail check: IDs are printed only for information, because the assignment defines the order by time.
- Verifying Hacker News' timestamps are correct: the script trusts the value in the page.

## Results (October 30, 2026)
| Group | Cases | Result |
|---|---|---|
| Unit | U1–U8 | 8 passed |
| Mock site | M1–M5 | 5 passed |
| End to end | E1–E2 | 2 passed |
| Live, local | L1 | Passed on the second try: 100 articles, 0 positions differ, 0 violations, exit code 0 |
| Live, CI | L2 | Passed: 100 articles from 4 pages, 0 positions differ, 0 violations |

**Notes**
- L1's first try timed out loading the page because Hacker News wasn't responding from that network. It passed once the site was reachable, with no code changes.
- Neither live run had duplicates, so duplicate handling is proven only by the mock site (M3).
