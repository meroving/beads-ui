/**
 * Known issue types in canonical order for dropdowns.
 *
 * @type {Array<'bug'|'feature'|'task'|'epic'|'chore'|'decision'>}
 */
export const ISSUE_TYPES = [
  'bug',
  'feature',
  'task',
  'epic',
  'chore',
  'decision'
];

/**
 * Return a human-friendly label for an issue type.
 *
 * @param {string | null | undefined} type
 * @returns {string}
 */
export function typeLabel(type) {
  switch ((type || '').toString().toLowerCase()) {
    case 'bug':
      return 'Bug';
    case 'feature':
      return 'Feature';
    case 'task':
      return 'Task';
    case 'epic':
      return 'Epic';
    case 'chore':
      return 'Chore';
    case 'decision':
      return 'Decision';
    default:
      return '';
  }
}

/**
 * Normalize a type filter selection to known issue types, keeping selection
 * order and dropping duplicates. Accepts the legacy scalar form (`'bug'`, or
 * `''` for none); any other non-array degrades to "no type filter".
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeTypeFilters(value) {
  /** @type {unknown[]} */
  const list =
    typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
  /** @type {string[]} */
  const known = ISSUE_TYPES;
  /** @type {string[]} */
  const out = [];
  for (const it of list) {
    if (typeof it === 'string' && known.includes(it) && !out.includes(it)) {
      out.push(it);
    }
  }
  return out;
}

/**
 * Compare two type selections as sets; order does not change the filter.
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {boolean}
 */
export function sameTypeFilters(a, b) {
  return a.length === b.length && a.every((t) => b.includes(t));
}
