import * as vscode from "vscode";
import { ITEM_TYPES, ItemType } from "./scenarioModel";
import { getActiveSelectionText } from "./editorContext";
import {
  getActiveWorkspaceFileReference,
  validateWorkspaceFileUri,
  validateWorkspaceFileInput,
} from "./workspacePaths";

export interface ItemEditorValues {
  filePath: string;
  symbolName: string;
  type: ItemType;
  workspaceFolderUri?: string;
  note?: string;
}

interface ItemEditorOptions {
  mode: "add" | "edit";
  scenarioName: string;
  parentItemName?: string;
  addLocationLabel?: string;
  itemName?: string;
  initialValue?: Partial<ItemEditorValues>;
}

interface ItemNoteEditorOptions {
  scenarioName: string;
  itemName?: string;
  initialNote?: string;
}

export type ItemNoteEditorResult =
  | { action: "save"; note: string }
  | { action: "clear" };

type WebviewMessage =
  | { type: "submit"; value: ItemEditorValues }
  | { type: "cancel" }
  | { type: "fillActiveFile" }
  | { type: "fillSelection" }
  | { type: "browseFile" };

type ItemNoteEditorMessage =
  | { type: "submit"; value: { note: string } }
  | { type: "clear" }
  | { type: "cancel" };

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
          const validationResult = validateValues(message.value);
          if (validationResult.error) {
            void panel.webview.postMessage({
              type: "showError",
              value: validationResult.error,
            });
            return;
          }

          finish(validationResult.value);
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
              "Open a file from the current workspace, then use Active File again."
            );
            return;
          }

          void panel.webview.postMessage({
            type: "patchValues",
            value: {
              filePath: defaults.filePath,
              symbolName: "",
              type: "file",
              workspaceFolderUri: defaults.workspaceFolderUri ?? "",
            },
          });
          return;
        }
        case "fillSelection": {
          const defaults = getActiveEditorDefaults();
          if (!defaults.symbolName || !defaults.filePath) {
            void vscode.window.showInformationMessage(
              "Select a symbol-like identifier in a file from the current workspace first."
            );
            return;
          }

          void panel.webview.postMessage({
            type: "patchValues",
            value: {
              symbolName: defaults.symbolName,
              ...(defaults.filePath
                ? {
                  filePath: defaults.filePath,
                  workspaceFolderUri: defaults.workspaceFolderUri ?? "",
                }
                : {}),
            },
          });
          return;
        }
        case "browseFile": {
          const selectedFile = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: "Select Source File",
            title: "Select Source File",
          });
          const fileUri = selectedFile?.[0];
          if (!fileUri) {
            return;
          }

          const fileValidation = validateWorkspaceFileUri(fileUri);
          if (fileValidation.error) {
            void panel.webview.postMessage({
              type: "showError",
              value: `Could not use the selected file. ${fileValidation.error}`,
            });
            return;
          }

          if (!fileValidation.value) {
            void panel.webview.postMessage({
              type: "showError",
              value: "Could not use the selected file. Choose a different file and try again.",
            });
            return;
          }

          void panel.webview.postMessage({
            type: "patchValues",
            value: {
              filePath: fileValidation.value.filePath,
              workspaceFolderUri: fileValidation.value.workspaceFolderUri ?? "",
            },
          });
          return;
        }
      }
    });
  });
}

export async function showItemNoteEditor(
  options: ItemNoteEditorOptions
): Promise<ItemNoteEditorResult | undefined> {
  const initialNote = options.initialNote ?? "";
  const panel = vscode.window.createWebviewPanel(
    "codeScenarioItemNoteEditor",
    initialNote.trim() ? "Edit Note" : "Add Note",
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getItemNoteEditorHtml(panel.webview, options, initialNote);

  return new Promise<ItemNoteEditorResult | undefined>((resolve) => {
    let settled = false;

    const finish = (value: ItemNoteEditorResult | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    panel.onDidDispose(() => {
      finish(undefined);
    });

    panel.webview.onDidReceiveMessage((message: ItemNoteEditorMessage) => {
      switch (message.type) {
        case "submit": {
          finish({ action: "save", note: message.value.note });
          panel.dispose();
          return;
        }
        case "clear": {
          finish({ action: "clear" });
          panel.dispose();
          return;
        }
        case "cancel": {
          panel.dispose();
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
  const initialType = initialValue?.type;

  return {
    filePath: (initialValue?.filePath ?? defaults.filePath ?? "").trim(),
    symbolName,
    type: symbolName
      ? initialType && initialType !== "file"
        ? initialType
        : "definition"
      : "file",
    workspaceFolderUri: initialValue?.workspaceFolderUri ?? defaults.workspaceFolderUri,
    note: initialValue?.note ?? "",
  };
}

function getActiveEditorDefaults(): Partial<ItemEditorValues> {
  const activeFile = getActiveWorkspaceFileReference();
  return {
    filePath: activeFile?.filePath,
    symbolName: getActiveSelectionText(),
    workspaceFolderUri: activeFile?.workspaceFolderUri,
  };
}

function validateValues(
  values: ItemEditorValues
): { value: ItemEditorValues; error?: undefined } | { value?: undefined; error: string } {
  const symbolName = values.symbolName.trim();
  const fileValidation = validateWorkspaceFileInput(
    values.filePath,
    values.workspaceFolderUri
  );
  if (fileValidation.error) {
    return {
      error: fileValidation.error,
    };
  }
  const validatedFile = fileValidation.value;
  if (!validatedFile) {
    return {
      error: "Source file could not be validated. Check the file path and try again.",
    };
  }

  if (!ITEM_TYPES.includes(values.type)) {
    return {
      error: "Select a valid item type before saving.",
    };
  }

  if (symbolName.includes("\n")) {
    return {
      error: "Symbol name must stay on a single line. Remove line breaks and try again.",
    };
  }

  if (!symbolName && values.type !== "file") {
    return {
      error: "Type must be File when Symbol Name is empty. Enter a symbol name or switch Type to File.",
    };
  }

  if (symbolName && values.type === "file") {
    return {
      error: "Type cannot be File when Symbol Name is set. Choose a symbol type such as Definition, or clear Symbol Name.",
    };
  }

  return {
    value: {
      filePath: validatedFile.filePath,
      symbolName,
      type: values.type,
      workspaceFolderUri: validatedFile.workspaceFolderUri,
      note: values.note,
    },
  };
}

function getWebviewHtml(
  webview: vscode.Webview,
  options: ItemEditorOptions,
  initialValue: ItemEditorValues
): string {
  const nonce = getNonce();
  const title = options.mode === "add" ? "Add Scenario Item" : "Edit Scenario Item";
  const subtitle = options.mode === "add"
    ? options.addLocationLabel
      ? `Scenario: ${options.scenarioName} / ${options.addLocationLabel}`
      : options.parentItemName
      ? `Scenario: ${options.scenarioName} / Parent: ${options.parentItemName}`
      : `Scenario: ${options.scenarioName}`
    : options.itemName
      ? `Scenario: ${options.scenarioName} / Item: ${options.itemName}`
      : `Scenario: ${options.scenarioName}`;
  const serializedInitialValue = JSON.stringify(initialValue).replace(/</g, "\\u003c");
  const typeOptions = ITEM_TYPES.map((type) => {
    const selected = type === initialValue.type ? " selected" : "";
    const requiresSymbol = type === "file" ? "false" : "true";
    return `<option value="${escapeHtml(type)}" data-requires-symbol="${requiresSymbol}"${selected}>${escapeHtml(type)}</option>`;
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
    select,
    textarea {
      width: 100%;
      min-height: 40px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font: inherit;
      color: var(--text);
      background: var(--vscode-input-background);
    }

    textarea {
      min-height: 80px;
      resize: vertical;
    }

    .hint {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .intent {
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-alt);
      font-size: 13px;
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
      <button type="button" id="browseFile">Browse File...</button>
      <button type="button" id="useSelection">Use Editor Selection as Symbol</button>
    </div>

    <form id="itemForm">
      <div class="intent" id="intentText"></div>

      <div class="field">
        <label for="filePath">Source File</label>
        <input id="filePath" name="filePath" type="text" value="${escapeHtml(initialValue.filePath)}" placeholder="src/main.c" />
        <div class="hint" id="fileHint">Required. Use a workspace-relative path to an existing file, or click Use Active File.</div>
      </div>

      <div class="field">
        <label for="symbolName">Symbol Name</label>
        <input id="symbolName" name="symbolName" type="text" value="${escapeHtml(initialValue.symbolName)}" placeholder="usb_init" />
        <div class="hint" id="symbolHint">Leave empty to create a file item. Add a symbol name to target something inside the file.</div>
      </div>

      <div class="field">
        <label for="itemType">Type</label>
        <select id="itemType" name="itemType">${typeOptions}</select>
        <div class="hint" id="typeHint"></div>
      </div>

      <div class="field">
        <label for="itemNote">Notes</label>
        <textarea id="itemNote" name="itemNote" rows="3" placeholder="Optional notes about this item...">${escapeHtml(initialValue.note ?? "")}</textarea>
        <div class="hint">Optional. Notes appear in the item tooltip on hover.</div>
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
    const itemNoteTextarea = document.getElementById("itemNote");
    const errorText = document.getElementById("errorText");
    const intentText = document.getElementById("intentText");
    const fileHint = document.getElementById("fileHint");
    const symbolHint = document.getElementById("symbolHint");
    const typeHint = document.getElementById("typeHint");
    let workspaceFolderUri = initialValue.workspaceFolderUri || "";
    let lastSymbolType = initialValue.type !== "file" ? initialValue.type : "definition";
    let previousSymbolPresent = initialValue.symbolName.trim().length > 0;

    filePathInput.value = initialValue.filePath;
    symbolNameInput.value = initialValue.symbolName;
    itemTypeSelect.value = initialValue.type;
    itemNoteTextarea.value = initialValue.note || "";

    function clearError() {
      errorText.textContent = "";
    }

    function hasSymbolName() {
      return symbolNameInput.value.trim().length > 0;
    }

    function syncFormState() {
      const symbolPresent = hasSymbolName();

      Array.from(itemTypeSelect.options).forEach((option) => {
        const requiresSymbol = option.dataset.requiresSymbol === "true";
        option.disabled = symbolPresent ? !requiresSymbol : requiresSymbol;
      });

      if (symbolPresent) {
        if (!previousSymbolPresent || itemTypeSelect.value === "file") {
          itemTypeSelect.value = lastSymbolType;
        }
        if (itemTypeSelect.value !== "file") {
          lastSymbolType = itemTypeSelect.value;
        }
        intentText.textContent = "Creating a symbol item. The source file locates the symbol, and Type describes how that symbol is used.";
        symbolHint.textContent = "Symbol Name is set, so this item will target a symbol inside the source file.";
        typeHint.textContent = "Choose a symbol-oriented type such as Definition, Call, or Reference.";
      } else {
        if (previousSymbolPresent && itemTypeSelect.value !== "file") {
          lastSymbolType = itemTypeSelect.value;
        }
        itemTypeSelect.value = "file";
        intentText.textContent = "Creating a file item. Leave Symbol Name empty to point at the file itself.";
        symbolHint.textContent = "Leave Symbol Name empty for a file item, or add a symbol name to switch to symbol-oriented types.";
        typeHint.textContent = "Only File is valid until you enter a symbol name.";
      }

      previousSymbolPresent = symbolPresent;

      fileHint.textContent = filePathInput.value.trim()
        ? "The file path should point to an existing file in the current workspace."
        : "Required. Use a workspace-relative path to an existing file, or click Use Active File.";
    }

    function getClientValidationMessage() {
      if (!filePathInput.value.trim()) {
        return "Source file is required. Enter a file path or use Active File.";
      }

      if (!hasSymbolName() && itemTypeSelect.value !== "file") {
        return "Type must be File when Symbol Name is empty.";
      }

      if (hasSymbolName() && itemTypeSelect.value === "file") {
        return "Choose a symbol-oriented Type, or clear Symbol Name to create a file item.";
      }

      return "";
    }

    syncFormState();

    document.getElementById("useActiveFile").addEventListener("click", () => {
      clearError();
      vscode.postMessage({ type: "fillActiveFile" });
    });

    document.getElementById("useSelection").addEventListener("click", () => {
      clearError();
      vscode.postMessage({ type: "fillSelection" });
    });

    document.getElementById("browseFile").addEventListener("click", () => {
      vscode.postMessage({ type: "browseFile" });
    });

    document.getElementById("cancelButton").addEventListener("click", () => {
      vscode.postMessage({ type: "cancel" });
    });

    filePathInput.addEventListener("input", () => {
      clearError();
      syncFormState();
    });

    symbolNameInput.addEventListener("input", () => {
      clearError();
      syncFormState();
    });

    itemTypeSelect.addEventListener("change", () => {
      clearError();
      if (itemTypeSelect.value !== "file") {
        lastSymbolType = itemTypeSelect.value;
      }
      syncFormState();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearError();
      syncFormState();
      const clientValidationMessage = getClientValidationMessage();
      if (clientValidationMessage) {
        errorText.textContent = clientValidationMessage;
        return;
      }
      vscode.postMessage({
        type: "submit",
        value: {
          filePath: filePathInput.value,
          symbolName: symbolNameInput.value,
          type: itemTypeSelect.value,
          workspaceFolderUri,
          note: itemNoteTextarea.value,
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
        clearError();
        if (typeof message.value.filePath === "string") {
          filePathInput.value = message.value.filePath;
        }
        if (typeof message.value.symbolName === "string") {
          symbolNameInput.value = message.value.symbolName;
        }
        if (typeof message.value.type === "string") {
          itemTypeSelect.value = message.value.type;
        }
        if (typeof message.value.note === "string") {
          itemNoteTextarea.value = message.value.note;
        }
        if ("workspaceFolderUri" in message.value) {
          workspaceFolderUri = typeof message.value.workspaceFolderUri === "string"
            ? message.value.workspaceFolderUri
            : "";
        }
        syncFormState();
      }
    });
  </script>
</body>
</html>`;
}

function getItemNoteEditorHtml(
  webview: vscode.Webview,
  options: ItemNoteEditorOptions,
  initialNote: string
): string {
  const nonce = getNonce();
  const title = initialNote.trim() ? "Edit Note" : "Add Note";
  const subtitle = options.itemName
    ? `Scenario: ${options.scenarioName} / Item: ${options.itemName}`
    : `Scenario: ${options.scenarioName}`;
  const serializedInitialNote = JSON.stringify(initialNote).replace(/</g, "\\u003c");

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
      max-width: 720px;
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

    form {
      display: grid;
      gap: 16px;
      margin-top: 20px;
    }

    label {
      font-weight: 600;
    }

    textarea {
      width: 100%;
      min-height: 180px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font: inherit;
      color: var(--text);
      background: var(--vscode-input-background);
      resize: vertical;
    }

    .hint {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
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

    button:disabled {
      opacity: 0.6;
      cursor: default;
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

    <form id="noteForm">
      <div>
        <label for="itemNote">Note</label>
      </div>
      <textarea id="itemNote" name="itemNote" rows="8" placeholder="Optional plain-text note shown in the tree tooltip...">${escapeHtml(initialNote)}</textarea>
      <div class="hint">Notes stay as plain text and appear in the item tooltip on hover. Save an empty note or use Clear Note to remove the note.</div>

      <div class="actions">
        <button type="button" id="cancelButton">Cancel</button>
        <button type="button" id="clearButton">Clear Note</button>
        <button type="submit" class="primary">Save Note</button>
      </div>
    </form>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initialNote = ${serializedInitialNote};
    const form = document.getElementById("noteForm");
    const noteTextarea = document.getElementById("itemNote");
    const clearButton = document.getElementById("clearButton");

    noteTextarea.value = initialNote;

    function syncState() {
      clearButton.disabled = initialNote.length === 0 && noteTextarea.value.length === 0;
    }

    document.getElementById("cancelButton").addEventListener("click", () => {
      vscode.postMessage({ type: "cancel" });
    });

    clearButton.addEventListener("click", () => {
      vscode.postMessage({ type: "clear" });
    });

    noteTextarea.addEventListener("input", () => {
      syncState();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      vscode.postMessage({
        type: "submit",
        value: {
          note: noteTextarea.value,
        },
      });
    });

    syncState();
    noteTextarea.focus();
    noteTextarea.setSelectionRange(noteTextarea.value.length, noteTextarea.value.length);
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
