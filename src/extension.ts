import * as vscode from "vscode";
import { ScenarioProvider, ScenarioNode, ItemNode } from "./scenarioProvider";
import { ScenarioItemData } from "./scenarioModel";
import { ItemEditorValues, showItemEditor } from "./itemEditorPanel";
import { getActiveSelectionText } from "./editorContext";
import { resolveItemLine } from "./symbolResolver";
import { getActiveWorkspaceFileReference, resolveScenarioItemLocation } from "./workspacePaths";

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
        if (!location) {
          vscode.window.showErrorMessage("No workspace folder is open.");
          return;
        }

        const uri = vscode.Uri.file(location.absolutePath);

        // Resolve line number
        const line = await resolveItemLine(node.data, location.absolutePath);

        // Update cached line
        await provider.editItem(node.scenarioId, node.data.id, { line });

        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document, {
          preview: false,
          preserveFocus: false,
        });

        // Move cursor to the resolved line
        const position = new vscode.Position(Math.max(0, line), 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
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
