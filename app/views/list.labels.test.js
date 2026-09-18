import { describe, expect, test } from 'vitest';
import { createSubscriptionIssueStore } from '../data/subscription-issue-store.js';
import { createStore } from '../state.js';
import { createListView } from './list.js';

const LABELS_DROPDOWN = 2;

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

const ISSUES = [
  {
    id: 'UI-1',
    title: 'Both',
    status: 'open',
    issue_type: 'task',
    labels: ['ui', 'backend']
  },
  {
    id: 'UI-2',
    title: 'Frontend only',
    status: 'open',
    issue_type: 'bug',
    labels: ['ui']
  },
  { id: 'UI-3', title: 'Unlabeled', status: 'open', issue_type: 'task' },
  {
    id: 'UI-4',
    title: 'Docs',
    status: 'open',
    issue_type: 'chore',
    labels: ['docs']
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
  return { mount, view, issueStores };
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
 * @returns {HTMLElement}
 */
function labelsDropdown(mount) {
  return /** @type {HTMLElement} */ (
    mount.querySelectorAll('.filter-dropdown')[LABELS_DROPDOWN]
  );
}

/**
 * @param {HTMLElement} mount
 * @returns {string[]}
 */
function labelOptions(mount) {
  return Array.from(
    labelsDropdown(mount).querySelectorAll('.filter-dropdown__option')
  ).map((opt) => (opt.textContent || '').trim());
}

/**
 * @param {HTMLElement} mount
 * @param {string} label
 */
function toggleLabel(mount, label) {
  const dropdown = labelsDropdown(mount);
  /** @type {HTMLButtonElement} */ (
    dropdown.querySelector('.filter-dropdown__trigger')
  ).click();
  const option = Array.from(
    dropdown.querySelectorAll('.filter-dropdown__option')
  ).find((opt) => (opt.textContent || '').trim() === label);
  const checkbox = /** @type {HTMLInputElement} */ (
    option?.querySelector('input[type="checkbox"]')
  );
  checkbox.click();
}

describe('views/list labels', () => {
  test('renders a Labels column with a chip per label', async () => {
    const { mount, view } = await mountList();

    const headers = Array.from(mount.querySelectorAll('thead th')).map((th) =>
      (th.textContent || '').trim()
    );
    expect(headers.slice(0, 5)).toEqual([
      'ID',
      'Type',
      'Title',
      'Labels',
      'Status'
    ]);

    const chips = Array.from(
      mount.querySelectorAll('[data-issue-id="UI-1"] td.labels-col .label-chip')
    ).map((el) => (el.textContent || '').trim());
    expect(chips).toEqual(['ui', 'backend']);
    expect(
      mount.querySelectorAll('[data-issue-id="UI-3"] td.labels-col .label-chip')
        .length
    ).toBe(0);
    view.destroy();
  });

  test('offers every loaded label, sorted, in the toolbar dropdown', async () => {
    const { mount, view } = await mountList();

    expect(labelOptions(mount)).toEqual(['backend', 'docs', 'ui']);
    expect(
      (
        labelsDropdown(mount).querySelector('.filter-dropdown__trigger')
          ?.textContent || ''
      ).trim()
    ).toContain('Labels: Any');
    view.destroy();
  });

  test('filters rows carrying any of the selected labels', async () => {
    const { mount, view } = await mountList();

    toggleLabel(mount, 'backend');
    expect(rowIds(mount)).toEqual(['UI-1']);

    toggleLabel(mount, 'docs');
    expect(rowIds(mount)).toEqual(['UI-1', 'UI-4']);
    expect(
      (
        labelsDropdown(mount).querySelector('.filter-dropdown__trigger')
          ?.textContent || ''
      ).trim()
    ).toContain('Labels (2)');

    // Other labels stay selectable while the list is narrowed
    expect(labelOptions(mount)).toEqual(['backend', 'docs', 'ui']);

    toggleLabel(mount, 'backend');
    toggleLabel(mount, 'docs');
    expect(rowIds(mount)).toEqual(['UI-1', 'UI-2', 'UI-3', 'UI-4']);
    view.destroy();
  });

  test('combines the label filter with the type filter', async () => {
    const { mount, view } = await mountList();

    toggleLabel(mount, 'ui');
    const types = mount.querySelectorAll('.filter-dropdown')[1];
    /** @type {HTMLButtonElement} */ (
      types.querySelector('.filter-dropdown__trigger')
    ).click();
    const bug = Array.from(
      types.querySelectorAll('.filter-dropdown__option')
    ).find((opt) => (opt.textContent || '').trim() === 'Bug');
    const checkbox = /** @type {HTMLInputElement} */ (
      bug?.querySelector('input[type="checkbox"]')
    );
    checkbox.click();

    expect(rowIds(mount)).toEqual(['UI-2']);
    view.destroy();
  });

  test('publishes the selection to the store and applies it on load', async () => {
    const store = createStore({ filters: { labels: ['docs', 'gone'] } });
    const { mount, view } = await mountList(store);

    expect(rowIds(mount)).toEqual(['UI-4']);
    // A selected label no longer on any issue is still listed so it can be
    // unchecked
    expect(labelOptions(mount)).toEqual(['backend', 'docs', 'gone', 'ui']);

    toggleLabel(mount, 'gone');
    expect(store.getState().filters.labels).toEqual(['docs']);

    store.setState({ filters: { labels: ['ui'] } });
    expect(rowIds(mount)).toEqual(['UI-1', 'UI-2']);
    view.destroy();
  });

  test('shows an empty hint when no issue has labels', async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const issueStores = createTestIssueStores();
    issueStores.getStore('tab:issues').applyPush({
      type: 'snapshot',
      id: 'tab:issues',
      revision: 1,
      issues: [{ id: 'UI-9', title: 'Plain', status: 'open' }]
    });
    const view = createListView(
      mount,
      async () => [],
      () => {},
      undefined,
      undefined,
      issueStores
    );
    await view.load();

    expect(
      (
        labelsDropdown(mount).querySelector('.filter-dropdown__empty')
          ?.textContent || ''
      ).trim()
    ).toBe('No labels');
    view.destroy();
  });
});
