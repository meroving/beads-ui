import { describe, expect, test } from 'vitest';
import { normalizeListSort, sortIssuesBy } from './list-sort.js';

/**
 * @param {Array<{ id: string }>} issues
 */
function ids(issues) {
  return issues.map((it) => it.id);
}

describe('data/list-sort normalizeListSort', () => {
  test('keeps a known column and direction', () => {
    expect(normalizeListSort({ key: 'title', dir: 'desc' })).toEqual({
      key: 'title',
      dir: 'desc'
    });
  });

  test('degrades anything else to the default order', () => {
    expect(normalizeListSort(null)).toBeNull();
    expect(normalizeListSort('title')).toBeNull();
    expect(normalizeListSort({ key: 'nope', dir: 'asc' })).toBeNull();
    expect(normalizeListSort({ key: 'title', dir: 'up' })).toBeNull();
  });
});

describe('data/list-sort sortIssuesBy', () => {
  test('returns the input unchanged without a sort', () => {
    const issues = [{ id: 'b' }, { id: 'a' }];
    expect(sortIssuesBy(issues, null)).toBe(issues);
  });

  test('sorts ids naturally, not character by character', () => {
    const issues = [{ id: 'UI-10' }, { id: 'UI-2' }, { id: 'UI-1' }];
    expect(ids(sortIssuesBy(issues, { key: 'id', dir: 'asc' }))).toEqual([
      'UI-1',
      'UI-2',
      'UI-10'
    ]);
    expect(ids(sortIssuesBy(issues, { key: 'id', dir: 'desc' }))).toEqual([
      'UI-10',
      'UI-2',
      'UI-1'
    ]);
  });

  test('sorts titles case-insensitively with blanks last both ways', () => {
    const issues = [
      { id: 'a', title: 'beta' },
      { id: 'b', title: '' },
      { id: 'c', title: 'Alpha' }
    ];
    expect(ids(sortIssuesBy(issues, { key: 'title', dir: 'asc' }))).toEqual([
      'c',
      'a',
      'b'
    ]);
    expect(ids(sortIssuesBy(issues, { key: 'title', dir: 'desc' }))).toEqual([
      'a',
      'c',
      'b'
    ]);
  });

  test('orders type and status by the order the app offers them', () => {
    const issues = [
      { id: 'a', issue_type: 'epic', status: 'closed' },
      { id: 'b', issue_type: 'bug', status: 'in_progress' },
      { id: 'c', issue_type: 'task', status: 'open' },
      { id: 'd', issue_type: 'mystery', status: 'blocked' },
      { id: 'e', status: 'deferred' }
    ];
    expect(ids(sortIssuesBy(issues, { key: 'type', dir: 'asc' }))).toEqual([
      'b',
      'c',
      'a',
      'd',
      'e'
    ]);
    expect(ids(sortIssuesBy(issues, { key: 'status', dir: 'asc' }))).toEqual([
      'c',
      'b',
      'd',
      'e',
      'a'
    ]);
  });

  test('sorts priority numerically, treating a missing one as medium', () => {
    const issues = [
      { id: 'a', priority: 4 },
      { id: 'b' },
      { id: 'c', priority: 0 },
      { id: 'd', priority: 3 }
    ];
    expect(ids(sortIssuesBy(issues, { key: 'priority', dir: 'desc' }))).toEqual(
      ['a', 'd', 'b', 'c']
    );
  });

  test('sorts assignees with unassigned last both ways', () => {
    const issues = [
      { id: 'a', assignee: 'zoe' },
      { id: 'b' },
      { id: 'c', assignee: 'Ann' }
    ];
    expect(ids(sortIssuesBy(issues, { key: 'assignee', dir: 'asc' }))).toEqual([
      'c',
      'a',
      'b'
    ]);
    expect(ids(sortIssuesBy(issues, { key: 'assignee', dir: 'desc' }))).toEqual(
      ['a', 'c', 'b']
    );
  });

  test('sorts labels by their alphabetical list, unlabeled last', () => {
    const issues = [
      { id: 'a', labels: ['ui'] },
      { id: 'b', labels: [] },
      { id: 'c', labels: ['ui', 'backend'] },
      { id: 'd', labels: ['backend'] }
    ];
    expect(ids(sortIssuesBy(issues, { key: 'labels', dir: 'asc' }))).toEqual([
      'd',
      'c',
      'a',
      'b'
    ]);
  });

  test('sorts deps by the total of dependencies and dependents', () => {
    const issues = [
      { id: 'a', dependency_count: 1, dependent_count: 1 },
      { id: 'b' },
      { id: 'c', dependent_count: 3 }
    ];
    expect(ids(sortIssuesBy(issues, { key: 'deps', dir: 'desc' }))).toEqual([
      'c',
      'a',
      'b'
    ]);
  });

  test('keeps the incoming order for ties in both directions', () => {
    const issues = [
      { id: 'x', priority: 1 },
      { id: 'y', priority: 1 },
      { id: 'z', priority: 0 }
    ];
    expect(ids(sortIssuesBy(issues, { key: 'priority', dir: 'asc' }))).toEqual([
      'z',
      'x',
      'y'
    ]);
    expect(ids(sortIssuesBy(issues, { key: 'priority', dir: 'desc' }))).toEqual(
      ['x', 'y', 'z']
    );
  });
});
