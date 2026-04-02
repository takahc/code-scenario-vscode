import * as vscode from "vscode";
import {
  ScenarioProvider,
  ScenarioNode,
  ItemNode,
  MoveItemDestination,
} from "./scenarioProvider";
import { ScenarioItemData } from "./scenarioModel";
import { ItemEditorValues, showItemEditor } from "./itemEditorPanel";
import { getActiveSelectionText } from "./editorContext";
import { resolveItemLine } from "./symbolResolver";
import {
  getActiveWorkspaceFileReference,
  resolveScenarioItemLocation,
  ScenarioItemLocationResolution,
} from "./workspacePaths";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ScenarioProvider(context);

  const treeView = vscode.window.createTreeView("codeScenarioView", {
    treeDataProvider: provider,
    showCollapseAll: true,
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

        const target = await resolveAddTarget(provider);
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

        const target = await resolveAddTarget(provider);
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
      "code-scenario.editItem",
      async (node: ItemNode) => {
        const values = await showItemEditor({
          mode: "edit",
          scenarioName: getScenarioName(provider, node.scenarioId),
          itemName: node.data.name,
          initialValue: {
            filePath: node.data.filePath,
            symbolName: node.data.kind === "symbol" ? node.data.name : "",
            type: node.data.type,
            workspaceFolderUri: node.data.workspaceFolderUri,
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
      "code-scenario.deleteItem",
      async (node: ItemNode) => {
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

  // ── Open item in editor ───────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.openItem",
      async (node: ItemNode) => {
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
  return provider.getScenarios().find((scenario) => scenario.id === scenarioId)?.name ?? "Scenario";
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

  const selectedScenario = await vscode.window.showQuickPick(
    scenarios.map((scenario) => ({
      label: scenario.name,
      description: `${scenario.items.length} item${scenario.items.length === 1 ? "" : "s"}`,
      scenario,
    })),
    {
      placeHolder: "Select a scenario for the new item",
    }
  );

  if (!selectedScenario) {
    return undefined;
  }

  return {
    scenarioId: selectedScenario.scenario.id,
    scenarioName: selectedScenario.scenario.name,
  };
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

function toScenarioItemData(
  values: ItemEditorValues
): Omit<ScenarioItemData, "id" | "children"> {
  const filePath = values.filePath.trim();
  const symbolName = values.symbolName.trim();
  return createQuickItemData({
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
}

function toScenarioItemUpdates(
  values: ItemEditorValues
): Partial<Omit<ScenarioItemData, "id" | "children">> {
  return {
    ...toScenarioItemData(values),
    workspaceFolderUri: values.workspaceFolderUri,
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
  const action = await vscode.window.showWarningMessage(message, "Edit Item");
  if (action === "Edit Item") {
    await vscode.commands.executeCommand("code-scenario.editItem", node);
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
