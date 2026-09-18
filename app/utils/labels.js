/**
 * Normalize a label filter selection: keep trimmed, non-empty strings and drop
 * duplicates. Anything that is not an array (e.g. a missing or corrupted
 * persisted value) degrades to "no label filter".
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeLabelFilters(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  /** @type {string[]} */
  const out = [];
  for (const it of value) {
    if (typeof it !== 'string') {
      continue;
    }
    const label = it.trim();
    if (label.length > 0 && !out.includes(label)) {
      out.push(label);
    }
  }
  return out;
}

/**
 * Compare two label selections as sets; order does not change the filter.
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {boolean}
 */
export function sameLabelFilters(a, b) {
  return a.length === b.length && a.every((label) => b.includes(label));
}

/**
 * Labels offered by the label filter: every label present on the given issues
 * plus any selected label no longer present, so it can still be unchecked.
 * Sorted alphabetically, case-insensitively.
 *
 * @param {Array<{ labels?: unknown }>} issues
 * @param {string[]} selected
 * @returns {string[]}
 */
export function collectLabelOptions(issues, selected) {
  /** @type {Set<string>} */
  const seen = new Set(selected);
  for (const it of issues) {
    for (const label of normalizeLabelFilters(it.labels)) {
      seen.add(label);
    }
  }
  return Array.from(seen).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}
