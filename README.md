# code-scenario-vscode
code-scenario-vscode extension

## Drag and Drop

Items and scenarios in the Code Scenario sidebar can be reordered and moved by dragging and dropping them.

| Drag source | Drop target | Result |
|---|---|---|
| Scenario node | Scenario node | Reorders: moves the dragged scenario to sit immediately after the target scenario |
| Item node | Scenario node | Moves the item (and its subtree) to that scenario's root, appended at the end |
| Item node | Item node | Moves the item (and its subtree) to sit immediately after the target item, at the same level as the target |

**Constraints**
- Dropping a scenario onto itself is silently ignored.
- Dropping a scenario onto an item node or onto empty space is silently ignored.
- Dropping an item onto itself or one of its descendants is rejected with a warning.
- Dropping an item to its current position is silently ignored.
- Multi-item / multi-scenario drag, copy-on-drop, and cross-window drag are not supported in v1.

For placing an item as a *child* of another item, use the **Move Item…** or **Copy Item…**
context-menu command instead.

## Copy Item

Use **Copy Item...** from an item's context menu to duplicate that item and its full subtree into a
scenario root or under another item as a new child. Copies preserve the stored item metadata,
including notes, cached line, workspace binding, and stale-state-related path data, while assigning
fresh internal IDs so the copied branch can be edited independently.



Hover over any row in the Code Scenario sidebar to reveal action buttons directly on the row — no right-click needed.

| Row type | Hover buttons |
|---|---|
| Scenario | Rename (pencil), Delete (trash), Add Item (+), Set Quick Add Target (target) |
| Scenario (current Quick Add target) | Rename (pencil), Delete (trash), Add Item (+), Clear Quick Add Target (close) |
| Item (normal) | Edit (pencil), Delete (trash), Add Child (+), Open (arrow) |
| Item (stale ⚠) | Edit (pencil), Delete (trash), Add Child (+), Open (arrow), Relink (link) |

All of these actions remain available in the right-click context menu as well.

## Repair Stale Item

Use **Repair Stale Item...** to find broken scenario items across every scenario from one place, then jump straight into the existing relink flow.

- If no stale items exist, Code Scenario shows an informational message.
- If stale items exist, a Quick Pick lists each stale item with its item name, scenario, ancestor path, file path, and stale reason.
- Selecting a result reveals and selects that item in the Code Scenario tree, then opens the normal **Relink Item** flow for that item.
- Cancelling the Quick Pick makes no changes.

### How to invoke

| Method | Action |
|---|---|
| Tree toolbar | Click the **warning** (⚠) icon in the Code Scenario panel header |
| Command Palette | `Repair Stale Item...` |

When **Add Item** is invoked without a specific tree row context (for example from the tree toolbar or
Command Palette), Code Scenario now defaults to the saved **Quick Add target** scenario when that
target still exists.

- If a saved Quick Add target exists, **Add Item** opens directly for that scenario.
- If no target is saved and exactly one scenario exists, that scenario is still used automatically.
- If no target is saved and multiple scenarios exist, **Add Item** still prompts you to choose a
  scenario.
- Invoking **Add Item** from a scenario row or item row still uses that explicit row as the add
  destination.

## Delete Undo

After you confirm **Delete Scenario** or **Delete Item**, the extension shows a temporary
notification with an **Undo** action.

- Undo restores only the **most recently deleted** scenario or item.
- The restored entry returns to its original parent and order position when that exact restore is
  still possible.
- Deleting a scenario and undoing it also restores the **Quick Add** target state if that scenario
  had been selected as the current target.
- Undo is session-only: it does not survive a window reload or restart.

If the original parent or surrounding order has changed in a way that makes exact restoration
ambiguous, Undo is rejected with a warning instead of restoring to a guessed location.

## Add to Scenario from Explorer

Right-click any file in the VS Code Explorer (sidebar file tree) and choose **Add to Scenario...** to add that file directly to a scenario — no need to open the file first.

- If a **Quick Add target** scenario is saved, the file is added immediately to that scenario.
- If exactly one scenario exists and no target is saved, the file is added to that scenario automatically.
- If multiple scenarios exist and no target is saved, a Quick Pick prompt lets you choose the scenario (the choice is then saved as the new Quick Add target).
- After success, a brief notification confirms which scenario received the file.

The command appears only for files (not folders) that are inside the current workspace.

## Duplicate-Add Guard

All three Quick Add surfaces (**Quick Add Current File**, **Quick Add Selected Symbol**, and **Add to Scenario from Explorer**) check whether the item already exists in the target scenario before adding it.

- **File duplicate** — detected when the target scenario already has a file item with the same relative path and workspace folder.
- **Symbol duplicate** — detected when the target scenario already has a symbol item with the same file path, workspace folder, and symbol name.

When a duplicate is detected an information notification appears with two actions:

| Action | Behaviour |
|---|---|
| **Reveal** | Scrolls the Code Scenario tree to the existing item and selects it. If multiple matching items exist, a Quick Pick lets you choose which one to reveal. |
| **Add anyway** | Bypasses the guard and adds the item normally (use this when you intentionally want two entries for the same target). |
| *(dismiss)* | Closes the notification without adding. |

The check is **scoped to the target scenario only** — adding the same file or symbol to a different scenario is never blocked.

## Sequential Scenario Walkthrough

Use **Next Scenario Item** and **Previous Scenario Item** to step through all items in a scenario
one by one, in depth-first tree order.

- **First invocation** — if no walkthrough position is active, the extension resolves the scenario
  to walk through:
  - If an effective **Quick Add target** scenario exists (either explicitly set or auto-selected
    because only one scenario exists), that scenario is used automatically.
  - If multiple scenarios exist and no Quick Add target is set, a Quick Pick prompts you to choose.
- **Subsequent invocations** — steps forward or backward through the flat item list of the same
  scenario. The position is remembered for the duration of the session.
- **Empty scenario** — an informational message is shown and the walkthrough does not advance.
- **Wrap-around** — stepping past the last item wraps to the first (and vice versa); a brief
  informational message indicates the wrap.
- After each step the item is opened in the editor (using the normal open behavior) and revealed
  and selected in the Code Scenario tree.

The walkthrough position is **session-only** and is not persisted across window reloads or restarts.

### How to invoke

| Method | Action |
|---|---|
| Keyboard | `Ctrl+Shift+Alt+]` — Next Scenario Item |
| Keyboard | `Ctrl+Shift+Alt+[` — Previous Scenario Item |
| Command Palette | `Next Scenario Item` |
| Command Palette | `Previous Scenario Item` |

## Keyboard Shortcuts

The extension contributes the following default keyboard shortcuts for the most common workflows.
All bindings use the `Ctrl+Shift+Alt` chord prefix to avoid conflicts with VS Code built-ins.

| Shortcut | Command | When |
|---|---|---|
| `Ctrl+Shift+Alt+A` | Quick Add Current File to Scenario | Editor focused |
| `Ctrl+Shift+Alt+S` | Quick Add Selected Symbol to Scenario | Editor focused + text selected |
| `Ctrl+Shift+Alt+N` | Add Scenario | Code Scenario sidebar focused |
| `Ctrl+Shift+Alt+F` | Find Scenario Item... | Always available |
| `Ctrl+Shift+Alt+E` | Reveal Active File in Scenarios | Editor focused |
| `Ctrl+Shift+Alt+]` | Next Scenario Item | Global |
| `Ctrl+Shift+Alt+[` | Previous Scenario Item | Global |

> **Tip — common editing flow:** Open a file, press `Ctrl+Shift+Alt+A` to bookmark it to a
> scenario. Select a function or class name, then press `Ctrl+Shift+Alt+S` to bookmark that
> specific symbol. Create a new scenario at any time by focusing the Code Scenario sidebar and
> pressing `Ctrl+Shift+Alt+N`.

### Symbol type picker

When you run **Quick Add Selected Symbol to Scenario** (`Ctrl+Shift+Alt+S`), after the scenario
is resolved and any duplicate-guard prompt is handled, a Quick Pick asks you to choose the item
type for the new entry:

| Type | Meaning |
|---|---|
| `definition` | The symbol is defined here *(preselected — press Enter to accept)* |
| `declare` | Forward declaration or interface declaration |
| `call` | A call site for the symbol |
| `codeblock` | A general code block of interest |
| `reference` | Any other reference to the symbol |

- Pressing **Enter** on the default (`definition`) keeps the fast-path to a single extra keystroke.
- Pressing **Escape** cancels without adding the item.

When your workspace has multiple scenarios, the first editor-driven Quick Add pick becomes the
workspace default for later **Quick Add Current File to Scenario** and **Quick Add Selected Symbol
to Scenario** actions. You can change that default any time from the Command Palette with
**Set Quick Add Scenario**, or directly from a scenario row in the tree.

The current Quick Add target is shown subtly in the tree as **Quick Add** on that scenario row.
You can also clear the saved target from that same row; if the target scenario is deleted, the
saved Quick Add target is cleared automatically.

All shortcuts can be remapped via **File → Preferences → Keyboard Shortcuts** (search for
`code-scenario`).

## Preview: Quick Add Target Status Bar

The current **Quick Add** target is also available from the VS Code status bar as a preview
feature.

- The status bar item appears whenever the workspace has at least one scenario.
- If a Quick Add target is saved, the item shows that scenario name.
- If exactly one scenario exists and no target is saved yet, the item shows that scenario name with `(auto)` — it will be used automatically without prompting.
- If multiple scenarios exist and no target is saved yet, the item prompts you to select one.
- Click the item to set, change, or clear the saved Quick Add target without leaving the editor.

## Reveal Active File in Scenarios

Use **Reveal Active File in Scenarios** to jump from the current editor to the matching item(s)
in the Code Scenario tree — the reverse of clicking an item to open it.

- **Single match** — the tree scrolls to and selects the item automatically.
- **Multiple matches** — a Quick Pick lists every matching item with its scenario name and file
  path so you can choose the right one.
- **No match** — an informational message is shown.
- **Untitled or non-workspace files** — the command exits silently without an error.

### How to invoke

| Method | Action |
|---|---|
| Tree toolbar | Click the **eye** (👁) icon in the Code Scenario panel header |
| Command Palette | `Reveal Active File in Scenarios` |

## Find Scenario Item

Use **Find Scenario Item...** to search all stored scenario items from a Quick Pick, then jump to
the selected result.

- Type part of the **item name**, **scenario name**, and/or **file path**.
- Results show the scenario name plus path context to help distinguish similar items.
- Symbol items display their type (e.g. `definition`, `call`) in the description column next to the file path; file items rely on the file icon to convey kind.
- Selecting a result reveals it in the Code Scenario tree and opens it with the existing item-open
  behavior.

### How to invoke

| Method | Action |
|---|---|
| Tree toolbar | Click the **search** (🔍) icon in the Code Scenario panel header |
| Command Palette | `Find Scenario Item...` |

### Auto-reveal on editor change

Set `codeScenario.autoRevealInTree` to `true` to have the first matching scenario item revealed
automatically whenever you switch the active editor.

```json
"codeScenario.autoRevealInTree": true
```

Auto-reveal is **off by default** to avoid disrupting the tree's scroll position and expanded
state during normal editing. When enabled it is debounced (300 ms), does not steal keyboard
focus, and shows no notification when no match is found.

## Item Notes

Each scenario item can carry an optional free-text note. Notes are stored with the item and
displayed in the item tooltip when you hover over the row in the tree — they do not clutter the
label or description.

**How to add or edit a note**

- **Quick tree shortcut:** right-click an item in the Code Scenario tree and choose **Edit
  Note...**. A small note-only editor opens with the current note prefilled. Notes stay plain
  text, support multiple lines, and can be cleared from the same flow with **Clear Note** or by
  saving an empty note.
- **Full item editor:** open the **Add Item** or **Edit Item** panel and fill in the **Notes**
  textarea at the bottom of the form.

Existing items without a note continue to behave exactly as before.
