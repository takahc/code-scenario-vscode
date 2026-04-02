import * as vscode from "vscode";
import { ScenarioItemData } from "./scenarioModel";

export interface ResolvedItemLine {
  line: number;
  usedFallback: boolean;
}

/**
 * Resolves the line number of a scenario item in its file.
 * For file-kind items, returns line 0.
 * For symbol-kind items, uses VS Code's document symbol provider.
 */
export async function resolveItemLine(
  item: ScenarioItemData,
  absolutePath: string
): Promise<ResolvedItemLine> {
  if (item.kind === "file") {
    return {
      line: 0,
      usedFallback: false,
    };
  }

  const uri = vscode.Uri.file(absolutePath);

  try {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      "vscode.executeDocumentSymbolProvider",
      uri
    );

    if (!symbols) {
      return fallbackLine(item);
    }

    const found = findSymbol(symbols, item.name);
    if (found !== undefined) {
      return {
        line: found,
        usedFallback: false,
      };
    }
  } catch {
    // Fallback to cached line
  }

  return fallbackLine(item);
}

function findSymbol(
  symbols: vscode.DocumentSymbol[],
  name: string
): number | undefined {
  for (const sym of symbols) {
    if (sym.name === name || sym.name.startsWith(name + "(") || sym.name.startsWith(name + " ")) {
      return sym.range.start.line;
    }
    if (sym.children && sym.children.length > 0) {
      const found = findSymbol(sym.children, name);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
}

function fallbackLine(item: ScenarioItemData): ResolvedItemLine {
  return {
    line: item.line >= 0 ? item.line : 0,
    usedFallback: true,
  };
}
