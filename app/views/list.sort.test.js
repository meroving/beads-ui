import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createSubscriptionIssueStore } from '../data/subscription-issue-store.js';
import { createStore } from '../state.js';
import { createListView } from './list.js';

const SORT_KEY = 'beads-ui.list-sort';

/**
 * @returns {{ getStore: (id: string) => any, snapshotFor: (id: string) => any[], subscribe: (fn: () => void) => () => void }}
 */
function createTestIssueStores() {
  /** @type {Map<string, any>} */
  const stores = new Map();
  /** @type {Set<() => void>} */
  const listeners = new Set();

  /**
   * @param {string} id
   * @returns {any}
   */
  function getStore(id) {
    let s = stores.get(id);
    if (!s) {
      s = createSubscriptionIssueStore(id);
      stores.set(id, s);
      s.subscribe(() => {
        for (const fn of Array.from(listeners)) {
          fn();
        }
      });
    }
    return s;
  }

  return {
    getStore,
    /** @param {string} id */
    snapshotFor(id) {
      return getStore(id).snapshot().slice();
    },
    /** @param {() => void} fn */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

// The store orders these by priority: UI-2, UI-10, UI-1.
const ISSUES = [
  {
    id: 'UI-1',
    title: 'Charlie',
    status: 'closed',
    priority: 3,
    issue_type: 'task',
    created_at: 1,
    closed_at: 300
  },
  {
    id: 'UI-2',
    title: 'alpha',
    status: 'closed',
    priority: 0,
    issue_type: 'bug',
    created_at: 2,
    closed_at: 100
  },
  {
    id: 'UI-10',
    title: 'Bravo',
    status: 'closed',
    priority: 1,
    issue_type: 'epic',
    created_at: 3,
    closed_at: 200
  }
];

/**
 * @param {ReturnType<typeof createStore>} [store]
 */
async function mountList(store) {
  document.body.innerHTML = '<aside id="mount" class="panel"></aside>';
  const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
  const issueStores = createTestIssueStores();
  issueStores.getStore('tab:issues').applyPush({
    type: 'snapshot',
    id: 'tab:issues',
    revision: 1,
    issues: ISSUES
  });
  const view = createListView(
    mount,
    async () => [],
    () => {},
    store,
    undefined,
    issueStores
  );
  await view.load();
  return { mount, view };
}

/**
 * @param {HTMLElement} mount
 * @returns {string[]}
 */
function rowIds(mount) {
  return Array.from(mount.querySelectorAll('tr.issue-row')).map(
    (el) => el.getAttribute('data-issue-id') || ''
  );
}

/**
 * @param {HTMLElement} mount
 * @param {string} column
 * @param {'ascending'|'descending'} word
 * @returns {HTMLButtonElement}
 */
function sortButton(mount, column, word) {
  return /** @type {HTMLButtonElement} */ (
    mount.querySelector(`button[aria-label="Sort by ${column} ${word}"]`)
  );
}

/**
 * @param {HTMLElement} mount
 * @returns {Array<[string, string]>}
 */
function sortedHeaders(mount) {
  return Array.from(mount.querySelectorAll('thead th[aria-sort]')).map((th) => [
    (th.textContent || '').trim(),
    th.getAttribute('aria-sort') || ''
  ]);
}

describe('views/list column sort', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  test('gives every column ascending and descending buttons', async () => {
    const { mount, view } = await mountList();

    const headers = Array.from(mount.querySelectorAll('thead th'));
    expect(headers).toHaveLength(8);
    for (const th of headers) {
      expect(th.querySelectorAll('button.sort-btn')).toHaveLength(2);
    }
    view.destroy();
  });

  test('marks priority ascending as the default order', async () => {
    const { mount, view } = await mountList();

    expect(rowIds(mount)).toEqual(['UI-2', 'UI-10', 'UI-1']);
    expect(sortedHeaders(mount)).toEqual([['Priority', 'ascending']]);
    expect(
      sortButton(mount, 'Priority', 'ascending').getAttribute('aria-pressed')
    ).toBe('true');
    view.destroy();
  });

  test('sorts by the chosen column and direction', async () => {
    const { mount, view } = await mountList();

    sortButton(mount, 'Title', 'ascending').click();
    expect(rowIds(mount)).toEqual(['UI-2', 'UI-10', 'UI-1']);
    expect(sortedHeaders(mount)).toEqual([['Title', 'ascending']]);

    sortButton(mount, 'Title', 'descending').click();
    expect(rowIds(mount)).toEqual(['UI-1', 'UI-10', 'UI-2']);
    expect(sortedHeaders(mount)).toEqual([['Title', 'descending']]);

    sortButton(mount, 'ID', 'ascending').click();
    expect(rowIds(mount)).toEqual(['UI-1', 'UI-2', 'UI-10']);

    sortButton(mount, 'Type', 'ascending').click();
    expect(rowIds(mount)).toEqual(['UI-2', 'UI-1', 'UI-10']);
    view.destroy();
  });

  test('clicking the active arrow restores the default order', async () => {
    const { mount, view } = await mountList();

    sortButton(mount, 'ID', 'descending').click();
    expect(rowIds(mount)).toEqual(['UI-10', 'UI-2', 'UI-1']);

    sortButton(mount, 'ID', 'descending').click();
    expect(rowIds(mount)).toEqual(['UI-2', 'UI-10', 'UI-1']);
    expect(sortedHeaders(mount)).toEqual([['Priority', 'ascending']]);
    expect(window.localStorage.getItem(SORT_KEY)).toBeNull();
    view.destroy();
  });

  test('persists the chosen sort and restores it on the next mount', async () => {
    const first = await mountList();
    sortButton(first.mount, 'Title', 'descending').click();
    expect(JSON.parse(window.localStorage.getItem(SORT_KEY) || 'null')).toEqual(
      { key: 'title', dir: 'desc' }
    );
    first.view.destroy();

    const second = await mountList();
    expect(rowIds(second.mount)).toEqual(['UI-1', 'UI-10', 'UI-2']);
    expect(sortedHeaders(second.mount)).toEqual([['Title', 'descending']]);
    second.view.destroy();
  });

  test('ignores a corrupted stored sort', async () => {
    window.localStorage.setItem(SORT_KEY, '{"key":"nope","dir":"asc"}');
    const { mount, view } = await mountList();

    expect(rowIds(mount)).toEqual(['UI-2', 'UI-10', 'UI-1']);
    view.destroy();
  });

  test('a closed-only list defaults to most recently closed, until a column is chosen', async () => {
    const store = createStore({ filters: { status: ['closed'] } });
    const { mount, view } = await mountList(store);

    expect(rowIds(mount)).toEqual(['UI-1', 'UI-10', 'UI-2']);
    expect(sortedHeaders(mount)).toEqual([]);

    sortButton(mount, 'Priority', 'ascending').click();
    expect(rowIds(mount)).toEqual(['UI-2', 'UI-10', 'UI-1']);

    sortButton(mount, 'Priority', 'ascending').click();
    expect(rowIds(mount)).toEqual(['UI-1', 'UI-10', 'UI-2']);
    view.destroy();
  });

  test('Enter on a sort button does not open the selected issue', async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const issueStores = createTestIssueStores();
    issueStores.getStore('tab:issues').applyPush({
      type: 'snapshot',
      id: 'tab:issues',
      revision: 1,
      issues: ISSUES
    });
    /** @type {string[]} */
    const navigations = [];
    const view = createListView(
      mount,
      async () => [],
      (hash) => navigations.push(hash),
      undefined,
      undefined,
      issueStores
    );
    await view.load();

    const button = sortButton(mount, 'Title', 'ascending');
    const ev = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });
    button.dispatchEvent(ev);

    expect(navigations).toEqual([]);
    expect(ev.defaultPrevented).toBe(false);
    view.destroy();
  });
});
