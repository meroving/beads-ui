import { describe, expect, test, vi } from 'vitest';
import { createDetailView } from './detail.js';

/**
 * @param {any} issue
 */
function storesFor(issue) {
  return {
    /** @param {string} id */
    snapshotFor(id) {
      return id === `detail:${issue.id}` ? [issue] : [];
    },
    subscribe() {
      return () => {};
    }
  };
}

/**
 * @param {HTMLElement} mount
 * @param {string} status
 */
function changeStatus(mount, status) {
  const select = /** @type {HTMLSelectElement} */ (
    mount.querySelector('select.badge--status')
  );
  select.value = status;
  select.dispatchEvent(new Event('change'));
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('views/detail mutation replies', () => {
  test('keeps dependents and comments the reply does not carry', async () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const issue = {
      id: 'UI-30',
      title: 'Alpha',
      status: 'open',
      comment_count: 1,
      comments: [{ id: 1, author: 'dev', text: 'First comment' }],
      dependents: [{ id: 'UI-5', title: 'Blocked child' }]
    };
    const send = vi.fn(async (/** @type {string} */ type) => {
      if (type === 'update-status') {
        // Plain `bd show --json`: no dependents, no comments.
        return {
          id: 'UI-30',
          title: 'Alpha',
          status: 'in_progress',
          comment_count: 1
        };
      }
      throw new Error(`Unexpected ${type}`);
    });
    const view = createDetailView(mount, send, undefined, storesFor(issue));
    await view.load('UI-30');

    changeStatus(mount, 'in_progress');
    await flush();

    const select = /** @type {HTMLSelectElement} */ (
      mount.querySelector('select.badge--status')
    );
    expect(select.value).toBe('in_progress');
    expect(mount.querySelector('.detail-title h2')?.textContent).toContain(
      'Alpha'
    );
    expect(
      mount.querySelector('button[aria-label="Remove dependency UI-5"]')
    ).toBeTruthy();
    expect(mount.textContent).toContain('First comment');
  });

  test('ignores a reply without an issue', async () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const issue = {
      id: 'UI-31',
      title: 'Beta',
      description: 'Beta body',
      status: 'open',
      comment_count: 0
    };
    // The app transport resolves failed requests to `[]`.
    const send = vi.fn(async () => []);
    const view = createDetailView(mount, send, undefined, storesFor(issue));
    await view.load('UI-31');

    changeStatus(mount, 'in_progress');
    await flush();

    expect(mount.querySelector('.detail-title h2')?.textContent).toContain(
      'Beta'
    );
    expect(mount.textContent).toContain('Beta body');
  });

  test('ignores a reply that arrives after switching issues', async () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const first = { id: 'UI-32', title: 'First', status: 'open' };
    const second = { id: 'UI-33', title: 'Second', status: 'open' };
    /** @type {(value: unknown) => void} */
    let resolveReply = () => {};
    const send = vi.fn(async (/** @type {string} */ type) => {
      if (type === 'update-status') {
        return new Promise((resolve) => {
          resolveReply = resolve;
        });
      }
      return [];
    });
    const stores = {
      /** @param {string} id */
      snapshotFor(id) {
        if (id === 'detail:UI-32') return [first];
        if (id === 'detail:UI-33') return [second];
        return [];
      },
      subscribe() {
        return () => {};
      }
    };
    const view = createDetailView(mount, send, undefined, stores);
    await view.load('UI-32');

    changeStatus(mount, 'in_progress');
    await view.load('UI-33');
    resolveReply({ id: 'UI-32', title: 'First', status: 'in_progress' });
    await flush();

    expect(mount.querySelector('.detail-title h2')?.textContent).toContain(
      'Second'
    );
  });
});
