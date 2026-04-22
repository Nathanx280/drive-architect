import { useState } from "react";
import type { FolderNode, SortRule } from "@/lib/types";
import { uid } from "@/lib/uid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  node: FolderNode;
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (next: FolderNode) => void;
  depth?: number;
};

const updateNode = (
  root: FolderNode,
  id: string,
  fn: (n: FolderNode) => FolderNode
): FolderNode => {
  if (root.id === id) return fn(root);
  return { ...root, children: root.children.map((c) => updateNode(c, id, fn)) };
};

const removeNode = (root: FolderNode, id: string): FolderNode => ({
  ...root,
  children: root.children
    .filter((c) => c.id !== id)
    .map((c) => removeNode(c, id)),
});

export const treeOps = { updateNode, removeNode };

export const newFolder = (name = "New Folder"): FolderNode => ({
  id: uid(),
  name,
  children: [],
  rules: [],
});

export const newRule = (): SortRule => ({
  id: uid(),
  name: "New Rule",
  extensions: ".jpg,.png",
  target: "",
  source: "%USERPROFILE%\\Downloads",
});

function TreeRow({ node, selectedId, onSelect, onChange, depth = 0 }: Props) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const isSelected = selectedId === node.id;

  const commitName = () => {
    setEditing(false);
    if (name.trim() && name !== node.name) {
      onChange({ ...node, name: name.trim() });
    } else {
      setName(node.name);
    }
  };

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/15 text-primary ring-1 ring-primary/40"
            : "hover:bg-muted/60 text-foreground/90"
        )}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
          />
        </button>
        {open ? (
          <FolderOpen className="size-4 text-primary" />
        ) : (
          <Folder className="size-4 text-primary/80" />
        )}
        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setName(node.name);
                  setEditing(false);
                }
              }}
              className="h-6 px-1.5 text-sm"
            />
            <button onClick={commitName} className="text-success">
              <Check className="size-3.5" />
            </button>
            <button
              onClick={() => {
                setName(node.name);
                setEditing(false);
              }}
              className="text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 truncate font-mono-tight">{node.name}</span>
            {node.rules.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-neon">
                <Zap className="size-3" />
                {node.rules.length}
              </span>
            )}
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                className="text-muted-foreground hover:text-foreground p-0.5"
                title="Rename"
              >
                <Pencil className="size-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({
                    ...node,
                    children: [...node.children, newFolder()],
                  });
                  setOpen(true);
                }}
                className="text-muted-foreground hover:text-primary p-0.5"
                title="Add child"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </>
        )}
      </div>
      {open &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
            onChange={(updatedChild) => {
              onChange({
                ...node,
                children: node.children.map((c) =>
                  c.id === child.id ? updatedChild : c
                ),
              });
            }}
          />
        ))}
    </div>
  );
}

export function FolderTree({
  root,
  selectedId,
  onSelect,
  onChange,
}: {
  root: FolderNode;
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (next: FolderNode) => void;
}) {
  return (
    <div className="space-y-0.5">
      <TreeRow
        node={root}
        selectedId={selectedId}
        onSelect={onSelect}
        onChange={onChange}
      />
      <div className="pt-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() =>
            onChange({ ...root, children: [...root.children, newFolder()] })
          }
        >
          <Plus className="size-3.5" /> Add root folder
        </Button>
      </div>
    </div>
  );
}

export function NodeProperties({
  root,
  selectedId,
  onChange,
}: {
  root: FolderNode;
  selectedId: string;
  onChange: (next: FolderNode) => void;
}) {
  const findNode = (n: FolderNode): FolderNode | null => {
    if (n.id === selectedId) return n;
    for (const c of n.children) {
      const found = findNode(c);
      if (found) return found;
    }
    return null;
  };
  const node = findNode(root);
  if (!node) return <div className="text-sm text-muted-foreground">Select a folder.</div>;

  const updateThis = (fn: (n: FolderNode) => FolderNode) =>
    onChange(updateNode(root, node.id, fn));

  const isRoot = root.id === node.id;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
          Folder
        </div>
        <Input
          value={node.name}
          onChange={(e) => updateThis((n) => ({ ...n, name: e.target.value }))}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            updateThis((n) => ({ ...n, children: [...n.children, newFolder()] }))
          }
        >
          <Plus className="size-3.5" /> Subfolder
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            updateThis((n) => ({ ...n, rules: [...n.rules, newRule()] }))
          }
        >
          <Zap className="size-3.5" /> Rule
        </Button>
        {!isRoot && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive ml-auto"
            onClick={() => onChange(removeNode(root, node.id))}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Sort Rules ({node.rules.length})
        </div>
        {node.rules.length === 0 && (
          <div className="text-xs text-muted-foreground italic border border-dashed rounded-md p-3 text-center">
            No rules. Add one to auto-sort files into this folder.
          </div>
        )}
        {node.rules.map((r) => (
          <div
            key={r.id}
            className="rounded-md border bg-card/60 p-2.5 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Input
                value={r.name}
                onChange={(e) =>
                  updateThis((n) => ({
                    ...n,
                    rules: n.rules.map((x) =>
                      x.id === r.id ? { ...x, name: e.target.value } : x
                    ),
                  }))
                }
                className="h-7 text-xs font-medium"
              />
              <button
                onClick={() =>
                  updateThis((n) => ({
                    ...n,
                    rules: n.rules.filter((x) => x.id !== r.id),
                  }))
                }
                className="text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Source folder (Windows path)
              </label>
              <Input
                value={r.source}
                onChange={(e) =>
                  updateThis((n) => ({
                    ...n,
                    rules: n.rules.map((x) =>
                      x.id === r.id ? { ...x, source: e.target.value } : x
                    ),
                  }))
                }
                className="h-7 text-xs font-mono-tight"
              />
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Extensions (comma separated, or *)
              </label>
              <Input
                value={r.extensions}
                onChange={(e) =>
                  updateThis((n) => ({
                    ...n,
                    rules: n.rules.map((x) =>
                      x.id === r.id ? { ...x, extensions: e.target.value } : x
                    ),
                  }))
                }
                className="h-7 text-xs font-mono-tight"
                placeholder=".jpg,.png"
              />
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Target subfolder (optional)
              </label>
              <Input
                value={r.target}
                onChange={(e) =>
                  updateThis((n) => ({
                    ...n,
                    rules: n.rules.map((x) =>
                      x.id === r.id ? { ...x, target: e.target.value } : x
                    ),
                  }))
                }
                className="h-7 text-xs font-mono-tight"
                placeholder="Pictures"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
