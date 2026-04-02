# code-scenario-vscode
code-scenario-vscode extension

## Drag and Drop

Items in the Code Scenario sidebar can be reordered and moved between scenarios by dragging and dropping them.

| Drag source | Drop target | Result |
|---|---|---|
| Item node | Scenario node | Moves the item (and its subtree) to that scenario's root, appended at the end |
| Item node | Item node | Moves the item (and its subtree) to sit immediately after the target item, at the same level as the target |

**Constraints**
- Only item nodes are draggable — scenario nodes cannot be dragged.
- Dropping an item onto itself or one of its descendants is rejected with a warning.
- Dropping an item to its current position is silently ignored.
- Multi-item drag, copy-on-drop, and cross-window drag are not supported in v1.

For placing an item as a *child* of another item, use the **Move Item…** context-menu command instead.



Hover over any row in the Code Scenario sidebar to reveal action buttons directly on the row — no right-click needed.

| Row type | Hover buttons |
|---|---|
| Scenario | Rename (pencil), Delete (trash), Add Item (+), Set Quick Add Target (target) |
| Scenario (current Quick Add target) | Rename (pencil), Delete (trash), Add Item (+), Clear Quick Add Target (close) |
| Item (normal) | Edit (pencil), Delete (trash), Add Child (+), Open (arrow) |
| Item (stale ⚠) | Edit (pencil), Delete (trash), Add Child (+), Open (arrow), Relink (link) |

All of these actions remain available in the right-click context menu as well.

## Keyboard Shortcuts

The extension contributes the following default keyboard shortcuts for the most common workflows.
All bindings use the `Ctrl+Shift+Alt` chord prefix to avoid conflicts with VS Code built-ins.

| Shortcut | Command | When |
|---|---|---|
| `Ctrl+Shift+Alt+A` | Quick Add Current File to Scenario | Editor focused |
| `Ctrl+Shift+Alt+S` | Quick Add Selected Symbol to Scenario | Editor focused + text selected |
| `Ctrl+Shift+Alt+N` | Add Scenario | Code Scenario sidebar focused |

> **Tip — common editing flow:** Open a file, press `Ctrl+Shift+Alt+A` to bookmark it to a
> scenario. Select a function or class name, then press `Ctrl+Shift+Alt+S` to bookmark that
> specific symbol. Create a new scenario at any time by focusing the Code Scenario sidebar and
> pressing `Ctrl+Shift+Alt+N`.

When your workspace has multiple scenarios, the first editor-driven Quick Add pick becomes the
workspace default for later **Quick Add Current File to Scenario** and **Quick Add Selected Symbol
to Scenario** actions. You can change that default any time from the Command Palette with
**Set Quick Add Scenario**, or directly from a scenario row in the tree.

The current Quick Add target is shown subtly in the tree as **Quick Add** on that scenario row.
You can also clear the saved target from that same row; if the target scenario is deleted, the
saved Quick Add target is cleared automatically.

All shortcuts can be remapped via **File → Preferences → Keyboard Shortcuts** (search for
`code-scenario`).

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

- Type part of the **item label**, **scenario name**, and/or **file path**.
- Results show the scenario name plus path context to help distinguish similar items.
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

Open the **Add Item** or **Edit Item** panel and fill in the **Notes** textarea at the bottom of
the form. The field accepts multiple lines. Leave it empty to store no note; saving with an empty
Notes field removes any previously stored note from that item.

Existing items without a note continue to behave exactly as before.
