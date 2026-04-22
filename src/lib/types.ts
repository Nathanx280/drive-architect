export type RuleMatch = "ext" | "keyword" | "regex" | "size" | "date";
export type SizeOp = "gt" | "lt";
export type DateOp = "older" | "newer";

export type SortRule = {
  id: string;
  name: string;
  match: RuleMatch;
  /** comma-separated extensions, like ".jpg,.png" or "*" for any (when match=ext) */
  extensions: string;
  /** filename keyword(s), comma separated (when match=keyword) */
  keyword?: string;
  /** regex pattern (when match=regex) */
  regex?: string;
  /** size threshold in MB (when match=size) */
  sizeMb?: number;
  sizeOp?: SizeOp;
  /** age threshold in days (when match=date) */
  days?: number;
  dateOp?: DateOp;
  /** target subfolder path relative to the parent node (e.g. "Pictures") */
  target: string;
  /** source folder on user's machine */
  source: string;
  /** when true, group output by year/month e.g. /2026/04 */
  archiveByDate?: boolean;
  /** copy or move just this rule (overrides global mode if set) */
  modeOverride?: "copy" | "move" | null;
  /** include subfolders recursively */
  recursive?: boolean;
};

export type FolderNode = {
  id: string;
  name: string;
  /** optional emoji/icon */
  icon?: string;
  /** optional color hint (oklch or any css color) */
  color?: string;
  children: FolderNode[];
  rules: SortRule[];
};

export type Layout = {
  id: string;
  name: string;
  rootPath: string;
  tree: FolderNode;
  createdAt: number;
  updatedAt: number;
  notes?: string;
};

export type ScriptKind = "bat" | "ps1" | "sh";
export type Mode = "move" | "copy";
