import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { ScenarioItemData } from "./scenarioModel";

export interface WorkspaceFileReference {
  filePath: string;
  workspaceFolderUri: string;
}

export type ScenarioItemLocationResolution =
  | {
    status: "resolved";
    absolutePath: string;
    workspaceFolder?: vscode.WorkspaceFolder;
  }
  | {
    status: "missing";
    filePath: string;
    absolutePath?: string;
    workspaceFolder?: vscode.WorkspaceFolder;
    reason: "noWorkspaceFolder" | "workspaceFolderMissing" | "fileMissing";
  }
  | {
    status: "ambiguous";
    filePath: string;
    workspaceFolders: vscode.WorkspaceFolder[];
  };

export interface ValidatedWorkspaceFileInput {
  filePath: string;
  workspaceFolderUri?: string;
}

export function validateWorkspaceFileUri(
  fileUri: vscode.Uri
): { value?: ValidatedWorkspaceFileInput; error?: string } {
  if (fileUri.scheme !== "file") {
    return {
      error: "Selected file must be on the local filesystem.",
    };
  }

  const workspaceFolderUri = vscode.workspace.getWorkspaceFolder(fileUri)?.uri.toString();
  return validateWorkspaceFileInput(fileUri.fsPath, workspaceFolderUri);
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
): ScenarioItemLocationResolution {
  if (path.isAbsolute(item.filePath)) {
    const absolutePath = path.normalize(item.filePath);
    const absoluteUri = vscode.Uri.file(absolutePath);
    if (!isExistingFile(absolutePath)) {
      return {
        status: "missing",
        filePath: item.filePath,
        absolutePath,
        reason: "fileMissing",
      };
    }

    return {
      status: "resolved",
      absolutePath,
      workspaceFolder: vscode.workspace.getWorkspaceFolder(absoluteUri),
    };
  }

  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (workspaceFolders.length === 0) {
    return {
      status: "missing",
      filePath: item.filePath,
      reason: "noWorkspaceFolder",
    };
  }

  if (item.workspaceFolderUri) {
    const workspaceFolder = workspaceFolders.find(
      (folder) => folder.uri.toString() === item.workspaceFolderUri
    );
    if (!workspaceFolder) {
      return {
        status: "missing",
        filePath: item.filePath,
        reason: "workspaceFolderMissing",
      };
    }

    const absolutePath = path.join(workspaceFolder.uri.fsPath, item.filePath);
    if (!isExistingFile(absolutePath)) {
      return {
        status: "missing",
        filePath: item.filePath,
        absolutePath,
        workspaceFolder,
        reason: "fileMissing",
      };
    }

    return {
      status: "resolved",
      absolutePath,
      workspaceFolder,
    };
  }

  const matchingFolders = workspaceFolders.filter((folder) =>
    isExistingFile(path.join(folder.uri.fsPath, item.filePath))
  );

  if (matchingFolders.length === 1) {
    return {
      status: "resolved",
      absolutePath: path.join(matchingFolders[0].uri.fsPath, item.filePath),
      workspaceFolder: matchingFolders[0],
    };
  }

  if (matchingFolders.length > 1) {
    return {
      status: "ambiguous",
      filePath: item.filePath,
      workspaceFolders: matchingFolders,
    };
  }

  return {
    status: "missing",
    filePath: item.filePath,
    reason: "fileMissing",
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

function isExistingFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}
