import * as vscode from "vscode";
import * as path from "path";
import { ScenarioProvider, ScenarioNode, ItemNode } from "./scenarioProvider";
import { ItemType } from "./scenarioModel";
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
      async (node: ScenarioNode | ItemNode) => {
        const scenarioId =
          node.kind === "scenario" ? node.data.id : node.scenarioId;
        const parentItemId =
          node.kind === "item" ? node.data.id : undefined;

        // Ask for file path
        const filePath = await vscode.window.showInputBox({
          prompt: "File path (relative to workspace root)",
          placeHolder: "src/main.c",
        });
        if (!filePath || !filePath.trim()) { return; }

        // Ask for symbol name or leave empty for file-level entry
        const symbolName = await vscode.window.showInputBox({
          prompt: "Symbol name (leave empty to reference the file itself)",
          placeHolder: "usb_init",
        });

        // Ask for type
        const typeChoice = await vscode.window.showQuickPick(
          ["definition", "declare", "call", "reference", "codeblock", "file"],
          { placeHolder: "Select item type" }
        );
        if (!typeChoice) { return; }

        const kind = !symbolName || !symbolName.trim() ? "file" : "symbol";
        const name = kind === "file" ? filePath.trim() : symbolName!.trim();

        await provider.addItem(scenarioId, parentItemId, {
          name,
          kind,
          type: typeChoice as ItemType,
          filePath: filePath.trim(),
          line: -1,
        });
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "code-scenario.editItem",
      async (node: ItemNode) => {
        const filePath = await vscode.window.showInputBox({
          prompt: "File path (relative to workspace root)",
          value: node.data.filePath,
        });
        if (!filePath || !filePath.trim()) { return; }

        const symbolName = await vscode.window.showInputBox({
          prompt: "Symbol name (leave empty for file-level)",
          value: node.data.kind === "symbol" ? node.data.name : "",
        });

        const typeChoice = await vscode.window.showQuickPick(
          ["definition", "declare", "call", "reference", "codeblock", "file"],
          {
            placeHolder: "Select item type",
          }
        );
        if (!typeChoice) { return; }

        const kind = !symbolName || !symbolName.trim() ? "file" : "symbol";
        const name = kind === "file" ? filePath.trim() : symbolName!.trim();

        await provider.editItem(node.scenarioId, node.data.id, {
          name,
          kind,
          type: typeChoice as ItemType,
          filePath: filePath.trim(),
          line: -1,
        });
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
