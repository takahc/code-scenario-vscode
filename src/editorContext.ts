import * as vscode from "vscode";
import { getActiveWorkspaceFileReference } from "./workspacePaths";

export function getActiveWorkspaceFilePath(): string | undefined {
  return getActiveWorkspaceFileReference()?.filePath;
}

export function getActiveSelectionText(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return undefined;
  }

  const selectedText = editor.document.getText(editor.selection).trim();
  if (!selectedText || selectedText.includes("\n")) {
    return undefined;
  }

  return isSymbolLikeSelection(selectedText) ? selectedText : undefined;
}

function isSymbolLikeSelection(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value);
}
