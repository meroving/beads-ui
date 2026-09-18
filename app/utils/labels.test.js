import { describe, expect, test } from 'vitest';
import {
  collectLabelOptions,
  normalizeLabelFilters,
  sameLabelFilters
} from './labels.js';

describe('utils/labels', () => {
  test('normalizeLabelFilters keeps trimmed unique strings', () => {
    expect(
      normalizeLabelFilters([' ui ', 'backend', 'ui', '', 3, null])
    ).toEqual(['ui', 'backend']);
  });

  test('normalizeLabelFilters degrades non-arrays to empty', () => {
    expect(normalizeLabelFilters(undefined)).toEqual([]);
    expect(normalizeLabelFilters('ui')).toEqual([]);
    expect(normalizeLabelFilters({ 0: 'ui' })).toEqual([]);
  });

  test('sameLabelFilters ignores order', () => {
    expect(sameLabelFilters(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameLabelFilters(['a'], ['a', 'b'])).toBe(false);
    expect(sameLabelFilters([], [])).toBe(true);
  });

  test('collectLabelOptions unions issue labels with the selection', () => {
    const issues = [
      { labels: ['ui', 'Backend'] },
      { labels: ['api'] },
      {},
      { labels: 'not-an-array' }
    ];
    expect(collectLabelOptions(issues, ['gone'])).toEqual([
      'api',
      'Backend',
      'gone',
      'ui'
    ]);
  });
});
