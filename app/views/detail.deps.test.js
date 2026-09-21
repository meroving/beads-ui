import { describe, expect, test, vi } from 'vitest';
import { createDetailView } from './detail.js';

function setupDom() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
}

describe('views/detail dependencies', () => {
  test('adds Dependencies link and re-renders', async () => {
    const mount = setupDom();
    let current = { id: 'UI-10', title: 'X', dependencies: [], dependents: [] };
    const stores1 = {
      /** @param {string} id */
      snapshotFor(id) {
        return id === 'detail:UI-10' ? [current] : [];
      },
      subscribe() {
        return () => {};
      }
    };
    const send = vi.fn(async (type) => {
      if (type === 'dep-add') {
        return current;
      }
      throw new Error('Unexpected');
    });
    const view = createDetailView(mount, send, undefined, stores1);
    await view.load('UI-10');

    const input = mount.querySelector('[data-testid="add-dependency"]');
    expect(input).toBeTruthy();
    const el = /** @type {HTMLInputElement} */ (input);
    el.value = 'UI-2';
    const addBtn = el.nextElementSibling;
    addBtn?.dispatchEvent(new window.Event('click'));

    // Next tick
    await Promise.resolve();

    // Should have called dep-add
    const calls = send.mock.calls.map((c) => c[0]);
    expect(calls.includes('dep-add')).toBe(true);
  });

  test('removes Blocks link', async () => {
    const mount = setupDom();
    let current2 = {
      id: 'UI-20',
      title: 'Y',
      dependencies: [],
      dependents: [{ id: 'UI-5' }]
    };
    const stores2 = {
      /** @param {string} id */
      snapshotFor(id) {
        return id === 'detail:UI-20' ? [current2] : [];
      },
      subscribe() {
        return () => {};
      }
    };
    const send = vi.fn(async (type) => {
      if (type === 'dep-remove') {
        return { id: 'UI-20', dependencies: [], dependents: [] };
      }
      throw new Error('Unexpected');
    });
    const view = createDetailView(mount, send, undefined, stores2);
    await view.load('UI-20');

    // Find the remove button next to link #5
    const btns = mount.querySelectorAll('button');
    const rm = Array.from(btns).find((b) =>
      b.getAttribute('aria-label')?.includes('UI-5')
    );
    expect(rm).toBeTruthy();
    rm?.dispatchEvent(new window.Event('click'));

    await Promise.resolve();
    const calls = send.mock.calls.map((c) => c[0]);
    expect(calls.includes('dep-remove')).toBe(true);
  });

  test('prevents duplicate link add', async () => {
    const mount = setupDom();
    const current3 = {
      id: 'UI-30',
      dependencies: [{ id: 'UI-9' }],
      dependents: []
    };
    const stores3 = {
      /** @param {string} id */
      snapshotFor(id) {
        return id === 'detail:UI-30' ? [current3] : [];
      },
      subscribe() {
        return () => {};
      }
    };
    // eslint-disable-next-line no-unused-vars
    const send = vi.fn(async (type) => current3);
    const view = createDetailView(mount, send, undefined, stores3);
    await view.load('UI-30');

    const input = mount.querySelector('[data-testid="add-dependency"]');
    const el = /** @type {HTMLInputElement} */ (input);
    el.value = 'UI-9';
    const addBtn = el.nextElementSibling;
    addBtn?.dispatchEvent(new window.Event('click'));

    await Promise.resolve();
    // send should not be called with dep-add
    const calls = send.mock.calls.map((c) => c[0]);
    expect(calls.includes('dep-add')).toBe(false);
  });

  test('renders Dependents in the main column just above the comments', async () => {
    const mount = setupDom();
    const issue = {
      id: 'UI-40',
      title: 'Parent',
      description: 'Body text',
      dependencies: [{ id: 'UI-1', title: 'Blocker' }],
      dependents: [
        {
          id: 'UI-41',
          title: 'Child',
          status: 'in_progress',
          issue_type: 'task'
        }
      ]
    };
    const stores = {
      /** @param {string} id */
      snapshotFor(id) {
        return id === 'detail:UI-40' ? [issue] : [];
      },
      subscribe() {
        return () => {};
      }
    };
    const view = createDetailView(mount, vi.fn(), undefined, stores);
    await view.load('UI-40');

    const section = mount.querySelector('.detail-main .dependents');
    expect(section).toBeTruthy();
    expect(mount.querySelector('.detail-side .dependents')).toBeNull();
    expect(
      mount.querySelector('.detail-side [data-testid="add-dependent"]')
    ).toBeNull();
    expect(
      mount.querySelector('.detail-side [data-testid="add-dependency"]')
    ).toBeTruthy();

    const children = Array.from(
      /** @type {HTMLElement} */ (mount.querySelector('.detail-main')).children
    );
    const accept_idx = children.findIndex((el) =>
      el.classList.contains('acceptance')
    );
    const deps_idx = children.indexOf(/** @type {Element} */ (section));
    const comments_idx = children.findIndex((el) =>
      el.classList.contains('comments')
    );
    expect(accept_idx).toBeGreaterThanOrEqual(0);
    expect(deps_idx).toBe(accept_idx + 1);
    expect(comments_idx).toBe(deps_idx + 1);

    const row = section?.querySelector('li');
    expect(row?.textContent).toContain('UI-41');
    expect(row?.textContent).toContain('Child');
    expect(row?.querySelector('.status-badge.is-in_progress')).toBeTruthy();
    expect(
      section?.querySelector('[data-testid="add-dependent"]')
    ).toBeTruthy();
  });

  test('shows an empty state when there are no dependents', async () => {
    const mount = setupDom();
    const issue = { id: 'UI-50', title: 'Lonely', dependents: [] };
    const stores = {
      /** @param {string} id */
      snapshotFor(id) {
        return id === 'detail:UI-50' ? [issue] : [];
      },
      subscribe() {
        return () => {};
      }
    };
    const view = createDetailView(mount, vi.fn(), undefined, stores);
    await view.load('UI-50');

    const section = mount.querySelector('.detail-main .dependents');
    expect(section?.querySelector('ul')).toBeNull();
    expect(section?.textContent).toContain('No dependents');
  });

  test('adds a dependent from the main column', async () => {
    const mount = setupDom();
    const issue = { id: 'UI-60', title: 'Epic', dependents: [] };
    const stores = {
      /** @param {string} id */
      snapshotFor(id) {
        return id === 'detail:UI-60' ? [issue] : [];
      },
      subscribe() {
        return () => {};
      }
    };
    // The reply carries the new dependent; the subscription never re-pushes
    // because adding a dependent does not touch the viewed issue.
    const send = vi.fn(async () => ({
      ...issue,
      dependents: [{ id: 'UI-61', title: 'Child' }]
    }));
    const view = createDetailView(mount, send, undefined, stores);
    await view.load('UI-60');

    const input = /** @type {HTMLInputElement} */ (
      mount.querySelector('.detail-main [data-testid="add-dependent"]')
    );
    const add_btn = /** @type {HTMLButtonElement} */ (input.nextElementSibling);
    input.value = 'UI-61';
    add_btn.dispatchEvent(new window.Event('click'));
    expect(input.disabled).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(send).toHaveBeenCalledWith('dep-add', {
      a: 'UI-61',
      b: 'UI-60',
      view_id: 'UI-60'
    });
    const rows = mount.querySelectorAll('.detail-main .dependents li');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('UI-61');
    expect(input.disabled).toBe(false);
    expect(add_btn.disabled).toBe(false);
    expect(input.value).toBe('');
  });

  test('re-enables the add control and keeps the input after a failure', async () => {
    const mount = setupDom();
    const issue = { id: 'UI-70', title: 'Epic', dependents: [] };
    const stores = {
      /** @param {string} id */
      snapshotFor(id) {
        return id === 'detail:UI-70' ? [issue] : [];
      },
      subscribe() {
        return () => {};
      }
    };
    const send = vi.fn(async () => {
      throw new Error('bd failed');
    });
    const view = createDetailView(mount, send, undefined, stores);
    await view.load('UI-70');

    const input = /** @type {HTMLInputElement} */ (
      mount.querySelector('.detail-main [data-testid="add-dependent"]')
    );
    const add_btn = /** @type {HTMLButtonElement} */ (input.nextElementSibling);
    input.value = 'UI-404';
    add_btn.dispatchEvent(new window.Event('click'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(input.disabled).toBe(false);
    expect(add_btn.disabled).toBe(false);
    expect(input.value).toBe('UI-404');
  });
});
