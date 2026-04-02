import * as vscode from "vscode";
import * as path from "path";
import { ScenarioItemData } from "./scenarioModel";

export interface ResolvedItemLine {
  line: number;
  usedFallback: boolean;
  fallbackSource?: "cached" | "default";
}

export async function resolveItemLine(
  item: ScenarioItemData,
  workspaceRoot: string
): Promise<ResolvedItemLine> {
  if (item.kind === "file") {
    return {
      line: 0,
      usedFallback: false,
    };
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
      return createFallbackResult(item);
    }

    const found = findSymbol(symbols, item.name);
    if (found !== undefined) {
      return {
        line: found,
        usedFallback: false,
      };
    }
  } catch {
    return createFallbackResult(item);
  }

  return createFallbackResult(item);
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

function createFallbackResult(item: ScenarioItemData): ResolvedItemLine {
  if (item.line >= 0) {
    return {
      line: item.line,
      usedFallback: true,
      fallbackSource: "cached",
    };
  }

  return {
    line: 0,
    usedFallback: true,
    fallbackSource: "default",
  };
}
