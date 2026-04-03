import * as path from "path";
import * as vscode from "vscode";
import { ScenarioData, ScenarioItemData } from "./scenarioModel";
import { resolveScenarioItemLocation, ScenarioItemLocationResolution } from "./workspacePaths";

// Union type for tree nodes
export type TreeNode = ScenarioNode | ItemNode;

export interface StaleItemMatch {
  node: ItemNode;
  scenarioName: string;
  ancestorPath?: string;
  workspaceFolderName?: string;
  staleReason: string;
}

const QUICK_ADD_SCENARIO_ID_KEY = "quickAddScenarioId";
const UNREAD_FOCUS_MODE_ENABLED_KEY = "unreadFocusModeEnabled";

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

export type CopyItemResult =
  | { ok: true; itemId: string }
  | { ok: false; reason: string };

export type DuplicateScenarioResult =
  | { ok: true; scenarioId: string }
  | { ok: false; reason: string };

interface DeletionPosition {
  index: number;
  previousSiblingId?: string;
  nextSiblingId?: string;
}

interface DeletedScenarioEntry {
  token: string;
  kind: "scenario";
  scenario: ScenarioData;
  position: DeletionPosition;
  restoreQuickAddTarget: boolean;
}

interface DeletedItemEntry {
  token: string;
  kind: "item";
  item: ScenarioItemData;
  scenarioId: string;
  parentItemId?: string;
  position: DeletionPosition;
}

type DeletedEntry = DeletedScenarioEntry | DeletedItemEntry;

export type UndoDeleteResult =
  | { ok: true }
  | { ok: false; reason: string };

type InsertionIndexResult =
  | { ok: true; index: number }
  | { ok: false; reason: string };

interface TemporaryRevealState {
  scenarioId: string;
  targetItemId: string;
  itemIds: ReadonlySet<string>;
}

export class ScenarioProvider
  implements vscode.TreeDataProvider<TreeNode>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private scenarios: ScenarioData[] = [];
  private latestDeleted?: DeletedEntry;
  private unreadFocusModeEnabled = false;
  private temporaryRevealState?: TemporaryRevealState;
  private activeFileReference: { filePath: string; workspaceFolderUri?: string } | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.load();
  }

  // ── Persistence ──────────────────────────────────────────────

  private load(): void {
    this.scenarios = this.context.workspaceState.get<ScenarioData[]>(
      "scenarios",
      []
    );
    this.unreadFocusModeEnabled = this.context.workspaceState.get<boolean>(
      UNREAD_FOCUS_MODE_ENABLED_KEY,
      false
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
   * Updates the active-file reference used to highlight matching tree items.
   * Pass `undefined` to clear the highlight (e.g. when no workspace file is active).
   * Fires a tree-data-changed event so icons repaint immediately.
   */
  setActiveFileReference(
    ref: { filePath: string; workspaceFolderUri?: string } | undefined
  ): void {
    this.activeFileReference = ref;
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

  isUnreadFocusModeEnabled(): boolean {
    return this.unreadFocusModeEnabled;
  }

  async setUnreadFocusModeEnabled(enabled: boolean): Promise<void> {
    const revealCleared = this.clearTemporaryRevealState();
    if (this.unreadFocusModeEnabled === enabled) {
      if (revealCleared) {
        this.refresh();
      }
      return;
    }

    this.unreadFocusModeEnabled = enabled;
    await this.context.workspaceState.update(UNREAD_FOCUS_MODE_ENABLED_KEY, enabled);
    this.refresh();
  }

  async ensureItemVisible(itemNode: ItemNode): Promise<boolean> {
    if (!this.unreadFocusModeEnabled || this.isNodeVisible(itemNode)) {
      return false;
    }

    const revealPath = this.getRevealPath(itemNode.scenarioId, itemNode.data.id);
    if (!revealPath) {
      return false;
    }

    const nextState: TemporaryRevealState = {
      scenarioId: itemNode.scenarioId,
      targetItemId: itemNode.data.id,
      itemIds: new Set(revealPath.map((item) => item.id)),
    };
    const changed = !hasSameTemporaryRevealState(this.temporaryRevealState, nextState);
    this.temporaryRevealState = nextState;
    if (changed) {
      this.refresh();
    }
    return changed;
  }

  clearTemporaryRevealAfterUse(itemNode?: ItemNode): boolean {
    if (!this.temporaryRevealState) {
      return false;
    }

    if (
      itemNode
      && (this.temporaryRevealState.scenarioId !== itemNode.scenarioId
        || this.temporaryRevealState.targetItemId !== itemNode.data.id)
      ) {
      return false;
    }

    const cleared = this.clearTemporaryRevealState();
    if (cleared) {
      this.refresh();
    }
    return cleared;
  }

  isNodeVisible(node: TreeNode): boolean {
    if (!this.unreadFocusModeEnabled) {
      return true;
    }

    if (node.kind === "scenario") {
      return scenarioHasUnreadItems(node.data);
    }

    const scenario = this.getScenarioById(node.scenarioId);
    if (!scenario || !scenarioHasUnreadItems(scenario)) {
      return false;
    }

    return itemHasUnreadInSubtree(node.data);
  }

  getViewMessage(): string | undefined {
    if (!this.unreadFocusModeEnabled) {
      return undefined;
    }

    return this.getVisibleScenarios().length === 0
      ? "Unread Focus Mode is on. No unread items to show."
      : undefined;
  }

  getScenarioById(scenarioId: string): ScenarioData | undefined {
    return this.scenarios.find((scenario) => scenario.id === scenarioId);
  }

  getStaleItemMatches(): StaleItemMatch[] {
    const results: StaleItemMatch[] = [];
    for (const scenario of this.scenarios) {
      collectStaleItemMatchesFromItems(
        scenario.items,
        scenario.id,
        scenario.name,
        results
      );
    }
    return results;
  }

  private getQuickAddScenarioId(): string | undefined {
    return this.context.workspaceState.get<string>(QUICK_ADD_SCENARIO_ID_KEY);
  }

  getQuickAddScenario(): ScenarioData | undefined {
    const scenarioId = this.getQuickAddScenarioId();
    if (!scenarioId) {
      return undefined;
    }

    return this.getScenarioById(scenarioId);
  }

  getEffectiveQuickAddScenario(): ScenarioData | undefined {
    const quickAddScenario = this.getQuickAddScenario();
    if (quickAddScenario) {
      return quickAddScenario;
    }

    if (this.scenarios.length === 1) {
      return this.scenarios[0];
    }

    return undefined;
  }

  isQuickAddScenario(scenarioId: string): boolean {
    return this.getQuickAddScenarioId() === scenarioId;
  }

  async setQuickAddScenario(scenarioId: string | undefined): Promise<void> {
    if (this.getQuickAddScenarioId() === scenarioId) {
      return;
    }
    await this.context.workspaceState.update(QUICK_ADD_SCENARIO_ID_KEY, scenarioId);
    this.refresh();
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

  async duplicateScenario(
    sourceScenarioId: string,
    name: string
  ): Promise<DuplicateScenarioResult> {
    const sourceScenarioIndex = this.scenarios.findIndex((scenario) => scenario.id === sourceScenarioId);
    if (sourceScenarioIndex === -1) {
      return { ok: false, reason: "Scenario to duplicate was not found." };
    }

    const duplicatedScenario = cloneScenarioWithFreshIds(
      this.scenarios[sourceScenarioIndex],
      name
    );
    this.scenarios.splice(sourceScenarioIndex + 1, 0, duplicatedScenario);

    await this.save();
    this.refresh();
    return { ok: true, scenarioId: duplicatedScenario.id };
  }

  async deleteScenario(scenarioId: string): Promise<string | undefined> {
    const scenarioIndex = this.scenarios.findIndex((scenario) => scenario.id === scenarioId);
    if (scenarioIndex === -1) {
      return undefined;
    }

    const deletedScenario = this.scenarios[scenarioIndex];
    this.latestDeleted = {
      token: generateId(),
      kind: "scenario",
      scenario: cloneScenario(deletedScenario),
      position: {
        index: scenarioIndex,
        previousSiblingId: this.scenarios[scenarioIndex - 1]?.id,
        nextSiblingId: this.scenarios[scenarioIndex + 1]?.id,
      },
      restoreQuickAddTarget: this.isQuickAddScenario(scenarioId),
    };

    this.scenarios.splice(scenarioIndex, 1);
    if (this.latestDeleted.restoreQuickAddTarget) {
      await this.context.workspaceState.update(QUICK_ADD_SCENARIO_ID_KEY, undefined);
    }
    await this.save();
    this.refresh();
    return this.latestDeleted.token;
  }

  async renameScenario(scenarioId: string, newName: string): Promise<void> {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      scenario.name = newName;
      await this.save();
      this.refresh();
    }
  }

  async editScenarioNote(scenarioId: string, note: string | undefined): Promise<void> {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      if (note) {
        scenario.note = note;
      } else {
        delete scenario.note;
      }
      await this.save();
      this.refresh();
    }
  }

  async addItem(
    parentScenarioId: string,
    parentItemId: string | undefined,
    itemData: Omit<ScenarioItemData, "id" | "children">
  ): Promise<string | undefined> {
    const scenario = this.scenarios.find((s) => s.id === parentScenarioId);
    if (!scenario) { return undefined; }

    const item = createScenarioItem(itemData);
    if (parentItemId) {
      const parent = findItemById(scenario.items, parentItemId);
      if (!parent) { return undefined; }
      parent.children.push(item);
    } else {
      scenario.items.push(item);
    }

    await this.save();
    this.refresh();
    return item.id;
  }

  async addItemBelow(
    scenarioId: string,
    targetItemId: string,
    itemData: Omit<ScenarioItemData, "id" | "children">
  ): Promise<string | undefined> {
    const scenario = this.scenarios.find((entry) => entry.id === scenarioId);
    if (!scenario) {
      return undefined;
    }

    const targetEntry = findItemEntry(scenario.items, targetItemId);
    if (!targetEntry) {
      return undefined;
    }

    const siblings = targetEntry.parent ? targetEntry.parent.children : scenario.items;
    const targetIndex = siblings.findIndex((item) => item.id === targetItemId);
    if (targetIndex === -1) {
      return undefined;
    }

    const item = createScenarioItem(itemData);
    siblings.splice(targetIndex + 1, 0, item);

    await this.save();
    this.refresh();
    return item.id;
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

  async setItemVisited(
    scenarioId: string,
    itemId: string,
    visited: boolean
  ): Promise<"updated" | "noop" | "notFound"> {
    const scenario = this.scenarios.find((entry) => entry.id === scenarioId);
    if (!scenario) {
      return "notFound";
    }

    const item = findItemById(scenario.items, itemId);
    if (!item) {
      return "notFound";
    }

    if (Boolean(item.visited) === visited) {
      return "noop";
    }

    item.visited = visited;
    await this.save();
    this.refresh();
    return "updated";
  }

  async markItemVisited(scenarioId: string, itemId: string): Promise<void> {
    await this.setItemVisited(scenarioId, itemId, true);
  }

  async markItemUnvisited(scenarioId: string, itemId: string): Promise<void> {
    await this.setItemVisited(scenarioId, itemId, false);
  }

  async resetScenarioVisitedState(scenarioId: string): Promise<number | undefined> {
    const scenario = this.scenarios.find((entry) => entry.id === scenarioId);
    if (!scenario) {
      return undefined;
    }

    const resetCount = resetVisitedState(scenario.items);
    if (resetCount === 0) {
      return 0;
    }

    await this.save();
    this.refresh();
    return resetCount;
  }

  async markAllScenarioItemsRead(scenarioId: string): Promise<number | undefined> {
    const scenario = this.scenarios.find((entry) => entry.id === scenarioId);
    if (!scenario) {
      return undefined;
    }

    const markedCount = markAllVisited(scenario.items);
    if (markedCount === 0) {
      return 0;
    }

    await this.save();
    this.refresh();
    return markedCount;
  }

  async setSubtreeVisited(
    scenarioId: string,
    itemId: string,
    visited: boolean
  ): Promise<"updated" | "noop" | "notFound"> {
    const scenario = this.scenarios.find((entry) => entry.id === scenarioId);
    if (!scenario) {
      return "notFound";
    }

    const item = findItemById(scenario.items, itemId);
    if (!item) {
      return "notFound";
    }

    const changedCount = setSubtreeVisitedState(item, visited);
    if (changedCount === 0) {
      return "noop";
    }

    await this.save();
    this.refresh();
    return "updated";
  }

  async deleteItem(scenarioId: string, itemId: string): Promise<string | undefined> {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) { return undefined; }

    const entry = findItemEntry(scenario.items, itemId);
    if (!entry) {
      return undefined;
    }

    const siblings = entry.parent ? entry.parent.children : scenario.items;
    const itemIndex = siblings.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      return undefined;
    }

    this.latestDeleted = {
      token: generateId(),
      kind: "item",
      item: cloneItem(entry.item),
      scenarioId,
      parentItemId: entry.parent?.id,
      position: {
        index: itemIndex,
        previousSiblingId: siblings[itemIndex - 1]?.id,
        nextSiblingId: siblings[itemIndex + 1]?.id,
      },
    };

    siblings.splice(itemIndex, 1);
    await this.save();
    this.refresh();
    return this.latestDeleted.token;
  }

  async undoDelete(token: string): Promise<UndoDeleteResult> {
    if (!this.latestDeleted || this.latestDeleted.token !== token) {
      return {
        ok: false,
        reason: "This delete can no longer be undone because a newer delete replaced it.",
      };
    }

    const deletedEntry = this.latestDeleted;
    this.latestDeleted = undefined;

    if (deletedEntry.kind === "scenario") {
      const existingScenario = this.getScenarioById(deletedEntry.scenario.id);
      if (existingScenario) {
        return {
          ok: false,
          reason: "Undo is no longer available because the deleted scenario already exists.",
        };
      }

      const insertionIndex = resolveInsertionIndex(
        this.scenarios,
        deletedEntry.position,
        "Undo is no longer available because the original scenario position changed."
      );
      if (!insertionIndex.ok) {
        return insertionIndex;
      }

      this.scenarios.splice(insertionIndex.index, 0, cloneScenario(deletedEntry.scenario));
      if (deletedEntry.restoreQuickAddTarget) {
        await this.context.workspaceState.update(
          QUICK_ADD_SCENARIO_ID_KEY,
          deletedEntry.scenario.id
        );
      }
      await this.save();
      this.refresh();
      return { ok: true };
    }

    const scenario = this.getScenarioById(deletedEntry.scenarioId);
    if (!scenario) {
      return {
        ok: false,
        reason: "Undo is no longer available because the original scenario no longer exists.",
      };
    }

    let siblings: ScenarioItemData[];
    if (deletedEntry.parentItemId) {
      const parent = findItemById(scenario.items, deletedEntry.parentItemId);
      if (!parent) {
        return {
          ok: false,
          reason: "Undo is no longer available because the original parent item no longer exists.",
        };
      }
      siblings = parent.children;
    } else {
      siblings = scenario.items;
    }

    if (findItemById(scenario.items, deletedEntry.item.id)) {
      return {
        ok: false,
        reason: "Undo is no longer available because the deleted item already exists.",
      };
    }

    const insertionIndex = resolveInsertionIndex(
      siblings,
      deletedEntry.position,
      "Undo is no longer available because the original item position changed."
    );
    if (!insertionIndex.ok) {
      return insertionIndex;
    }

    siblings.splice(insertionIndex.index, 0, cloneItem(deletedEntry.item));
    await this.save();
    this.refresh();
    return { ok: true };
  }

  getMoveItemDestinations(
    sourceScenarioId: string,
    itemId: string
  ): MoveItemDestination[] {
    return this.getItemDestinations(sourceScenarioId, itemId, {
      excludeCurrentRoot: true,
      excludeCurrentParent: true,
    });
  }

  getCopyItemDestinations(
    sourceScenarioId: string,
    itemId: string
  ): MoveItemDestination[] {
    return this.getItemDestinations(sourceScenarioId, itemId, {
      excludeCurrentRoot: false,
      excludeCurrentParent: false,
    });
  }

  private getItemDestinations(
    sourceScenarioId: string,
    itemId: string,
    options: {
      excludeCurrentRoot: boolean;
      excludeCurrentParent: boolean;
    }
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
      if (!(options.excludeCurrentRoot && isCurrentRoot)) {
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
        options.excludeCurrentParent ? sourceEntry.parent?.id : undefined
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

  async copyItem(
    sourceScenarioId: string,
    itemId: string,
    destinationScenarioId: string,
    destinationParentItemId?: string
  ): Promise<CopyItemResult> {
    const sourceScenario = this.scenarios.find((scenario) => scenario.id === sourceScenarioId);
    if (!sourceScenario) {
      return { ok: false, reason: "Source scenario was not found." };
    }

    const sourceEntry = findItemEntry(sourceScenario.items, itemId);
    if (!sourceEntry) {
      return { ok: false, reason: "Item to copy was not found." };
    }

    const destinationScenario = this.scenarios.find((scenario) => scenario.id === destinationScenarioId);
    if (!destinationScenario) {
      return { ok: false, reason: "Destination scenario was not found." };
    }

    const blockedIds = new Set(collectItemIds(sourceEntry.item));
    if (destinationParentItemId && blockedIds.has(destinationParentItemId)) {
      return { ok: false, reason: "An item cannot be copied into itself or one of its descendants." };
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

    const copiedItem = cloneItemWithFreshIds(sourceEntry.item);
    destinationChildren.push(copiedItem);

    await this.save();
    this.refresh();
    return { ok: true, itemId: copiedItem.id };
  }

  findItem(scenarioId: string, itemId: string): ScenarioItemData | undefined {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) { return undefined; }
    return findItemById(scenario.items, itemId);
  }

  /**
   * Returns all items of the given scenario as a flat array in depth-first
   * tree order — the same visual order as displayed in the tree view.
   */
  getFlatItemNodes(scenarioId: string): ItemNode[] {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) { return []; }
    const result: ItemNode[] = [];
    collectItemNodesDfs(scenario.items, scenarioId, result);
    return result;
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

  /**
   * Reorders scenarios so that `sourceScenarioId` sits immediately after
   * `targetScenarioId` in the top-level scenario list.
   */
  async moveScenarioAfter(
    sourceScenarioId: string,
    targetScenarioId: string,
  ): Promise<MoveItemResult> {
    // Self-drop
    if (sourceScenarioId === targetScenarioId) {
      return { ok: false, reason: "", isNoOp: true };
    }

    const sourceIdx = this.scenarios.findIndex((s) => s.id === sourceScenarioId);
    if (sourceIdx === -1) {
      return { ok: false, reason: "Source scenario was not found." };
    }

    const targetIdx = this.scenarios.findIndex((s) => s.id === targetScenarioId);
    if (targetIdx === -1) {
      return { ok: false, reason: "Target scenario was not found." };
    }

    // No-op: source is already immediately after target
    if (sourceIdx === targetIdx + 1) {
      return { ok: false, reason: "", isNoOp: true };
    }

    const [movedScenario] = this.scenarios.splice(sourceIdx, 1);
    // Re-find target after the splice (its index may have shifted by -1)
    const newTargetIdx = this.scenarios.findIndex((s) => s.id === targetScenarioId);
    this.scenarios.splice(newTargetIdx + 1, 0, movedScenario);

    await this.save();
    this.refresh();
    return { ok: true };
  }

  // ── TreeDataProvider ─────────────────────────────────────────

  getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.kind === "scenario") {
      const totalItemCount = countScenarioItems(node.data);
      const topLevelItemCount = node.data.items.length;
      const visibleChildren = this.getVisibleChildrenForScenario(node.data);
      const hasVisibleChildren = visibleChildren.length > 0;
      const hasAnyChildren = topLevelItemCount > 0;
      const staleCount = countStaleItems(node.data.items);
      const isQuickAddTarget = this.isQuickAddScenario(node.data.id);
      const item = new vscode.TreeItem(
        node.data.name,
        hasVisibleChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.id = node.data.id;
      item.contextValue = isQuickAddTarget ? "scenarioQuickAdd" : "scenario";
      item.iconPath = staleCount > 0
        ? new vscode.ThemeIcon("warning", new vscode.ThemeColor("list.warningForeground"))
        : new vscode.ThemeIcon("list-unordered");
      const visitedCount = countVisitedItems(node.data.items);
      item.description = [
        totalItemCount > 0 ? `${visitedCount}/${totalItemCount} read` : formatCount(totalItemCount, "item"),
        isQuickAddTarget ? "Quick Add" : undefined,
        staleCount > 0 ? `⚠ ${staleCount} stale` : undefined,
        node.data.note ? "✎" : undefined,
      ].filter(Boolean).join(" · ");
      item.tooltip = hasAnyChildren
        ? `${node.data.name}\n${visitedCount}/${totalItemCount} read across ${formatCount(topLevelItemCount, "top-level item")}`
        : `${node.data.name}\nNo items yet`;
      if (isQuickAddTarget) {
        item.tooltip = `${item.tooltip}\nQuick Add target for editor-driven adds`;
      }
      if (node.data.note) {
        item.tooltip = `${item.tooltip}\n${node.data.note}`;
      }
      if (staleCount > 0) {
        item.tooltip = `${item.tooltip}\n⚠ ${staleCount} stale item(s) — file path cannot be resolved`;
      }
      return item;
    } else {
      const visibleChildren = this.getVisibleChildrenForItem(node.data);
      const hasVisibleChildren = visibleChildren.length > 0;
      const hasAnyChildren = node.data.children.length > 0;
      const location = resolveScenarioItemLocation(node.data);
      const item = new vscode.TreeItem(
        node.data.name,
        hasVisibleChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.id = node.data.id;
      item.contextValue = getItemContextValue(node.data, location);
      const descriptionParts = [
        node.data.kind === "symbol" ? node.data.type : undefined,
        node.data.filePath,
        hasAnyChildren ? formatCount(node.data.children.length, "child") : undefined,
        node.data.visited ? "read" : undefined,
        node.data.note ? "✎" : undefined,
      ].filter(Boolean);
      item.description = descriptionParts.join(" · ");
      const actionHint = location.status === "resolved"
        ? "Click to open in the editor."
        : "Click to review file resolution or edit this item.";
      const noteSection = node.data.note ? `\n${node.data.note}` : "";
      item.tooltip = hasAnyChildren
        ? `${node.data.name} (${node.data.type})\n${node.data.filePath}\n${formatCount(node.data.children.length, "child")}${noteSection}\n${actionHint}`
        : `${node.data.name} (${node.data.type})\n${node.data.filePath}${noteSection}\n${actionHint}`;
      if (node.data.visited) {
        item.tooltip = `${item.tooltip}\nRead`;
      }
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
      } else if (this.isActiveFileMatch(node.data)) {
        item.iconPath = node.data.kind === "file"
          ? new vscode.ThemeIcon("go-to-file", new vscode.ThemeColor("list.highlightForeground"))
          : new vscode.ThemeIcon("symbol-function", new vscode.ThemeColor("list.highlightForeground"));
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
      return this.getVisibleScenarios().map((s) => new ScenarioNode(s));
    }
    if (node.kind === "scenario") {
      return this.getVisibleChildrenForScenario(node.data).map((i) => new ItemNode(i, node.data.id));
    }
    if (node.kind === "item") {
      return this.getVisibleChildrenForItem(node.data).map((c) => new ItemNode(c, node.scenarioId));
    }
    return [];
  }

  private getVisibleScenarios(): ScenarioData[] {
    if (!this.unreadFocusModeEnabled) {
      return this.scenarios;
    }

    return this.scenarios.filter((scenario) =>
      scenarioHasUnreadItems(scenario) || this.isScenarioTemporarilyVisible(scenario.id)
    );
  }

  private getVisibleChildrenForScenario(scenario: ScenarioData): ScenarioItemData[] {
    if (!this.unreadFocusModeEnabled) {
      return scenario.items;
    }

    return scenario.items.filter((item) =>
      itemHasUnreadInSubtree(item) || this.isItemTemporarilyVisible(scenario.id, item.id)
    );
  }

  private getVisibleChildrenForItem(item: ScenarioItemData): ScenarioItemData[] {
    if (!this.unreadFocusModeEnabled) {
      return item.children;
    }

    return item.children.filter((child) =>
      itemHasUnreadInSubtree(child) || this.isItemTemporarilyVisible(undefined, child.id)
    );
  }

  private getRevealPath(
    scenarioId: string,
    itemId: string
  ): ScenarioItemData[] | undefined {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) {
      return undefined;
    }

    return findItemPathById(scenario.items, itemId);
  }

  private isScenarioTemporarilyVisible(scenarioId: string): boolean {
    return this.hasValidTemporaryRevealState(scenarioId);
  }

  private isItemTemporarilyVisible(
    scenarioId: string | undefined,
    itemId: string
  ): boolean {
    if (!this.hasValidTemporaryRevealState(scenarioId)) {
      return false;
    }

    return this.temporaryRevealState?.itemIds.has(itemId) ?? false;
  }

  private clearTemporaryRevealState(): boolean {
    if (!this.temporaryRevealState) {
      return false;
    }

    this.temporaryRevealState = undefined;
    return true;
  }

  private hasValidTemporaryRevealState(scenarioId?: string): boolean {
    const revealState = this.temporaryRevealState;
    if (!revealState) {
      return false;
    }

    if (scenarioId && revealState.scenarioId !== scenarioId) {
      return false;
    }

    return this.findItem(revealState.scenarioId, revealState.targetItemId) !== undefined;
  }

  // ── Private helpers ───────────────────────────────────────────

  /**
   * Returns true when `item`'s file path matches the currently tracked active
   * file reference. An item without a `workspaceFolderUri` is treated as
   * potentially matching any folder (consistent with reveal/duplicate logic).
   */
  private isActiveFileMatch(item: ScenarioItemData): boolean {
    if (!this.activeFileReference) { return false; }
    const pathMatches = item.filePath === this.activeFileReference.filePath;
    const folderMatches =
      item.workspaceFolderUri === undefined ||
      this.activeFileReference.workspaceFolderUri === undefined ||
      item.workspaceFolderUri === this.activeFileReference.workspaceFolderUri;
    return pathMatches && folderMatches;
  }
}

// ── Helpers ───────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function createScenarioItem(
  itemData: Omit<ScenarioItemData, "id" | "children">
): ScenarioItemData {
  return {
    ...itemData,
    id: generateId(),
    children: [],
  };
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

function findItemPathById(
  items: ScenarioItemData[],
  id: string
): ScenarioItemData[] | undefined {
  for (const item of items) {
    if (item.id === id) {
      return [item];
    }

    const childPath = findItemPathById(item.children, id);
    if (childPath) {
      return [item, ...childPath];
    }
  }

  return undefined;
}

function hasSameTemporaryRevealState(
  current: TemporaryRevealState | undefined,
  next: TemporaryRevealState
): boolean {
  if (!current || current.scenarioId !== next.scenarioId) {
    return false;
  }

  if (current.targetItemId !== next.targetItemId) {
    return false;
  }

  if (current.itemIds.size !== next.itemIds.size) {
    return false;
  }

  for (const itemId of current.itemIds) {
    if (!next.itemIds.has(itemId)) {
      return false;
    }
  }

  return true;
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

function countScenarioItems(scenario: ScenarioData): number {
  return countNestedItems(scenario.items);
}

function scenarioHasUnreadItems(scenario: ScenarioData): boolean {
  return scenario.items.some((item) => itemHasUnreadInSubtree(item));
}

function itemHasUnreadInSubtree(item: ScenarioItemData): boolean {
  if (!item.visited) {
    return true;
  }

  return item.children.some((child) => itemHasUnreadInSubtree(child));
}

function countStaleItems(items: ScenarioItemData[]): number {
  return items.reduce((total, item) => {
    const location = resolveScenarioItemLocation(item);
    const selfCount = shouldUseWarningStyling(location) ? 1 : 0;
    return total + selfCount + countStaleItems(item.children);
  }, 0);
}

function countVisitedItems(items: ScenarioItemData[]): number {
  return items.reduce(
    (total, item) => total + (item.visited ? 1 : 0) + countVisitedItems(item.children),
    0
  );
}

function countNestedItems(items: ScenarioItemData[]): number {
  return items.reduce(
    (total, item) => total + 1 + countNestedItems(item.children),
    0
  );
}

function cloneItemWithFreshIds(item: ScenarioItemData): ScenarioItemData {
  return {
    ...item,
    id: generateId(),
    visited: false,
    children: item.children.map((child) => cloneItemWithFreshIds(child)),
  };
}

function cloneScenarioWithFreshIds(scenario: ScenarioData, name: string): ScenarioData {
  return {
    ...scenario,
    id: generateId(),
    name,
    items: scenario.items.map((item) => cloneItemWithFreshIds(item)),
  };
}

function cloneScenario(scenario: ScenarioData): ScenarioData {
  return {
    ...scenario,
    items: scenario.items.map((item) => cloneItem(item)),
  };
}

function cloneItem(item: ScenarioItemData): ScenarioItemData {
  return {
    ...item,
    children: item.children.map((child) => cloneItem(child)),
  };
}

function resetVisitedState(items: ScenarioItemData[]): number {
  return items.reduce((total, item) => {
    const selfCount = item.visited ? 1 : 0;
    item.visited = false;
    return total + selfCount + resetVisitedState(item.children);
  }, 0);
}

function markAllVisited(items: ScenarioItemData[]): number {
  return items.reduce((total, item) => {
    const selfCount = item.visited ? 0 : 1;
    item.visited = true;
    return total + selfCount + markAllVisited(item.children);
  }, 0);
}

function setSubtreeVisitedState(item: ScenarioItemData, visited: boolean): number {
  const selfCount = Boolean(item.visited) === visited ? 0 : 1;
  item.visited = visited;
  return item.children.reduce(
    (total, child) => total + setSubtreeVisitedState(child, visited),
    selfCount
  );
}

function getItemContextValue(
  item: ScenarioItemData,
  location: ScenarioItemLocationResolution
): string {
  const stalePrefix = shouldUseWarningStyling(location) ? "scenarioItemStale" : "scenarioItem";
  return `${stalePrefix}${item.visited ? "Read" : "Unread"}`;
}

function resolveInsertionIndex<T extends { id: string }>(
  siblings: T[],
  position: DeletionPosition,
  positionChangedReason: string
): InsertionIndexResult {
  const { previousSiblingId, nextSiblingId, index } = position;

  if (previousSiblingId && nextSiblingId) {
    const previousIndex = siblings.findIndex((item) => item.id === previousSiblingId);
    const nextIndex = siblings.findIndex((item) => item.id === nextSiblingId);
    if (previousIndex === -1 || nextIndex === -1 || nextIndex !== previousIndex + 1) {
      return { ok: false, reason: positionChangedReason };
    }
    return { ok: true, index: nextIndex };
  }

  if (previousSiblingId) {
    const previousIndex = siblings.findIndex((item) => item.id === previousSiblingId);
    if (previousIndex === -1 || previousIndex !== siblings.length - 1) {
      return { ok: false, reason: positionChangedReason };
    }
    return { ok: true, index: previousIndex + 1 };
  }

  if (nextSiblingId) {
    const nextIndex = siblings.findIndex((item) => item.id === nextSiblingId);
    if (nextIndex === -1 || nextIndex !== 0) {
      return { ok: false, reason: positionChangedReason };
    }
    return { ok: true, index: nextIndex };
  }

  if (index > siblings.length) {
    return { ok: false, reason: positionChangedReason };
  }

  return { ok: true, index };
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

function collectStaleItemMatchesFromItems(
  items: ScenarioItemData[],
  scenarioId: string,
  scenarioName: string,
  results: StaleItemMatch[],
  ancestorNames: string[] = []
): void {
  for (const item of items) {
    const location = resolveScenarioItemLocation(item);
    if (location.status !== "resolved" && shouldUseWarningStyling(location)) {
      results.push({
        node: new ItemNode(item, scenarioId),
        scenarioName,
        ancestorPath: ancestorNames.length > 0 ? ancestorNames.join(" › ") : undefined,
        workspaceFolderName: getWorkspaceFolderName(item.workspaceFolderUri),
        staleReason: formatLocationWarning(location),
      });
    }

    collectStaleItemMatchesFromItems(
      item.children,
      scenarioId,
      scenarioName,
      results,
      [...ancestorNames, item.name]
    );
  }
}

function getWorkspaceFolderName(workspaceFolderUri: string | undefined): string | undefined {
  if (!workspaceFolderUri) {
    return undefined;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(workspaceFolderUri));
  return workspaceFolder?.name;
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

/**
 * Depth-first traversal: pushes every item node reachable from `items` into
 * `result` in the same order as displayed in the tree view.
 */
function collectItemNodesDfs(
  items: ScenarioItemData[],
  scenarioId: string,
  result: ItemNode[]
): void {
  for (const item of items) {
    result.push(new ItemNode(item, scenarioId));
    collectItemNodesDfs(item.children, scenarioId, result);
  }
}
