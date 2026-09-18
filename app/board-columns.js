/**
 * Board column definitions shared by the server (settings defaults and
 * validation) and the client (subscriptions and rendering).
 *
 * A column is fed by its primary `subscription` plus any `extra_sources`; the
 * Board shows the union of all of them, deduplicated by issue id.
 */

/**
 * @typedef {Object} ColumnSource
 * @property {string} subscription - Subscription type (e.g. 'status-blocked-issues').
 * @property {Record<string, string | number | boolean>} [params] - Optional subscription parameters.
 */

/**
 * @typedef {Object} ColumnDef
 * @property {string} id - Unique column identifier.
 * @property {string} label - Display label for the column header.
 * @property {string} subscription - Primary subscription type for data.
 * @property {Record<string, string | number | boolean>} [params] - Optional subscription parameters.
 * @property {ColumnSource[]} [extra_sources] - Further subscriptions unioned into the column.
 * @property {string} drop_status - Status to set when a card is dropped into this column.
 * @property {boolean} [is_closed] - True if this column represents closed issues.
 */

/**
 * The default four-lane Board.
 *
 * Blocked is the union of `bd blocked` (dependency-blocked issues, whose own
 * status is `open`) and issues whose stored status is `blocked`, which `bd
 * blocked` does not report. A drop must produce membership in the lane it lands
 * on, and `open` only lands in Blocked when the issue happens to be
 * dependency-blocked, so Blocked drops set the stored status `blocked`.
 *
 * @type {ColumnDef[]}
 */
export const DEFAULT_BOARD_COLUMNS = [
  {
    id: 'blocked',
    label: 'Blocked',
    subscription: 'blocked-issues',
    extra_sources: [{ subscription: 'status-blocked-issues' }],
    drop_status: 'blocked'
  },
  {
    id: 'ready',
    label: 'Ready',
    subscription: 'ready-issues',
    drop_status: 'open'
  },
  {
    id: 'in-progress',
    label: 'In Progress',
    subscription: 'in-progress-issues',
    drop_status: 'in_progress'
  },
  {
    id: 'closed',
    label: 'Closed',
    subscription: 'closed-issues',
    drop_status: 'closed'
  }
];

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} src
 * @returns {src is ColumnSource}
 */
function isValidSource(src) {
  if (!isPlainObject(src)) {
    return false;
  }
  const s = /** @type {Record<string, unknown>} */ (src);
  return (
    typeof s.subscription === 'string' &&
    s.subscription.length > 0 &&
    (s.params === undefined || isPlainObject(s.params))
  );
}

/**
 * Whether a value is a well-formed column definition. `extra_sources` is
 * optional, but when present every entry must be a valid source.
 *
 * @param {unknown} col
 * @returns {col is ColumnDef}
 */
export function isValidColumnDef(col) {
  if (!isPlainObject(col)) {
    return false;
  }
  const c = /** @type {Record<string, unknown>} */ (col);
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.label === 'string' &&
    c.label.length > 0 &&
    typeof c.subscription === 'string' &&
    c.subscription.length > 0 &&
    typeof c.drop_status === 'string' &&
    c.drop_status.length > 0 &&
    (c.extra_sources === undefined ||
      (Array.isArray(c.extra_sources) && c.extra_sources.every(isValidSource)))
  );
}

/**
 * Subscriptions feeding a column, primary first. The primary one keeps the
 * client id `tab:board:<id>`; extra sources get `tab:board:<id>+<n>` (column
 * ids are kebab-case, so `+` cannot collide with another column).
 *
 * @param {ColumnDef} col
 * @returns {Array<{ client_id: string, spec: { type: string, params?: Record<string, string | number | boolean> } }>}
 */
export function columnSources(col) {
  /** @type {ColumnSource[]} */
  const sources = [
    { subscription: col.subscription, params: col.params },
    ...(Array.isArray(col.extra_sources) ? col.extra_sources : [])
  ];
  return sources.map((src, i) => ({
    client_id: 'tab:board:' + col.id + (i === 0 ? '' : '+' + i),
    spec: src.params
      ? { type: src.subscription, params: src.params }
      : { type: src.subscription }
  }));
}
