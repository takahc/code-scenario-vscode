import * as vscode from "vscode";
import * as path from "path";
import { ScenarioProvider, ScenarioNode, ItemNode } from "./scenarioProvider";
import { ScenarioItemData } from "./scenarioModel";
import { ItemEditorValues, showItemEditor } from "./itemEditorPanel";
import { resolveItemLine } from "./symbolResolver";

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
          },
        });
        if (!values) {
          return;
        }

        await provider.editItem(
          node.scenarioId,
          node.data.id,
          toScenarioItemData(values)
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
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
          vscode.window.showErrorMessage("No workspace folder is open.");
          return;
        }

        const absolutePath = path.isAbsolute(node.data.filePath)
          ? node.data.filePath
          : path.join(workspaceRoot, node.data.filePath);

        const uri = vscode.Uri.file(absolutePath);

        // Resolve line number
        const line = await resolveItemLine(node.data, workspaceRoot);

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

function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  return undefined;
}

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
  const kind = symbolName ? "symbol" : "file";

  return {
    name: kind === "symbol" ? symbolName : filePath,
    kind,
    type: values.type,
    filePath,
    line: -1,
  };
}
