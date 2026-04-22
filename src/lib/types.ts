export type SortRule = {
  id: string;
  name: string;
  /** comma-separated extensions, like ".jpg,.png" or "*" for any */
  extensions: string;
  /** target subfolder path relative to the parent node (e.g. "Pictures") */
  target: string;
  /** source folder on user's machine, like "%USERPROFILE%\\Desktop" */
  source: string;
};

export type FolderNode = {
  id: string;
  name: string;
  children: FolderNode[];
  rules: SortRule[];
};

export type Layout = {
  id: string;
  name: string;
  rootPath: string; // e.g. "C:\\"
  tree: FolderNode;
  createdAt: number;
  updatedAt: number;
};

export type ScriptKind = "bat" | "ps1";
export type Mode = "move" | "copy";
