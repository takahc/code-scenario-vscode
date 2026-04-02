import * as vscode from "vscode";
import {
  ScenarioProvider,
  ScenarioNode,
  ItemNode,
  TreeNode,
  MoveItemDestination,
} from "./scenarioProvider";
import { ScenarioData, ScenarioItemData } from "./scenarioModel";
import { ItemEditorValues, showItemEditor } from "./itemEditorPanel";
import { getActiveSelectionText } from "./editorContext";
import { resolveItemLine } from "./symbolResolver";
import {
  getActiveWorkspaceFileReference,
  resolveScenarioItemLocation,
  ScenarioItemLocationResolution,
} from "./workspacePaths";

/** MIME type used for internal tree drag-and-drop. */
const DRAG_MIME = "application/vnd.code-scenario-item";

/** MIME type used for scenario-row reorder drag-and-drop. */
const DRAG_MIME_SCENARIO = "application/vnd.code-scenario-scenario";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ScenarioProvider(context);

  // treeView is assigned immediately below; the `!` suppresses the definite-
  // assignment error inside the DnD controller closure.
  // eslint-disable-next-line prefer-const
  let treeView!: vscode.TreeView<TreeNode>;

  // ── Drag-and-drop controller ──────────────────────────────────

  const dndController: vscode.TreeDragAndDropController<TreeNode> = {
    dragMimeTypes: [DRAG_MIME, DRAG_MIME_SCENARIO],
    dropMimeTypes: [DRAG_MIME, DRAG_MIME_SCENARIO],

    handleDrag(
      source: readonly TreeNode[],
      dataTransfer: vscode.DataTransfer
    ): void {
      // Scenario drag: only when all dragged nodes are scenario nodes
      const scenarioNodes = source.filter((n): n is ScenarioNode => n.kind === "scenario");
      if (scenarioNodes.length > 0 && scenarioNodes.length === source.length) {
        // v1: single-scenario drag
        const node = scenarioNodes[0];
        dataTransfer.set(
          DRAG_MIME_SCENARIO,
          new vscode.DataTransferItem({ scenarioId: node.data.id })
        );
        return;
      }

      // Item drag: only when all dragged nodes are item nodes
      const itemNodes = source.filter((n): n is ItemNode => n.kind === "item");
      if (itemNodes.length === 0) { return; }
      // v1: single-item drag (multi-drag is out of scope)
      const node = itemNodes[0];
      dataTransfer.set(
        DRAG_MIME,
        new vscode.DataTransferItem({ scenarioId: node.scenarioId, itemId: node.data.id })
      );
    },

    async handleDrop(
      target: TreeNode | undefined,
      dataTransfer: vscode.DataTransfer
    ): Promise<void> {
      // ── Scenario reorder ──────────────────────────────────────
      const scenarioTransferItem = dataTransfer.get(DRAG_MIME_SCENARIO);
      if (scenarioTransferItem) {
        const { scenarioId } = scenarioTransferItem.value as { scenarioId: string };
        // Only scenario-onto-scenario drops are meaningful; everything else is a no-op
        if (!target || target.kind !== "scenario") { return; }
        const result = await provider.moveScenarioAfter(scenarioId, target.data.id);
        if (!result.ok) {
          if (result.isNoOp) { return; }
          await vscode.window.showWarningMessage(result.reason);
        }
        return;
      }

      // ── Item drag ─────────────────────────────────────────────
      const transferItem = dataTransfer.get(DRAG_MIME);
      if (!transferItem) { return; }

      const { scenarioId, itemId } = transferItem.value as { scenarioId: string; itemId: string };

      // Drop onto empty space — no-op
      if (!target) { return; }

      if (target.kind === "scenario") {
        // Move to the scenario root; append at the end
        const result = await provider.moveItem(scenarioId, itemId, target.data.id, undefined);
        if (!result.ok) {
          if (result.isNoOp) { return; }
          await vscode.window.showWarningMessage(result.reason);
          return;
        }
        await revealDroppedItem(provider, treeView, target.data.id, itemId);
      } else {
        // target.kind === "item": insert the dragged item immediately after the target item
        const result = await provider.moveItemAfterSibling(
          scenarioId,
          itemId,
          target.scenarioId,
          target.data.id
        );
        if (!result.ok) {
          if (result.isNoOp) { return; }
          await vscode.window.showWarningMessage(result.reason);
          return;
        }
        await revealDroppedItem(provider, treeView, target.scenarioId, itemId);
      }
    },
  };

  treeView = vscode.window.createTreeView("codeScenarioView", {
    treeDataProvider: provider,
    showCollapseAll: true,
    dragAndDropController: dndController,
  });

  context.subscriptions.push(treeView);

  // ── Commands ──────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("code-scenario.addScenario", async () => {
      const name = await vscode.window.showInputBox({
        prompt: "Enter scenario name",
        placeHolder: "e.g. USB initialization flow",
      });
      if (name && name.trim()) {
        await provider.addScenario(name.trim());
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.deleteScenario",
      async (node: ScenarioNode) => {
        const confirm = await vscode.window.showWarningMessage(
          `Delete scenario "${node.data.name}"?`,
          { modal: true },
          "Delete"
        );
        if (confirm === "Delete") {
          await provider.deleteScenario(node.data.id);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.renameScenario",
      async (node: ScenarioNode) => {
        const newName = await vscode.window.showInputBox({
          prompt: "Enter new scenario name",
          value: node.data.name,
        });
        if (newName && newName.trim()) {
          await provider.renameScenario(node.data.id, newName.trim());
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.renameItem",
      async (node: ItemNode) => {
        if (!(node instanceof ItemNode)) {
          await vscode.window.showWarningMessage(
            "Rename Item is only available from an item context menu."
          );
          return;
        }
        const newName = await vscode.window.showInputBox({
          prompt: "Enter new item name",
          value: node.data.name,
        });
        if (newName && newName.trim()) {
          await provider.editItem(node.scenarioId, node.data.id, { name: newName.trim() });
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.addItem",
      async (node?: ScenarioNode | ItemNode) => {
        const target = await resolveAddTarget(provider, node);
        if (!target) {
          return;
        }

        const values = await showItemEditor({
          mode: "add",
          scenarioName: target.scenarioName,
          parentItemName: target.parentItemName,
        });
        if (!values) {
          return;
        }

        await provider.addItem(
          target.scenarioId,
          target.parentItemId,
          toScenarioItemData(values)
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.quickAddCurrentFile",
      async () => {
        const fileReference = getActiveWorkspaceFileReference();
        if (!fileReference) {
          await vscode.window.showWarningMessage(
            "Open a file from the current workspace, then try Quick Add Current File again."
          );
          return;
        }

        const target = await resolveQuickAddTarget(provider);
        if (!target) {
          return;
        }

        await provider.addItem(
          target.scenarioId,
          undefined,
          createQuickItemData({
            kind: "file",
            type: "file",
            filePath: fileReference.filePath,
            workspaceFolderUri: fileReference.workspaceFolderUri,
          })
        );

        await vscode.window.showInformationMessage(
          `Added "${fileReference.filePath}" to scenario "${target.scenarioName}".`
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.quickAddSelectionSymbol",
      async () => {
        const fileReference = getActiveWorkspaceFileReference();
        if (!fileReference) {
          await vscode.window.showWarningMessage(
            "Open a file from the current workspace, then try Quick Add Selected Symbol to Scenario again."
          );
          return;
        }

        const symbolName = getActiveSelectionText();
        if (!symbolName) {
          await vscode.window.showWarningMessage(
            "Select a single-line symbol-like identifier in the active editor, then try Quick Add Selected Symbol to Scenario again."
          );
          return;
        }

        const target = await resolveQuickAddTarget(provider);
        if (!target) {
          return;
        }

        await provider.addItem(
          target.scenarioId,
          undefined,
          createQuickItemData({
            kind: "symbol",
            type: "definition",
            filePath: fileReference.filePath,
            workspaceFolderUri: fileReference.workspaceFolderUri,
            name: symbolName,
          })
        );

        await vscode.window.showInformationMessage(
          `Added "${symbolName}" from "${fileReference.filePath}" to scenario "${target.scenarioName}".`
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.setQuickAddScenario",
      async (node?: ScenarioNode) => {
        if (node instanceof ScenarioNode) {
          await provider.setQuickAddScenario(node.data.id);
          await vscode.window.showInformationMessage(
            `Quick Add scenario set to "${node.data.name}".`
          );
          return;
        }

        const scenarios = provider.getScenarios();
        if (scenarios.length === 0) {
          await vscode.window.showInformationMessage(
            "Create a scenario before setting a quick add scenario."
          );
          return;
        }

        const scenario = await pickScenario(scenarios, {
          title: "Set Quick Add Scenario",
          placeHolder: "Select the default scenario for Quick Add",
        });
        if (!scenario) {
          return;
        }

        await provider.setQuickAddScenario(scenario.id);
        await vscode.window.showInformationMessage(
          `Quick Add scenario set to "${scenario.name}".`
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.clearQuickAddScenario",
      async (node?: ScenarioNode) => {
        const quickAddScenario = provider.getQuickAddScenario();
        if (!quickAddScenario) {
          await vscode.window.showInformationMessage(
            "No Quick Add scenario is currently set."
          );
          return;
        }

        await provider.setQuickAddScenario(undefined);
        await vscode.window.showInformationMessage(
          `Cleared Quick Add scenario "${node?.data.name ?? quickAddScenario.name}".`
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.editItem",
      async (node: ItemNode) => {
        if (!(node instanceof ItemNode)) {
          await vscode.window.showWarningMessage(
            "Edit Item requires selecting an item in the Code Scenario sidebar."
          );
          return;
        }
        const values = await showItemEditor({
          mode: "edit",
          scenarioName: getScenarioName(provider, node.scenarioId),
          itemName: node.data.name,
          initialValue: {
            filePath: node.data.filePath,
            symbolName: node.data.kind === "symbol" ? node.data.name : "",
            type: node.data.type,
            workspaceFolderUri: node.data.workspaceFolderUri,
            note: node.data.note,
          },
        });
        if (!values) {
          return;
        }

        await provider.editItem(
          node.scenarioId,
          node.data.id,
          toScenarioItemUpdates(values)
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.relinkItem",
      async (node: ItemNode) => {
        if (!(node instanceof ItemNode)) {
          await vscode.window.showWarningMessage(
            "Relink Item requires selecting a stale item in the Code Scenario sidebar."
          );
          return;
        }
        const values = await showItemEditor({
          mode: "edit",
          scenarioName: getScenarioName(provider, node.scenarioId),
          itemName: node.data.name,
          initialValue: {
            filePath: node.data.filePath,
            symbolName: node.data.kind === "symbol" ? node.data.name : "",
            type: node.data.type,
            workspaceFolderUri: node.data.workspaceFolderUri,
            note: node.data.note,
          },
        });
        if (!values) {
          return;
        }

        await provider.editItem(
          node.scenarioId,
          node.data.id,
          toScenarioItemUpdates(values)
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.moveItem",
      async (node: ItemNode) => {
        if (!(node instanceof ItemNode)) {
          await vscode.window.showWarningMessage(
            "Move Item is only available from an item context menu."
          );
          return;
        }

        const destination = await resolveMoveDestination(provider, node);
        if (!destination) {
          return;
        }

        const result = await provider.moveItem(
          node.scenarioId,
          node.data.id,
          destination.scenarioId,
          destination.parentItemId
        );

        if (!result.ok) {
          await vscode.window.showWarningMessage(result.reason);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.copyItem",
      async (node: ItemNode) => {
        if (!(node instanceof ItemNode)) {
          await vscode.window.showWarningMessage(
            "Copy Item is only available from an item context menu."
          );
          return;
        }

        const destination = await resolveCopyDestination(provider, node);
        if (!destination) {
          return;
        }

        const result = await provider.copyItem(
          node.scenarioId,
          node.data.id,
          destination.scenarioId,
          destination.parentItemId
        );

        if (!result.ok) {
          await vscode.window.showWarningMessage(result.reason);
          return;
        }

        await revealDroppedItem(provider, treeView, destination.scenarioId, result.itemId);
        await vscode.window.showInformationMessage(
          `Copied "${node.data.name}" to ${destination.label}.`
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.deleteItem",
      async (node: ItemNode) => {
        if (!(node instanceof ItemNode)) {
          await vscode.window.showWarningMessage(
            "Delete Item requires selecting an item in the Code Scenario sidebar."
          );
          return;
        }
        const confirm = await vscode.window.showWarningMessage(
          `Delete item "${node.data.name}"?`,
          { modal: true },
          "Delete"
        );
        if (confirm === "Delete") {
          await provider.deleteItem(node.scenarioId, node.data.id);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("code-scenario.refresh", () => {
      provider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.findScenarioItem",
      async () => {
        const matches = findScenarioItemMatches(provider.getScenarios());
        if (matches.length === 0) {
          await vscode.window.showInformationMessage(
            "No scenario items are available to search."
          );
          return;
        }

        const selected = await vscode.window.showQuickPick(
          matches.map((match) => ({
            label: match.node.data.name,
            description: match.ancestorPath
              ? `${match.scenarioName} · ${match.ancestorPath}`
              : match.scenarioName,
            detail: formatScenarioItemSearchDetail(match),
            match,
          })),
          {
            title: "Find Scenario Item",
            placeHolder: "Type an item label, scenario name, or file path",
            matchOnDescription: true,
            matchOnDetail: true,
          }
        );

        if (!selected) {
          return;
        }

        await revealItemNode(treeView, selected.match.node);
        await vscode.commands.executeCommand("code-scenario.openItem", selected.match.node);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.revealActiveFileInTree",
      async () => {
        const fileReference = getActiveWorkspaceFileReference();
        if (!fileReference) {
          // Untitled or non-workspace file — nothing to reveal
          return;
        }

        const matches = findFileMatches(
          provider.getScenarios(),
          fileReference.filePath,
          fileReference.workspaceFolderUri
        );

        if (matches.length === 0) {
          await vscode.window.showInformationMessage(
            `No scenario items match "${fileReference.filePath}".`
          );
          return;
        }

        if (matches.length === 1) {
          await treeView.reveal(matches[0].node, {
            select: true,
            focus: false,
            expand: true,
          });
          return;
        }

        // Multiple matches — let the user choose
        const selected = await vscode.window.showQuickPick(
          matches.map((match) => ({
            label: match.node.data.name,
            description: `${match.scenarioName} · ${match.node.data.filePath}`,
            detail: `Type: ${match.node.data.type}`,
            match,
          })),
          {
            placeHolder: `Multiple scenario items match "${fileReference.filePath}" — select one to reveal`,
            matchOnDescription: true,
            matchOnDetail: true,
          }
        );

        if (selected) {
          await treeView.reveal(selected.match.node, {
            select: true,
            focus: false,
            expand: true,
          });
        }
      }
    )
  );

  // ── Auto-reveal on active editor change ───────────────────────

  let autoRevealTimer: ReturnType<typeof setTimeout> | undefined;

  context.subscriptions.push({
    dispose(): void {
      if (autoRevealTimer !== undefined) {
        clearTimeout(autoRevealTimer);
        autoRevealTimer = undefined;
      }
    },
  });

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      const config = vscode.workspace.getConfiguration("codeScenario");
      if (!config.get<boolean>("autoRevealInTree", false)) {
        return;
      }

      if (autoRevealTimer !== undefined) {
        clearTimeout(autoRevealTimer);
      }

      autoRevealTimer = setTimeout(() => {
        autoRevealTimer = undefined;

        const fileReference = getActiveWorkspaceFileReference();
        if (!fileReference) {
          return;
        }

        const matches = findFileMatches(
          provider.getScenarios(),
          fileReference.filePath,
          fileReference.workspaceFolderUri
        );

        if (matches.length === 0) {
          return; // No toast in auto-reveal mode
        }

        void treeView.reveal(matches[0].node, {
          select: true,
          focus: false,
          expand: true,
        });
      }, 300);
    })
  );

  // ── Auto-heal renamed / moved files ──────────────────────────

  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles(async (event) => {
      await provider.handleRenameFiles(event.files);
    })
  );

  // ── Open item in editor ───────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.openItem",
      async (node: ItemNode) => {
        if (!(node instanceof ItemNode)) {
          await vscode.window.showWarningMessage(
            "Open Item is only available from an item context menu."
          );
          return;
        }
        const location = resolveScenarioItemLocation(node.data);
        if (location.status === "missing") {
          await showOpenItemWarning(
            node,
            formatLocationMessage(location)
          );
          return;
        }

        if (location.status === "ambiguous") {
          await showOpenItemWarning(
            node,
            formatLocationMessage(location)
          );
          return;
        }

        const uri = vscode.Uri.file(location.absolutePath);

        // Resolve line number
        const lineResult = await resolveItemLine(node.data, location.absolutePath);

        if (!lineResult.usedFallback) {
          await provider.editItem(node.scenarioId, node.data.id, { line: lineResult.line });
        }

        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document, {
          preview: false,
          preserveFocus: false,
        });

        // Move cursor to the resolved line
        const position = new vscode.Position(Math.max(0, lineResult.line), 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );

        if (lineResult.usedFallback) {
          await vscode.window.showWarningMessage(
            `Opened "${node.data.name}" using a fallback location because the symbol could not be resolved in "${node.data.filePath}".`
          );
        }
      }
    )
  );
}

export function deactivate(): void {}

function getScenarioName(provider: ScenarioProvider, scenarioId: string): string {
  return provider.getScenarioById(scenarioId)?.name ?? "Scenario";
}

async function resolveAddTarget(
  provider: ScenarioProvider,
  node?: ScenarioNode | ItemNode
): Promise<{
  scenarioId: string;
  scenarioName: string;
  parentItemId?: string;
  parentItemName?: string;
} | undefined> {
  if (node) {
    if (node.kind === "scenario") {
      return {
        scenarioId: node.data.id,
        scenarioName: node.data.name,
      };
    }

    return {
      scenarioId: node.scenarioId,
      scenarioName: getScenarioName(provider, node.scenarioId),
      parentItemId: node.data.id,
      parentItemName: node.data.name,
    };
  }

  const scenarios = provider.getScenarios();
  if (scenarios.length === 0) {
    await vscode.window.showInformationMessage(
      "Create a scenario before adding items."
    );
    return undefined;
  }

  if (scenarios.length === 1) {
    return {
      scenarioId: scenarios[0].id,
      scenarioName: scenarios[0].name,
    };
  }

  const selectedScenario = await pickScenario(scenarios, {
    placeHolder: "Select a scenario for the new item",
  });

  if (!selectedScenario) {
    return undefined;
  }

  return {
    scenarioId: selectedScenario.id,
    scenarioName: selectedScenario.name,
  };
}

async function resolveQuickAddTarget(
  provider: ScenarioProvider
): Promise<{
  scenarioId: string;
  scenarioName: string;
} | undefined> {
  const scenarios = provider.getScenarios();
  if (scenarios.length === 0) {
    await vscode.window.showInformationMessage(
      "Create a scenario before adding items."
    );
    return undefined;
  }

  if (scenarios.length === 1) {
    return {
      scenarioId: scenarios[0].id,
      scenarioName: scenarios[0].name,
    };
  }

  const rememberedScenario = provider.getQuickAddScenario();
  if (rememberedScenario) {
    return {
      scenarioId: rememberedScenario.id,
      scenarioName: rememberedScenario.name,
    };
  }

  const selectedScenario = await pickScenario(scenarios, {
    placeHolder: "Select a scenario for Quick Add",
  });
  if (!selectedScenario) {
    return undefined;
  }

  await provider.setQuickAddScenario(selectedScenario.id);
  return {
    scenarioId: selectedScenario.id,
    scenarioName: selectedScenario.name,
  };
}

async function pickScenario(
  scenarios: ScenarioData[],
  options: {
    title?: string;
    placeHolder: string;
  }
): Promise<ScenarioData | undefined> {
  const selectedScenario = await vscode.window.showQuickPick(
    scenarios.map((scenario) => ({
      label: scenario.name,
      description: `${scenario.items.length} item${scenario.items.length === 1 ? "" : "s"}`,
      scenario,
    })),
    options
  );

  return selectedScenario?.scenario;
}

async function resolveMoveDestination(
  provider: ScenarioProvider,
  node: ItemNode
): Promise<MoveItemDestination | undefined> {
  const destinations = provider.getMoveItemDestinations(node.scenarioId, node.data.id);
  if (destinations.length === 0) {
    await vscode.window.showInformationMessage(
      "No valid destination is available for this item."
    );
    return undefined;
  }

  return vscode.window.showQuickPick(destinations, {
    title: "Move Item",
    placeHolder: `Select a destination for "${node.data.name}"`,
    matchOnDescription: true,
    matchOnDetail: true,
  });
}

async function resolveCopyDestination(
  provider: ScenarioProvider,
  node: ItemNode
): Promise<MoveItemDestination | undefined> {
  const destinations = provider.getCopyItemDestinations(node.scenarioId, node.data.id);
  if (destinations.length === 0) {
    await vscode.window.showInformationMessage(
      "No valid destination is available for this item."
    );
    return undefined;
  }

  return vscode.window.showQuickPick(destinations, {
    title: "Copy Item",
    placeHolder: `Select a destination for a copy of "${node.data.name}"`,
    matchOnDescription: true,
    matchOnDetail: true,
  });
}

function toScenarioItemData(
  values: ItemEditorValues
): Omit<ScenarioItemData, "id" | "children"> {
  const filePath = values.filePath.trim();
  const symbolName = values.symbolName.trim();
  const note = values.note?.trim() || undefined;
  const base = createQuickItemData({
    kind: symbolName ? "symbol" : "file",
    type: values.type,
    filePath,
    ...(values.workspaceFolderUri
      ? {
        workspaceFolderUri: values.workspaceFolderUri,
      }
      : {}),
    ...(symbolName ? { name: symbolName } : {}),
  });
  return note !== undefined ? { ...base, note } : base;
}

function toScenarioItemUpdates(
  values: ItemEditorValues
): Partial<Omit<ScenarioItemData, "id" | "children">> {
  const note = values.note?.trim() || undefined;
  return {
    ...toScenarioItemData(values),
    workspaceFolderUri: values.workspaceFolderUri,
    note, // explicitly included (possibly undefined) so editItem can clear a removed note
  };
}

function createQuickItemData(options: {
  kind: ScenarioItemData["kind"];
  type: ScenarioItemData["type"];
  filePath: string;
  workspaceFolderUri?: string;
  name?: string;
}): Omit<ScenarioItemData, "id" | "children"> {
  const filePath = options.filePath.trim();
  const name = (options.name ?? filePath).trim();

  return {
    name,
    kind: options.kind,
    type: options.type,
    filePath,
    ...(options.workspaceFolderUri !== undefined
      ? { workspaceFolderUri: options.workspaceFolderUri }
      : {}),
    line: -1,
  };
}

async function showOpenItemWarning(
  node: ItemNode,
  message: string
): Promise<void> {
  const action = await vscode.window.showWarningMessage(message, "Relink Item");
  if (action === "Relink Item") {
    await vscode.commands.executeCommand("code-scenario.relinkItem", node);
  }
}

function formatLocationMessage(
  location: Exclude<ScenarioItemLocationResolution, {
    status: "resolved";
  }>
): string {
  if (location.status === "ambiguous") {
    const workspaceNames = location.workspaceFolders.map((folder) => folder.name).join(", ");
    return `Source file "${location.filePath}" matches multiple workspace folders (${workspaceNames}). Edit the item to choose the exact file.`;
  }

  if (location.reason === "noWorkspaceFolder") {
    return `Source file "${location.filePath}" could not be resolved because no workspace folder is open. Edit the item to choose an available file.`;
  }

  if (location.reason === "workspaceFolderMissing") {
    return `Saved workspace folder for "${location.filePath}" is no longer available. Edit the item to choose the correct file.`;
  }

  return `Source file "${location.filePath}" was not found. Edit the item to choose the correct file.`;
}

// ── DnD reveal helper ─────────────────────────────────────────

async function revealDroppedItem(
  provider: ScenarioProvider,
  treeView: vscode.TreeView<TreeNode>,
  scenarioId: string,
  itemId: string
): Promise<void> {
  const data = provider.findItem(scenarioId, itemId);
  if (!data) { return; }
  await revealItemNode(treeView, new ItemNode(data, scenarioId));
}

// ── Reveal helpers ────────────────────────────────────────────

interface FileMatch {
  node: ItemNode;
  scenarioName: string;
}

interface ScenarioItemMatch {
  node: ItemNode;
  scenarioName: string;
  ancestorPath?: string;
  workspaceFolderName?: string;
}

function findFileMatches(
  scenarios: ScenarioData[],
  filePath: string,
  workspaceFolderUri: string
): FileMatch[] {
  const results: FileMatch[] = [];
  for (const scenario of scenarios) {
    collectFileMatchesFromItems(
      scenario.items,
      scenario.id,
      scenario.name,
      filePath,
      workspaceFolderUri,
      results
    );
  }
  return results;
}

function collectFileMatchesFromItems(
  items: ScenarioItemData[],
  scenarioId: string,
  scenarioName: string,
  filePath: string,
  workspaceFolderUri: string,
  results: FileMatch[]
): void {
  for (const item of items) {
    const pathMatches = item.filePath === filePath;
    const folderMatches =
      item.workspaceFolderUri === undefined ||
      item.workspaceFolderUri === workspaceFolderUri;
    if (pathMatches && folderMatches) {
      results.push({ node: new ItemNode(item, scenarioId), scenarioName });
    }
    collectFileMatchesFromItems(
      item.children,
      scenarioId,
      scenarioName,
      filePath,
      workspaceFolderUri,
      results
    );
  }
}

function findScenarioItemMatches(scenarios: ScenarioData[]): ScenarioItemMatch[] {
  const results: ScenarioItemMatch[] = [];
  for (const scenario of scenarios) {
    collectScenarioItemMatchesFromItems(
      scenario.items,
      scenario.id,
      scenario.name,
      results
    );
  }
  return results;
}

function collectScenarioItemMatchesFromItems(
  items: ScenarioItemData[],
  scenarioId: string,
  scenarioName: string,
  results: ScenarioItemMatch[],
  ancestorNames: string[] = []
): void {
  for (const item of items) {
    results.push({
      node: new ItemNode(item, scenarioId),
      scenarioName,
      ancestorPath: ancestorNames.length > 0 ? ancestorNames.join(" › ") : undefined,
      workspaceFolderName: getWorkspaceFolderName(item.workspaceFolderUri),
    });
    collectScenarioItemMatchesFromItems(
      item.children,
      scenarioId,
      scenarioName,
      results,
      [...ancestorNames, item.name]
    );
  }
}

function getWorkspaceFolderName(workspaceFolderUri: string | undefined): string | undefined {
  if (!workspaceFolderUri) {
    return undefined;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(workspaceFolderUri));
  return workspaceFolder?.name;
}

function formatScenarioItemSearchDetail(match: ScenarioItemMatch): string {
  const detailParts = [match.node.data.filePath];
  if (match.workspaceFolderName) {
    detailParts.push(match.workspaceFolderName);
  }
  detailParts.push(`Type: ${match.node.data.type}`);
  return detailParts.join(" · ");
}

async function revealItemNode(
  treeView: vscode.TreeView<TreeNode>,
  node: ItemNode
): Promise<void> {
  try {
    await treeView.reveal(node, {
      select: true,
      focus: false,
      expand: true,
    });
  } catch {
    // reveal can throw if the view is not visible; swallow silently
  }
}
