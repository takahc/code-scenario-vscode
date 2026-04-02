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

export interface ValidatedWorkspaceFileInput {
  filePath: string;
  workspaceFolderUri?: string;
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

export function validateWorkspaceFileInput(
  inputFilePath: string,
  preferredWorkspaceFolderUri?: string
): { value?: ValidatedWorkspaceFileInput; error?: string } {
  const trimmedFilePath = inputFilePath.trim();
  if (!trimmedFilePath) {
    return {
      error: "Source file is required. Enter a workspace-relative file path or use Active File.",
    };
  }

  if (path.isAbsolute(trimmedFilePath)) {
    const absolutePath = path.normalize(trimmedFilePath);
    if (!fs.existsSync(absolutePath)) {
      return {
        error: `Source file "${trimmedFilePath}" was not found.`,
      };
    }

    if (!fs.statSync(absolutePath).isFile()) {
      return {
        error: `Source file "${trimmedFilePath}" must point to a file, not a folder.`,
      };
    }

    const fileUri = vscode.Uri.file(absolutePath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) {
      return {
        value: {
          filePath: absolutePath,
        },
      };
    }

    return {
      value: {
        filePath: vscode.workspace.asRelativePath(fileUri, false),
        workspaceFolderUri: workspaceFolder.uri.toString(),
      },
    };
  }

  const filePath = normalizeRelativeFilePath(trimmedFilePath);
  if (!filePath) {
    return {
      error: "Source file is required. Enter a workspace-relative file path or use Active File.",
    };
  }

  if (filePath === ".." || filePath.startsWith("../")) {
    return {
      error: "Source file must stay inside the current workspace. Remove leading ../ segments.",
    };
  }

  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (workspaceFolders.length === 0) {
    return {
      value: {
        filePath,
      },
    };
  }

  const matchingFolders = workspaceFolders.filter((folder) =>
    fs.existsSync(path.join(folder.uri.fsPath, filePath))
    && fs.statSync(path.join(folder.uri.fsPath, filePath)).isFile()
  );

  if (matchingFolders.length === 0) {
    return {
      error: `Source file "${filePath}" was not found in the current workspace. Use Active File or enter a path to an existing file.`,
    };
  }

  const preferredWorkspaceFolder = preferredWorkspaceFolderUri
    ? workspaceFolders.find((folder) => folder.uri.toString() === preferredWorkspaceFolderUri)
    : undefined;

  if (preferredWorkspaceFolder) {
    const preferredAbsolutePath = path.join(preferredWorkspaceFolder.uri.fsPath, filePath);
    if (
      fs.existsSync(preferredAbsolutePath)
      && fs.statSync(preferredAbsolutePath).isFile()
    ) {
      return {
        value: {
          filePath,
          workspaceFolderUri: preferredWorkspaceFolder.uri.toString(),
        },
      };
    }
  }

  if (matchingFolders.length > 1) {
    return {
      error: `Source file "${filePath}" matches multiple workspace folders. Use Active File to choose the exact file.`,
    };
  }

  return {
    value: {
      filePath,
      workspaceFolderUri: matchingFolders[0].uri.toString(),
    },
  };
}

function normalizeRelativeFilePath(filePath: string): string {
  const normalized = path.posix.normalize(filePath.replace(/\\/g, "/"));
  return normalized === "." ? "" : normalized;
}
