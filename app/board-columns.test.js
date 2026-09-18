import { describe, expect, test } from 'vitest';
import {
  DEFAULT_BOARD_COLUMNS,
  columnSources,
  isValidColumnDef
} from './board-columns.js';

describe('board-columns', () => {
  test('default columns are all valid', () => {
    expect(DEFAULT_BOARD_COLUMNS.every(isValidColumnDef)).toBe(true);
  });

  test('accepts a column without extra sources', () => {
    expect(
      isValidColumnDef({
        id: 'ready',
        label: 'Ready',
        subscription: 'ready-issues',
        drop_status: 'open'
      })
    ).toBe(true);
  });

  test('accepts extra sources with and without params', () => {
    expect(
      isValidColumnDef({
        id: 'review',
        label: 'Review',
        subscription: 'status-issues',
        params: { status: 'in_review' },
        extra_sources: [
          { subscription: 'status-blocked-issues' },
          { subscription: 'status-issues', params: { status: 'deferred' } }
        ],
        drop_status: 'in_progress'
      })
    ).toBe(true);
  });

  test.each([
    ['not an array', { subscription: 'x' }],
    ['an entry without subscription', [{ params: {} }]],
    ['an entry with empty subscription', [{ subscription: '' }]],
    ['an entry with array params', [{ subscription: 'x', params: [] }]]
  ])('rejects extra_sources that is %s', (_name, extra_sources) => {
    expect(
      isValidColumnDef({
        id: 'blocked',
        label: 'Blocked',
        subscription: 'blocked-issues',
        extra_sources,
        drop_status: 'blocked'
      })
    ).toBe(false);
  });

  test('rejects a column missing required fields', () => {
    expect(isValidColumnDef({ id: 'x', label: 'X' })).toBe(false);
    expect(isValidColumnDef(null)).toBe(false);
    expect(isValidColumnDef([])).toBe(false);
  });

  test('columnSources keeps the primary client id and suffixes extras', () => {
    expect(
      columnSources({
        id: 'blocked',
        label: 'Blocked',
        subscription: 'blocked-issues',
        extra_sources: [
          { subscription: 'status-blocked-issues' },
          { subscription: 'status-issues', params: { status: 'deferred' } }
        ],
        drop_status: 'blocked'
      })
    ).toEqual([
      { client_id: 'tab:board:blocked', spec: { type: 'blocked-issues' } },
      {
        client_id: 'tab:board:blocked+1',
        spec: { type: 'status-blocked-issues' }
      },
      {
        client_id: 'tab:board:blocked+2',
        spec: { type: 'status-issues', params: { status: 'deferred' } }
      }
    ]);
  });

  test('columnSources passes primary params through', () => {
    expect(
      columnSources({
        id: 'review',
        label: 'Review',
        subscription: 'status-issues',
        params: { status: 'in_review' },
        drop_status: 'in_progress'
      })
    ).toEqual([
      {
        client_id: 'tab:board:review',
        spec: { type: 'status-issues', params: { status: 'in_review' } }
      }
    ]);
  });
});
