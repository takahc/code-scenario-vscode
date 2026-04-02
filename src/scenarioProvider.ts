import * as path from "path";
import * as vscode from "vscode";
import { ScenarioData, ScenarioItemData } from "./scenarioModel";
import { resolveScenarioItemLocation, ScenarioItemLocationResolution } from "./workspacePaths";

// Union type for tree nodes
export type TreeNode = ScenarioNode | ItemNode;

const QUICK_ADD_SCENARIO_ID_KEY = "quickAddScenarioId";

export class ScenarioNode {
  readonly kind = "scenario" as const;
  constructor(public readonly data: ScenarioData) {}
}

export class ItemNode {
  readonly kind = "item" as const;
  constructor(
    public readonly data: ScenarioItemData,
    public readonly scenarioId: string
  ) {}
}

export interface MoveItemDestination {
  scenarioId: string;
  parentItemId?: string;
  label: string;
  description?: string;
  detail?: string;
}

export type MoveItemResult =
  | { ok: true }
  | { ok: false; reason: string; isNoOp?: boolean };

export class ScenarioProvider
  implements vscode.TreeDataProvider<TreeNode>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private scenarios: ScenarioData[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this.load();
  }

  // ── Persistence ──────────────────────────────────────────────

  private load(): void {
    this.scenarios = this.context.workspaceState.get<ScenarioData[]>(
      "scenarios",
      []
    );
  }

  private async save(): Promise<void> {
    await this.context.workspaceState.update("scenarios", this.scenarios);
  }

  // ── Public API ───────────────────────────────────────────────

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Called when VS Code renames or moves files/folders.
   * Updates every scenario item whose resolved absolute path falls under an
   * old URI so that bookmarks stay valid after rename/move operations.
   *
   * Both direct file renames and folder moves are handled: an item inside a
   * renamed directory is detected via prefix matching on `oldUri.fsPath`.
   */
  async handleRenameFiles(
    renames: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>
  ): Promise<void> {
    let changed = false;
    for (const scenario of this.scenarios) {
      if (applyRenamesRecursively(scenario.items, renames)) {
        changed = true;
      }
    }
    if (changed) {
      await this.save();
      this.refresh();
    }
  }

  getScenarios(): ScenarioData[] {
    return this.scenarios;
  }

  getScenarioById(scenarioId: string): ScenarioData | undefined {
    return this.scenarios.find((scenario) => scenario.id === scenarioId);
  }

  getQuickAddScenario(): ScenarioData | undefined {
    const scenarioId = this.context.workspaceState.get<string>(QUICK_ADD_SCENARIO_ID_KEY);
    if (!scenarioId) {
      return undefined;
    }

    return this.getScenarioById(scenarioId);
  }

  async setQuickAddScenario(scenarioId: string | undefined): Promise<void> {
    await this.context.workspaceState.update(QUICK_ADD_SCENARIO_ID_KEY, scenarioId);
  }

  async addScenario(name: string): Promise<void> {
    const scenario: ScenarioData = {
      id: generateId(),
      name,
      items: [],
    };
    this.scenarios.push(scenario);
    await this.save();
    this.refresh();
  }

  async deleteScenario(scenarioId: string): Promise<void> {
    this.scenarios = this.scenarios.filter((s) => s.id !== scenarioId);
    await this.save();
    this.refresh();
  }

  async renameScenario(scenarioId: string, newName: string): Promise<void> {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      scenario.name = newName;
      await this.save();
      this.refresh();
    }
  }

  async addItem(
    parentScenarioId: string,
    parentItemId: string | undefined,
    itemData: Omit<ScenarioItemData, "id" | "children">
  ): Promise<void> {
    const item: ScenarioItemData = {
      ...itemData,
      id: generateId(),
      children: [],
    };

    const scenario = this.scenarios.find((s) => s.id === parentScenarioId);
    if (!scenario) { return; }

    if (parentItemId) {
      const parent = findItemById(scenario.items, parentItemId);
      if (parent) {
        parent.children.push(item);
      }
    } else {
      scenario.items.push(item);
    }

    await this.save();
    this.refresh();
  }

  async editItem(
    scenarioId: string,
    itemId: string,
    updates: Partial<Omit<ScenarioItemData, "id" | "children">>
  ): Promise<void> {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) { return; }

    const item = findItemById(scenario.items, itemId);
    if (item) {
      const { workspaceFolderUri, note, ...restUpdates } = updates;
      Object.assign(item, restUpdates);

      if ("workspaceFolderUri" in updates) {
        if (workspaceFolderUri === undefined) {
          delete item.workspaceFolderUri;
        } else {
          item.workspaceFolderUri = workspaceFolderUri;
        }
      }

      if ("note" in updates) {
        if (!note) {
          delete item.note;
        } else {
          item.note = note;
        }
      }

      await this.save();
      this.refresh();
    }
  }

  async deleteItem(scenarioId: string, itemId: string): Promise<void> {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) { return; }

    scenario.items = removeItemById(scenario.items, itemId);
    await this.save();
    this.refresh();
  }

  getMoveItemDestinations(
    sourceScenarioId: string,
    itemId: string
  ): MoveItemDestination[] {
    const sourceScenario = this.scenarios.find((scenario) => scenario.id === sourceScenarioId);
    if (!sourceScenario) {
      return [];
    }

    const sourceEntry = findItemEntry(sourceScenario.items, itemId);
    if (!sourceEntry) {
      return [];
    }

    const blockedIds = new Set(collectItemIds(sourceEntry.item));

    return this.scenarios.flatMap((scenario) => {
      const destinations: MoveItemDestination[] = [];
      const isCurrentRoot = scenario.id === sourceScenarioId && sourceEntry.parent === undefined;
      if (!isCurrentRoot) {
        destinations.push({
          scenarioId: scenario.id,
          label: `${scenario.name} › (scenario root)`,
          description: "Append as a top-level item",
          detail: `Scenario: ${scenario.name}`,
        });
      }

      const itemDestinations = collectMoveDestinations(
        scenario.items,
        scenario,
        blockedIds,
        sourceScenarioId,
        sourceEntry.parent?.id
      );

      destinations.push(...itemDestinations);
      return destinations;
    });
  }

  async moveItem(
    sourceScenarioId: string,
    itemId: string,
    destinationScenarioId: string,
    destinationParentItemId?: string
  ): Promise<MoveItemResult> {
    const sourceScenario = this.scenarios.find((scenario) => scenario.id === sourceScenarioId);
    if (!sourceScenario) {
      return { ok: false, reason: "Source scenario was not found." };
    }

    const sourceEntry = findItemEntry(sourceScenario.items, itemId);
    if (!sourceEntry) {
      return { ok: false, reason: "Item to move was not found." };
    }

    const destinationScenario = this.scenarios.find((scenario) => scenario.id === destinationScenarioId);
    if (!destinationScenario) {
      return { ok: false, reason: "Destination scenario was not found." };
    }

    const currentParentId = sourceEntry.parent?.id;
    if (
      sourceScenarioId === destinationScenarioId &&
      currentParentId === destinationParentItemId
    ) {
      // For a scenario-root drop (no parent on either side) only skip when the
      // item is already the last top-level entry — moving it to the end would
      // be a true no-op.  For any named-parent destination the existing guard
      // is correct: same parent means nothing would change.
      if (destinationParentItemId === undefined) {
        const rootItems = sourceScenario.items;
        const isAlreadyLast = rootItems[rootItems.length - 1]?.id === itemId;
        if (isAlreadyLast) {
          return { ok: false, reason: "Select a different destination.", isNoOp: true };
        }
        // Fall through: item exists in the root but is not last — let the move proceed.
      } else {
        return { ok: false, reason: "Select a different destination.", isNoOp: true };
      }
    }

    const blockedIds = new Set(collectItemIds(sourceEntry.item));
    if (destinationParentItemId && blockedIds.has(destinationParentItemId)) {
      return { ok: false, reason: "An item cannot be moved into itself or one of its descendants." };
    }

    let destinationChildren: ScenarioItemData[];
    if (destinationParentItemId) {
      const destinationParent = findItemById(destinationScenario.items, destinationParentItemId);
      if (!destinationParent) {
        return { ok: false, reason: "Destination parent item was not found." };
      }
      destinationChildren = destinationParent.children;
    } else {
      destinationChildren = destinationScenario.items;
    }

    const sourceChildren = sourceEntry.parent
      ? sourceEntry.parent.children
      : sourceScenario.items;
    const sourceIndex = sourceChildren.findIndex((item) => item.id === itemId);
    if (sourceIndex === -1) {
      return { ok: false, reason: "Item to move was not found." };
    }

    const [movedItem] = sourceChildren.splice(sourceIndex, 1);
    destinationChildren.push(movedItem);

    await this.save();
    this.refresh();
    return { ok: true };
  }

  findItem(scenarioId: string, itemId: string): ScenarioItemData | undefined {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) { return undefined; }
    return findItemById(scenario.items, itemId);
  }

  /**
   * Moves `itemId` (from `sourceScenarioId`) so that it becomes the immediate
   * sibling right after `targetItemId` (in `targetScenarioId`).
   * The dragged item's subtree is preserved.
   */
  async moveItemAfterSibling(
    sourceScenarioId: string,
    itemId: string,
    targetScenarioId: string,
    targetItemId: string,
  ): Promise<MoveItemResult> {
    const sourceScenario = this.scenarios.find((s) => s.id === sourceScenarioId);
    if (!sourceScenario) {
      return { ok: false, reason: "Source scenario was not found." };
    }

    const sourceEntry = findItemEntry(sourceScenario.items, itemId);
    if (!sourceEntry) {
      return { ok: false, reason: "Item to move was not found." };
    }

    const targetScenario = this.scenarios.find((s) => s.id === targetScenarioId);
    if (!targetScenario) {
      return { ok: false, reason: "Target scenario was not found." };
    }

    const targetEntry = findItemEntry(targetScenario.items, targetItemId);
    if (!targetEntry) {
      return { ok: false, reason: "Target item was not found." };
    }

    // Self-drop
    if (itemId === targetItemId) {
      return { ok: false, reason: "", isNoOp: true };
    }

    // Descendant-drop: reject with warning
    const blockedIds = new Set(collectItemIds(sourceEntry.item));
    if (blockedIds.has(targetItemId)) {
      return { ok: false, reason: "An item cannot be moved into itself or one of its descendants." };
    }

    // Resolve the array that contains the target item
    const targetSiblings: ScenarioItemData[] = targetEntry.parent
      ? targetEntry.parent.children
      : targetScenario.items;

    // No-op: dragged item is already the immediate successor of target
    const isSameScenario = sourceScenarioId === targetScenarioId;
    const isSameParent = sourceEntry.parent?.id === targetEntry.parent?.id;
    if (isSameScenario && isSameParent) {
      const tIdx = targetSiblings.findIndex((i) => i.id === targetItemId);
      const sIdx = targetSiblings.findIndex((i) => i.id === itemId);
      if (tIdx !== -1 && sIdx === tIdx + 1) {
        return { ok: false, reason: "", isNoOp: true };
      }
    }

    // Remove from source
    const sourceChildren: ScenarioItemData[] = sourceEntry.parent
      ? sourceEntry.parent.children
      : sourceScenario.items;
    const sourceIdx = sourceChildren.findIndex((i) => i.id === itemId);
    if (sourceIdx === -1) {
      return { ok: false, reason: "Item to move was not found." };
    }
    const [movedItem] = sourceChildren.splice(sourceIdx, 1);

    // Re-locate target after the removal (index may have shifted in the same array)
    const newTargetIdx = targetSiblings.findIndex((i) => i.id === targetItemId);
    if (newTargetIdx === -1) {
      // Safety fallback — target disappeared (shouldn't happen)
      targetSiblings.push(movedItem);
    } else {
      targetSiblings.splice(newTargetIdx + 1, 0, movedItem);
    }

    await this.save();
    this.refresh();
    return { ok: true };
  }

  // ── TreeDataProvider ─────────────────────────────────────────

  getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.kind === "scenario") {
      const totalItemCount = countScenarioItems(node.data);
      const topLevelItemCount = node.data.items.length;
      const hasChildren = topLevelItemCount > 0;
      const staleCount = countStaleItems(node.data.items);
      const item = new vscode.TreeItem(
        node.data.name,
        hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.id = node.data.id;
      item.contextValue = "scenario";
      item.iconPath = staleCount > 0
        ? new vscode.ThemeIcon("warning", new vscode.ThemeColor("list.warningForeground"))
        : new vscode.ThemeIcon("list-unordered");
      item.description = staleCount > 0
        ? `${formatCount(totalItemCount, "item")} · ⚠ ${staleCount} stale`
        : formatCount(totalItemCount, "item");
      item.tooltip = hasChildren
        ? `${node.data.name}\n${formatCount(totalItemCount, "total item")} across ${formatCount(topLevelItemCount, "top-level item")}`
        : `${node.data.name}\nNo items yet`;
      if (staleCount > 0) {
        item.tooltip = `${item.tooltip}\n⚠ ${staleCount} stale item(s) — file path cannot be resolved`;
      }
      return item;
    } else {
      const label = `${node.data.name}  |  ${node.data.type}`;
      const hasChildren = node.data.children.length > 0;
      const location = resolveScenarioItemLocation(node.data);
      const item = new vscode.TreeItem(
        label,
        hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.id = node.data.id;
      item.contextValue = shouldUseWarningStyling(location) ? "scenarioItemStale" : "scenarioItem";
      item.description = hasChildren
        ? `${node.data.filePath} · ${formatCount(node.data.children.length, "child")}`
        : node.data.filePath;
      const actionHint = location.status === "resolved"
        ? "Click to open in the editor."
        : "Click to review file resolution or edit this item.";
      const noteSection = node.data.note ? `\n${node.data.note}` : "";
      item.tooltip = hasChildren
        ? `${node.data.name} (${node.data.type})\n${node.data.filePath}\n${formatCount(node.data.children.length, "child")}${noteSection}\n${actionHint}`
        : `${node.data.name} (${node.data.type})\n${node.data.filePath}${noteSection}\n${actionHint}`;
      item.iconPath = node.data.kind === "file"
        ? new vscode.ThemeIcon("file")
        : new vscode.ThemeIcon("symbol-function");

      if (location.status !== "resolved") {
        item.tooltip = `${item.tooltip}\n⚠ ${formatLocationWarning(location)}`;
      }

      if (shouldUseWarningStyling(location)) {
        item.iconPath = new vscode.ThemeIcon(
          "warning",
          new vscode.ThemeColor("list.warningForeground")
        );
      }

      // Command to open the file when clicked
      item.command = {
        command: "code-scenario.openItem",
        title: "Open",
        arguments: [node],
      };

      return item;
    }
  }

  getParent(node: TreeNode): TreeNode | undefined {
    if (node.kind === "scenario") {
      return undefined;
    }
    // ItemNode — locate the scenario, then find the item's direct parent
    const scenario = this.scenarios.find((s) => s.id === node.scenarioId);
    if (!scenario) { return undefined; }

    const entry = findItemEntry(scenario.items, node.data.id);
    if (!entry) { return undefined; }

    if (entry.parent === undefined) {
      // Top-level item: parent is the scenario root
      return new ScenarioNode(scenario);
    }

    // Nested item: parent is another item in the same scenario
    return new ItemNode(entry.parent, node.scenarioId);
  }

  getChildren(node?: TreeNode): vscode.ProviderResult<TreeNode[]> {
    if (!node) {
      return this.scenarios.map((s) => new ScenarioNode(s));
    }
    if (node.kind === "scenario") {
      return node.data.items.map((i) => new ItemNode(i, node.data.id));
    }
    if (node.kind === "item") {
      return node.data.children.map((c) => new ItemNode(c, node.scenarioId));
    }
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function findItemById(
  items: ScenarioItemData[],
  id: string
): ScenarioItemData | undefined {
  for (const item of items) {
    if (item.id === id) { return item; }
    const found = findItemById(item.children, id);
    if (found) { return found; }
  }
  return undefined;
}

function findItemEntry(
  items: ScenarioItemData[],
  id: string,
  parent?: ScenarioItemData
): { item: ScenarioItemData; parent?: ScenarioItemData } | undefined {
  for (const item of items) {
    if (item.id === id) {
      return { item, parent };
    }

    const found = findItemEntry(item.children, id, item);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function collectItemIds(item: ScenarioItemData): string[] {
  return [
    item.id,
    ...item.children.flatMap((child) => collectItemIds(child)),
  ];
}

function collectMoveDestinations(
  items: ScenarioItemData[],
  scenario: ScenarioData,
  blockedIds: Set<string>,
  sourceScenarioId: string,
  currentParentId?: string,
  ancestorNames: string[] = []
): MoveItemDestination[] {
  return items.flatMap((item) => {
    const nextPath = [...ancestorNames, item.name];
    const destinations: MoveItemDestination[] = [];
    const isBlocked = blockedIds.has(item.id);
    const isCurrentParent = scenario.id === sourceScenarioId && item.id === currentParentId;

    if (!isBlocked && !isCurrentParent) {
      destinations.push({
        scenarioId: scenario.id,
        parentItemId: item.id,
        label: `${scenario.name} › ${nextPath.join(" › ")}`,
        description: "Append as a child item",
        detail: `${item.filePath} · ${item.type}`,
      });
    }

    destinations.push(
      ...collectMoveDestinations(
        item.children,
        scenario,
        blockedIds,
        sourceScenarioId,
        currentParentId,
        nextPath
      )
    );

    return destinations;
  });
}

function removeItemById(
  items: ScenarioItemData[],
  id: string
): ScenarioItemData[] {
  return items
    .filter((i) => i.id !== id)
    .map((i) => ({ ...i, children: removeItemById(i.children, id) }));
}

function countScenarioItems(scenario: ScenarioData): number {
  return countNestedItems(scenario.items);
}

function countStaleItems(items: ScenarioItemData[]): number {
  return items.reduce((total, item) => {
    const location = resolveScenarioItemLocation(item);
    const selfCount = shouldUseWarningStyling(location) ? 1 : 0;
    return total + selfCount + countStaleItems(item.children);
  }, 0);
}

function countNestedItems(items: ScenarioItemData[]): number {
  return items.reduce(
    (total, item) => total + 1 + countNestedItems(item.children),
    0
  );
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatLocationWarning(location: Exclude<ScenarioItemLocationResolution, {
  status: "resolved";
}>): string {
  if (location.status === "ambiguous") {
    return `Matches multiple workspace folders: ${location.workspaceFolders.map((folder) => folder.name).join(", ")}`;
  }

  if (location.reason === "noWorkspaceFolder") {
    return "No workspace folder is open for this source file.";
  }

  if (location.reason === "workspaceFolderMissing") {
    return "Saved workspace folder is no longer available.";
  }

  return "Source file could not be found.";
}

function shouldUseWarningStyling(location: ScenarioItemLocationResolution): boolean {
  if (location.status === "resolved") {
    return false;
  }

  return (
    location.status === "ambiguous" ||
    location.reason === "fileMissing" ||
    location.reason === "workspaceFolderMissing"
  );
}

// ── File-rename helpers ───────────────────────────────────────

/**
 * Returns the unambiguous absolute path stored in an item, or `undefined` if
 * the path cannot be resolved without filesystem access:
 *   - Absolute filePath  → returned as-is (normalised).
 *   - Relative filePath + workspaceFolderUri → joined with the folder's fsPath.
 *   - Relative filePath, no workspaceFolderUri → skipped (ambiguous).
 */
function resolveItemAbsolutePathForRename(item: ScenarioItemData): string | undefined {
  if (path.isAbsolute(item.filePath)) {
    return path.normalize(item.filePath);
  }

  if (item.workspaceFolderUri) {
    const folder = (vscode.workspace.workspaceFolders ?? []).find(
      (f) => f.uri.toString() === item.workspaceFolderUri
    );
    if (folder) {
      return path.join(folder.uri.fsPath, item.filePath);
    }
  }

  return undefined;
}

/**
 * Mutates `item` in-place when any rename pair covers its absolute path.
 * Returns `true` if the item was updated.
 */
function applyRenamesToItem(
  item: ScenarioItemData,
  renames: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>
): boolean {
  const oldAbsPath = resolveItemAbsolutePathForRename(item);
  if (oldAbsPath === undefined) {
    return false;
  }

  for (const { oldUri, newUri } of renames) {
    const oldFsPath = oldUri.fsPath;
    const newFsPath = newUri.fsPath;

    let newAbsPath: string | undefined;
    if (oldAbsPath === oldFsPath) {
      // Direct file rename / move
      newAbsPath = newFsPath;
    } else if (oldAbsPath.startsWith(oldFsPath + path.sep)) {
      // Item lives inside a renamed/moved directory
      newAbsPath = newFsPath + oldAbsPath.slice(oldFsPath.length);
    }

    if (newAbsPath !== undefined) {
      const newFileUri = vscode.Uri.file(newAbsPath);
      const newWorkspaceFolder = vscode.workspace.getWorkspaceFolder(newFileUri);

      if (newWorkspaceFolder) {
        // Keep workspace-relative storage, consistent with existing conventions
        item.filePath = vscode.workspace.asRelativePath(newFileUri, false);
        item.workspaceFolderUri = newWorkspaceFolder.uri.toString();
      } else {
        // New location is outside any open workspace folder — store as absolute
        item.filePath = newAbsPath;
        delete item.workspaceFolderUri;
      }
      // For file items the label is derived from item.name (which is
      // initialised to filePath). Keep it in sync so the tree label
      // reflects the new path. Symbol items keep their symbol name.
      if (item.kind === "file") {
        item.name = item.filePath;
      }
      return true;
    }
  }

  return false;
}

/**
 * Recursively walks `items` and applies all renames. Returns `true` if any
 * item in the subtree was modified.
 */
function applyRenamesRecursively(
  items: ScenarioItemData[],
  renames: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>
): boolean {
  let changed = false;
  for (const item of items) {
    if (applyRenamesToItem(item, renames)) {
      changed = true;
    }
    if (applyRenamesRecursively(item.children, renames)) {
      changed = true;
    }
  }
  return changed;
}
