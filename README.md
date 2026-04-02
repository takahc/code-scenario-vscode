# code-scenario-vscode
code-scenario-vscode extension

## Tree Inline Actions

Hover over any row in the Code Scenario sidebar to reveal action buttons directly on the row — no right-click needed.

| Row type | Hover buttons |
|---|---|
| Scenario | Rename (pencil), Delete (trash), Add Item (+) |
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

All shortcuts can be remapped via **File → Preferences → Keyboard Shortcuts** (search for
`code-scenario`).
