export const ITEM_TYPES = [
  "declare",
  "definition",
  "call",
  "codeblock",
  "reference",
  "file",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export interface ScenarioItemData {
  id: string;
  /** Symbol name (e.g. function name) or relative file path */
  name: string;
  /** Whether this entry is a file path or a symbol */
  kind: "symbol" | "file";
  /** The type context of this item */
  type: ItemType;
  /** Relative path to the file (relative to the owning workspace folder) */
  filePath: string;
  /** Owning workspace folder URI for multi-root workspace resolution */
  workspaceFolderUri?: string;
  /** Cached line number (0-based), -1 if not yet resolved */
  line: number;
  /** Optional free-text note attached to this item */
  note?: string;
  /** Whether this item has been successfully opened */
  visited?: boolean;
  /** Child items */
  children: ScenarioItemData[];
}

export interface ScenarioData {
  id: string;
  name: string;
  /** Optional free-text note attached to this scenario */
  note?: string;
  items: ScenarioItemData[];
}

export interface WorkspaceState {
  scenarios: ScenarioData[];
}
