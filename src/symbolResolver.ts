import * as vscode from "vscode";
import * as path from "path";
import { ScenarioItemData } from "./scenarioModel";

/**
 * Resolves the line number of a scenario item in its file.
 * For file-kind items, returns line 0.
 * For symbol-kind items, uses VS Code's document symbol provider.
 */
export async function resolveItemLine(
  item: ScenarioItemData,
  workspaceRoot: string
): Promise<number> {
  if (item.kind === "file") {
    return 0;
  }

  const absolutePath = path.isAbsolute(item.filePath)
    ? item.filePath
    : path.join(workspaceRoot, item.filePath);

  const uri = vscode.Uri.file(absolutePath);

  try {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      "vscode.executeDocumentSymbolProvider",
      uri
    );

    if (!symbols) {
      return item.line >= 0 ? item.line : 0;
    }

    const found = findSymbol(symbols, item.name, item.type);
    if (found !== undefined) {
      return found;
    }
  } catch {
    // Fallback to cached line
  }

  return item.line >= 0 ? item.line : 0;
}

function findSymbol(
  symbols: vscode.DocumentSymbol[],
  name: string,
  type: string
): number | undefined {
  for (const sym of symbols) {
    if (sym.name === name || sym.name.startsWith(name + "(") || sym.name.startsWith(name + " ")) {
      return sym.range.start.line;
    }
    if (sym.children && sym.children.length > 0) {
      const found = findSymbol(sym.children, name, type);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
}
