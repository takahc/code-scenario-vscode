import * as vscode from "vscode";
import { ITEM_TYPES, ItemType } from "./scenarioModel";

export interface ItemEditorValues {
  filePath: string;
  symbolName: string;
  type: ItemType;
}

interface ItemEditorOptions {
  mode: "add" | "edit";
  scenarioName: string;
  parentItemName?: string;
  itemName?: string;
  initialValue?: Partial<ItemEditorValues>;
}

type WebviewMessage =
  | { type: "submit"; value: ItemEditorValues }
  | { type: "cancel" }
  | { type: "fillActiveFile" }
  | { type: "fillSelection" };

export async function showItemEditor(
  options: ItemEditorOptions
): Promise<ItemEditorValues | undefined> {
  const initialValue = buildInitialValues(options.initialValue);
  const panel = vscode.window.createWebviewPanel(
    "codeScenarioItemEditor",
    options.mode === "add" ? "Add Scenario Item" : "Edit Scenario Item",
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getWebviewHtml(panel.webview, options, initialValue);

  return new Promise<ItemEditorValues | undefined>((resolve) => {
    let settled = false;

    const finish = (value: ItemEditorValues | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    panel.onDidDispose(() => {
      finish(undefined);
    });

    panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.type) {
        case "submit": {
          const validationMessage = validateValues(message.value);
          if (validationMessage) {
            void panel.webview.postMessage({
              type: "showError",
              value: validationMessage,
            });
            return;
          }

          finish({
            filePath: message.value.filePath.trim(),
            symbolName: message.value.symbolName.trim(),
            type: message.value.type,
          });
          panel.dispose();
          return;
        }
        case "cancel": {
          panel.dispose();
          return;
        }
        case "fillActiveFile": {
          const defaults = getActiveEditorDefaults();
          if (!defaults.filePath) {
            void vscode.window.showInformationMessage(
              "No active editor file in the workspace was found."
            );
            return;
          }

          void panel.webview.postMessage({
            type: "patchValues",
            value: {
              filePath: defaults.filePath,
              ...(defaults.symbolName ? { symbolName: defaults.symbolName } : {}),
            },
          });
          return;
        }
        case "fillSelection": {
          const symbolName = getActiveSelectionText();
          if (!symbolName) {
            void vscode.window.showInformationMessage(
              "Select a symbol name in the editor first."
            );
            return;
          }

          void panel.webview.postMessage({
            type: "patchValues",
            value: {
              symbolName,
              type: "definition",
            },
          });
          return;
        }
      }
    });
  });
}

function buildInitialValues(
  initialValue?: Partial<ItemEditorValues>
): ItemEditorValues {
  const defaults = getActiveEditorDefaults();
  const symbolName = (initialValue?.symbolName ?? defaults.symbolName ?? "").trim();

  return {
    filePath: (initialValue?.filePath ?? defaults.filePath ?? "").trim(),
    symbolName,
    type: initialValue?.type ?? (symbolName ? "definition" : "file"),
  };
}

function getActiveEditorDefaults(): Partial<ItemEditorValues> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {};
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  if (!workspaceFolder) {
    return {};
  }

  return {
    filePath: vscode.workspace.asRelativePath(editor.document.uri, false),
    symbolName: getActiveSelectionText(),
  };
}

function getActiveSelectionText(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return "";
  }

  const selectedText = editor.document.getText(editor.selection).trim();
  if (!selectedText || selectedText.includes("\n")) {
    return "";
  }

  return selectedText;
}

function validateValues(values: ItemEditorValues): string | undefined {
  if (!values.filePath.trim()) {
    return "File path is required.";
  }

  if (!ITEM_TYPES.includes(values.type)) {
    return "Invalid item type selected.";
  }

  return undefined;
}

function getWebviewHtml(
  webview: vscode.Webview,
  options: ItemEditorOptions,
  initialValue: ItemEditorValues
): string {
  const nonce = getNonce();
  const title = options.mode === "add" ? "Add Scenario Item" : "Edit Scenario Item";
  const subtitle = options.mode === "add"
    ? options.parentItemName
      ? `Scenario: ${options.scenarioName} / Parent: ${options.parentItemName}`
      : `Scenario: ${options.scenarioName}`
    : options.itemName
      ? `Scenario: ${options.scenarioName} / Item: ${options.itemName}`
      : `Scenario: ${options.scenarioName}`;
  const serializedInitialValue = JSON.stringify(initialValue).replace(/</g, "\\u003c");
  const typeOptions = ITEM_TYPES.map((type) => {
    const selected = type === initialValue.type ? " selected" : "";
    return `<option value="${escapeHtml(type)}"${selected}>${escapeHtml(type)}</option>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --surface: color-mix(in srgb, var(--vscode-editor-background) 88%, var(--vscode-sideBar-background));
      --surface-alt: color-mix(in srgb, var(--vscode-editorWidget-background) 84%, transparent);
      --border: var(--vscode-input-border, transparent);
      --text: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-button-background);
      --accent-text: var(--vscode-button-foreground);
      --danger: var(--vscode-errorForeground);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 24px;
      font-family: var(--vscode-font-family);
      color: var(--text);
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 18%, transparent), transparent 38%),
        linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, transparent), var(--vscode-editor-background));
    }

    .shell {
      max-width: 760px;
      margin: 0 auto;
      padding: 24px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--surface);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .subtitle {
      margin: 8px 0 0;
      color: var(--muted);
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 20px 0 24px;
    }

    button {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 8px 14px;
      font: inherit;
      cursor: pointer;
      color: var(--text);
      background: var(--surface-alt);
    }

    button.primary {
      border: none;
      color: var(--accent-text);
      background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, black));
    }

    form {
      display: grid;
      gap: 18px;
    }

    .field {
      display: grid;
      gap: 8px;
    }

    label {
      font-weight: 600;
    }

    input,
    select {
      width: 100%;
      min-height: 40px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font: inherit;
      color: var(--text);
      background: var(--vscode-input-background);
    }

    .hint {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .error {
      min-height: 20px;
      color: var(--danger);
      font-size: 12px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
    }

    @media (max-width: 640px) {
      body {
        padding: 12px;
      }

      .shell {
        padding: 18px;
      }

      .actions {
        flex-direction: column-reverse;
      }

      .actions button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>

    <div class="toolbar">
      <button type="button" id="useActiveFile">Use Active File</button>
      <button type="button" id="useSelection">Use Editor Selection as Symbol</button>
    </div>

    <form id="itemForm">
      <div class="field">
        <label for="filePath">Source File</label>
        <input id="filePath" name="filePath" type="text" value="${escapeHtml(initialValue.filePath)}" placeholder="src/main.c" />
        <div class="hint">Required. Paths are stored relative to the workspace root.</div>
      </div>

      <div class="field">
        <label for="symbolName">Symbol Name</label>
        <input id="symbolName" name="symbolName" type="text" value="${escapeHtml(initialValue.symbolName)}" placeholder="usb_init" />
        <div class="hint">Optional. Leave empty to register the file itself instead of a symbol.</div>
      </div>

      <div class="field">
        <label for="itemType">Type</label>
        <select id="itemType" name="itemType">${typeOptions}</select>
      </div>

      <div class="error" id="errorText"></div>

      <div class="actions">
        <button type="button" id="cancelButton">Cancel</button>
        <button type="submit" class="primary">Save</button>
      </div>
    </form>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initialValue = ${serializedInitialValue};

    const form = document.getElementById("itemForm");
    const filePathInput = document.getElementById("filePath");
    const symbolNameInput = document.getElementById("symbolName");
    const itemTypeSelect = document.getElementById("itemType");
    const errorText = document.getElementById("errorText");

    filePathInput.value = initialValue.filePath;
    symbolNameInput.value = initialValue.symbolName;
    itemTypeSelect.value = initialValue.type;

    document.getElementById("useActiveFile").addEventListener("click", () => {
      vscode.postMessage({ type: "fillActiveFile" });
    });

    document.getElementById("useSelection").addEventListener("click", () => {
      vscode.postMessage({ type: "fillSelection" });
    });

    document.getElementById("cancelButton").addEventListener("click", () => {
      vscode.postMessage({ type: "cancel" });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      errorText.textContent = "";
      vscode.postMessage({
        type: "submit",
        value: {
          filePath: filePathInput.value,
          symbolName: symbolNameInput.value,
          type: itemTypeSelect.value,
        },
      });
    });

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.type === "showError") {
        errorText.textContent = message.value;
        return;
      }

      if (message.type === "patchValues") {
        errorText.textContent = "";
        if (typeof message.value.filePath === "string") {
          filePathInput.value = message.value.filePath;
        }
        if (typeof message.value.symbolName === "string") {
          symbolNameInput.value = message.value.symbolName;
        }
        if (typeof message.value.type === "string") {
          itemTypeSelect.value = message.value.type;
        }
      }
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";

  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return nonce;
}