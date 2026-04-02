import * as vscode from "vscode";
import { ScenarioData, ScenarioItemData } from "./scenarioModel";

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

  // ── TreeDataProvider ─────────────────────────────────────────

  getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.kind === "scenario") {
      const totalItemCount = countScenarioItems(node.data);
      const topLevelItemCount = node.data.items.length;
      const hasChildren = topLevelItemCount > 0;
      const item = new vscode.TreeItem(
        node.data.name,
        hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.contextValue = "scenario";
      item.iconPath = new vscode.ThemeIcon("list-unordered");
      item.description = formatCount(totalItemCount, "item");
      item.tooltip = hasChildren
        ? `${node.data.name}\n${formatCount(totalItemCount, "total item")} across ${formatCount(topLevelItemCount, "top-level item")}`
        : `${node.data.name}\nNo items yet`;
      return item;
    } else {
      const label = `${node.data.name}  |  ${node.data.type}`;
      const hasChildren = node.data.children.length > 0;
      const item = new vscode.TreeItem(
        label,
        hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.contextValue = "scenarioItem";
      item.description = hasChildren
        ? `${node.data.filePath} · ${formatCount(node.data.children.length, "child")}`
        : node.data.filePath;
      item.tooltip = hasChildren
        ? `${node.data.name} (${node.data.type})\n${node.data.filePath}\n${formatCount(node.data.children.length, "child")}`
        : `${node.data.name} (${node.data.type})\n${node.data.filePath}`;
      item.iconPath = node.data.kind === "file"
        ? new vscode.ThemeIcon("file")
        : new vscode.ThemeIcon("symbol-function");

      // Command to open the file when clicked
      item.command = {
        command: "code-scenario.openItem",
        title: "Open",
        arguments: [node],
      };

      return item;
    }
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

function countNestedItems(items: ScenarioItemData[]): number {
  return items.reduce(
    (total, item) => total + 1 + countNestedItems(item.children),
    0
  );
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
