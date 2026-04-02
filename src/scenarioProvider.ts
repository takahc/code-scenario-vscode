import * as vscode from "vscode";
import { ScenarioData, ScenarioItemData } from "./scenarioModel";
import { resolveScenarioItemLocation, ScenarioItemLocationResolution } from "./workspacePaths";

// Union type for tree nodes
export type TreeNode = ScenarioNode | ItemNode;

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
  | { ok: false; reason: string };

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

  getScenarios(): ScenarioData[] {
    return this.scenarios;
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
      const { workspaceFolderUri, ...restUpdates } = updates;
      Object.assign(item, restUpdates);

      if ("workspaceFolderUri" in updates) {
        if (workspaceFolderUri === undefined) {
          delete item.workspaceFolderUri;
        } else {
          item.workspaceFolderUri = workspaceFolderUri;
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
      return { ok: false, reason: "Select a different destination." };
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
      item.tooltip = hasChildren
        ? `${node.data.name} (${node.data.type})\n${node.data.filePath}\n${formatCount(node.data.children.length, "child")}\n${actionHint}`
        : `${node.data.name} (${node.data.type})\n${node.data.filePath}\n${actionHint}`;
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
