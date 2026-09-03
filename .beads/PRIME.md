# Beads Workflow Context

> Run `bd prime` after compaction, clear, or a new session (hooks do this automatically).

## SESSION CLOSE PROTOCOL

Before saying "done", run `bd dolt pull && bd dolt push` (pull first so the push is never
rejected non-fast-forward). Skip only when the project has no Dolt remote.

<!-- BEGIN PROJECT-LOCAL -->
<!-- Generated block. Do not edit here. Edit .beads/PRIME.local.md in this repo,
     then run ~/.claude/bin/render-prime.py --write. -->

**Git remote:** `https://github.com/AstroMined/beads-ui.git` (origin).
**Dolt remote:** `origin` -> `git+https://github.com/AstroMined/beads-ui.git`, verified configured. Bead history is stored as
the `refs/dolt/data` ref in that repository, out-of-band from the code branches.

<!-- END PROJECT-LOCAL -->

**Note:** Dolt auto-commit is enabled; every `bd` write is a Dolt commit.

## What a bead is

A bead is a short work order, not a document. It has four parts:

1. **Problem space**: what is wrong or missing, and where (files, PRD section).
2. **Design guidance and constraints**: the approach and what must not change.
3. **Acceptance criteria**: pass/fail statements.
4. **Verification**: the command that proves each criterion.

Point at the PRD, doc, or file; do not restate it. A future session reads the bead and
then the thing it points at.

| Field           | Flag             | Holds                                              |
| --------------- | ---------------- | -------------------------------------------------- |
| **Description** | `--description`  | problem space, files, checklist                    |
| **Design**      | `--design`       | approach and constraints (if any)                  |
| **Acceptance**  | `--acceptance`   | criteria plus the verifying command                |
| **Notes**       | `--append-notes` | `DECISION:` / `DEVIATION:` / `OUTCOME:` one-liners |

### Size caps (enforced)

A PreToolUse hook (`~/.claude/hooks/bd-write-guard.py`) rejects any write over these
sizes and shows you the reason. Shorten and retry; do not route around it.

| Write                        | Cap         |
| ---------------------------- | ----------- |
| `bd create` (whole command)  | 3,500 bytes |
| `bd update` (whole command)  | 1,500 bytes |
| one `--append-notes`         | 600 bytes   |
| `bd close --reason`          | 400 bytes   |
| whole bead (all four fields) | 6,000 bytes |

File inputs (`--body-file`, `--stdin`, `$(cat file)`) and `--notes` replacement on update
are rejected. A bead already over 6,000 bytes accepts only `--append-notes` or `bd close`.
A bead states each acceptance criterion and the command or test that proves it; it links
no evidence document. If the four parts do not fit the caps, shorten the claim or split the
bead; if that fails, stop and ask.

### Example

```bash
bd create --title="Add read-only DB connection wrapper" --type=task --parent=<epic-id> \
  --description="$(cat <<'EOF'
Callers open raw connections and forget to close them (PRD-07 section 3.2).
Files: src/pkg/db.py, tests/unit/test_db.py
EOF
)" \
  --design="Context manager over transport_sdk's client; no new retry logic." \
  --acceptance="$(cat <<'EOF'
- [ ] wrapper closes on exception: uv run pytest tests/unit/test_db.py
- [ ] make check-all green
EOF
)"
bd close <id> --reason="Wrapper landed in a1b2c3d; unit and integration suites green."
```

### When to create a bead

- Substantive work the user asked for: multi-file code changes, bugs, anything spanning
  sessions or carrying dependencies.
- Not for: bead CRUD, single-doc or PRD edits, planning notes, formatting, config touches.
- **Discovered work is not a new bead.** Something found while doing a bead goes as one
  line under "Discovered, not done" in your final message. The user decides whether it
  becomes a bead. Investigate a bug before filing it, and file only what is confirmed.
- One bead per unit of work. Do not split a task into per-file or per-finding beads.

## Essential commands

IDs are `<project>-<hash>`; children append `.N`. Always use full IDs (a short suffix is
ambiguous once an epic has children).

- `bd ready` / `bd list --status=open` / `bd show <id>` - find and read work
- `bd create --title="..." --type=task|bug|feature|epic|chore --priority=2 --parent=<id>`
  (priority is `0-4`, never "high"/"low")
- `bd update <id> --status=in_progress` - claim; `--append-notes="DECISION: ..."` - record
- `bd close <id> --reason="..."` - always give a reason
- `bd dep add <issue> <depends-on>` - blocking dependency; `bd children <epic>`; `bd blocked`
- Never `bd edit` (opens `$EDITOR`); never `bd update --notes` (replaces the field)
- `bd dolt pull` then `bd dolt push` to sync

## Parent-child vs dependencies

- `--parent` is containment; `bd dep add` is ordering. Never dep-link a task to its own
  parent, and never wire a `blocks` edge from a bead onto its own ancestor (self-deadlock).
- **A `blocks` edge on a parent hides every child from `bd ready`** (bd 0.63.3). An empty
  `bd ready` is ambiguous: check `bd dep list <parent>` before concluding no work exists.
- Max four levels: feature -> epic -> task -> subtask.

## Reference

Types: `feature` (PRD container), `epic`, `task`, `bug`, `chore`. Statuses: `open`,
`in_progress`, `in_review` (custom; absent from `bd ready`, query with
`bd list --status=in_review`), `blocked`, `closed`.

Pipeline dispatch uses `assignee` as a queue:

```text
prepare-feature  -> assignee=prepare-epic on new epics
prepare-epic     -> assignee=implement-epic
implement-epic   -> status=in_review, assignee=finalize-epic
finalize-epic    -> assignee=finalize-feature (pass) or implement-epic (fail)
finalize-feature -> closes beads, or reports Blocking findings; the user decides
```

Find queued work with `bd children <parent>` filtered by status and assignee, then
`bd dep list <id>` for open blocks edges. Never use `bd ready --assignee=...` as the
dispatch source (transitive blocking makes empty output ambiguous).

Closed beads are not modified; create a new one. Reopen with `bd update <id> --status=open`.
