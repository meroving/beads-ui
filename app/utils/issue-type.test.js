import { describe, expect, test } from 'vitest';
import { normalizeTypeFilters, sameTypeFilters } from './issue-type.js';

describe('utils/issue-type filters', () => {
  test('normalizeTypeFilters keeps known types in order without duplicates', () => {
    expect(
      normalizeTypeFilters(['task', 'bogus', 'bug', 'task', 3, 'decision'])
    ).toEqual(['task', 'bug', 'decision']);
  });

  test('normalizeTypeFilters migrates the legacy scalar form', () => {
    expect(normalizeTypeFilters('bug')).toEqual(['bug']);
    expect(normalizeTypeFilters('')).toEqual([]);
    expect(normalizeTypeFilters('bogus')).toEqual([]);
  });

  test('normalizeTypeFilters degrades other values to empty', () => {
    expect(normalizeTypeFilters(undefined)).toEqual([]);
    expect(normalizeTypeFilters(null)).toEqual([]);
    expect(normalizeTypeFilters({ 0: 'bug' })).toEqual([]);
  });

  test('sameTypeFilters ignores order', () => {
    expect(sameTypeFilters(['bug', 'task'], ['task', 'bug'])).toBe(true);
    expect(sameTypeFilters(['bug'], ['bug', 'task'])).toBe(false);
  });
});
