/**
 * User-chosen column sort for the Issues list.
 *
 * The list's default order is the store's (priority asc → created asc → id
 * asc, or closed_at desc for a closed-only list). A column sort reorders on
 * top of that order with a stable sort, so rows with equal keys keep their
 * default relative order in both directions.
 */
import { STATUSES } from '../protocol.js';
import { ISSUE_TYPES } from '../utils/issue-type.js';

/**
 * @typedef {'id'|'type'|'title'|'labels'|'status'|'assignee'|'priority'|'deps'} ListSortKey
 * @typedef {'asc'|'desc'} ListSortDir
 * @typedef {{ key: ListSortKey, dir: ListSortDir }} ListSort
 * @typedef {{ id: string, title?: string, status?: string, priority?: number, issue_type?: string, assignee?: string, labels?: unknown, dependency_count?: number, dependent_count?: number }} SortableIssue
 * @typedef {number | string | Array<number | string>} SortValue
 */

/** @type {readonly ListSortKey[]} */
export const LIST_SORT_KEYS = [
  'id',
  'type',
  'title',
  'labels',
  'status',
  'assignee',
  'priority',
  'deps'
];

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

/**
 * Normalize a stored sort. Anything that is not a known column and direction
 * (e.g. a missing or corrupted persisted value) degrades to the default order.
 *
 * @param {unknown} value
 * @returns {ListSort | null}
 */
export function normalizeListSort(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const { key, dir } = /** @type {{ key?: unknown, dir?: unknown }} */ (value);
  if (
    !(/** @type {readonly unknown[]} */ (LIST_SORT_KEYS).includes(key)) ||
    (dir !== 'asc' && dir !== 'desc')
  ) {
    return null;
  }
  return { key: /** @type {ListSortKey} */ (key), dir };
}

/**
 * Rank a value by a canonical order; values outside the order sort after it,
 * alphabetically among themselves.
 *
 * @param {readonly string[]} order
 * @param {string} value
 * @returns {Array<number | string>}
 */
function ranked(order, value) {
  const idx = order.indexOf(value);
  return [idx < 0 ? order.length : idx, value];
}

/**
 * Sort value of one issue for a column, or null when the cell is empty.
 * Enumerations (type, status) follow the order the app offers them in, not
 * the alphabet; defaults mirror what the row renders for a missing field.
 *
 * @param {SortableIssue} it
 * @param {ListSortKey} key
 * @returns {SortValue | null}
 */
function sortValue(it, key) {
  switch (key) {
    case 'id':
      return String(it.id);
    case 'type': {
      const type = String(it.issue_type || '');
      return type ? ranked(ISSUE_TYPES, type) : null;
    }
    case 'title': {
      const title = String(it.title || '').trim();
      return title || null;
    }
    case 'labels': {
      const labels = Array.isArray(it.labels)
        ? it.labels
            .filter((l) => typeof l === 'string' && l.trim() !== '')
            .map((l) => l.trim())
            .sort(collator.compare)
        : [];
      return labels.length > 0 ? labels : null;
    }
    case 'status':
      return ranked(STATUSES, String(it.status || 'open'));
    case 'assignee': {
      const assignee = String(it.assignee || '').trim();
      return assignee || null;
    }
    case 'priority':
      return it.priority ?? 2;
    case 'deps':
      return (it.dependency_count || 0) + (it.dependent_count || 0);
  }
}

/**
 * @param {SortValue} a
 * @param {SortValue} b
 * @returns {number}
 */
function compareValues(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const c = compareValues(a[i], b[i]);
      if (c !== 0) {
        return c;
      }
    }
    return a.length - b.length;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return collator.compare(String(a), String(b));
}

/**
 * Return the issues ordered by a column. Empty cells (no title, assignee,
 * labels or type) go last in both directions so flipping the direction never
 * floods the top of the list with blanks. `null` returns the input unchanged.
 *
 * @template {SortableIssue} T
 * @param {T[]} issues
 * @param {ListSort | null} sort
 * @returns {T[]}
 */
export function sortIssuesBy(issues, sort) {
  if (!sort) {
    return issues;
  }
  const sign = sort.dir === 'desc' ? -1 : 1;
  return issues
    .map((it) => ({ it, value: sortValue(it, sort.key) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        return (a.value === null ? 1 : 0) - (b.value === null ? 1 : 0);
      }
      return sign * compareValues(a.value, b.value);
    })
    .map((entry) => entry.it);
}
