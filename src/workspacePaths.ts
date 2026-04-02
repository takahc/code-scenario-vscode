import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { ScenarioItemData } from "./scenarioModel";

export interface WorkspaceFileReference {
  filePath: string;
  workspaceFolderUri: string;
}

export interface ResolvedItemLocation {
  absolutePath: string;
  workspaceFolder?: vscode.WorkspaceFolder;
}

export function getActiveWorkspaceFileReference(): WorkspaceFileReference | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  if (!workspaceFolder) {
    return undefined;
  }

  return {
    filePath: vscode.workspace.asRelativePath(editor.document.uri, false),
    workspaceFolderUri: workspaceFolder.uri.toString(),
  };
}

export function resolveScenarioItemLocation(
  item: Pick<ScenarioItemData, "filePath" | "workspaceFolderUri">
): ResolvedItemLocation | undefined {
  if (path.isAbsolute(item.filePath)) {
    const absoluteUri = vscode.Uri.file(item.filePath);
    return {
      absolutePath: item.filePath,
      workspaceFolder: vscode.workspace.getWorkspaceFolder(absoluteUri),
    };
  }

  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (workspaceFolders.length === 0) {
    return undefined;
  }

  if (item.workspaceFolderUri) {
    const workspaceFolder = workspaceFolders.find(
      (folder) => folder.uri.toString() === item.workspaceFolderUri
    );
    if (workspaceFolder) {
      return {
        absolutePath: path.join(workspaceFolder.uri.fsPath, item.filePath),
        workspaceFolder,
      };
    }
  }

  const matchingFolders = workspaceFolders.filter((folder) =>
    fs.existsSync(path.join(folder.uri.fsPath, item.filePath))
  );

  if (matchingFolders.length === 1) {
    return {
      absolutePath: path.join(matchingFolders[0].uri.fsPath, item.filePath),
      workspaceFolder: matchingFolders[0],
    };
  }

  return {
    absolutePath: path.join(workspaceFolders[0].uri.fsPath, item.filePath),
    workspaceFolder: workspaceFolders[0],
  };
}
