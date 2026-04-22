import { useState } from "react";
import type { FolderNode, SortRule, RuleMatch } from "@/lib/types";
import { uid } from "@/lib/uid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Copy as CopyIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  node: FolderNode;
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (next: FolderNode) => void;
  depth?: number;
  parentChildren?: FolderNode[];
  onParentChange?: (next: FolderNode[]) => void;
  index?: number;
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
  match: "ext",
  extensions: ".jpg,.png",
  target: "",
  source: "%USERPROFILE%\\Downloads",
});

const cloneFolder = (n: FolderNode): FolderNode => ({
  ...n,
  id: uid(),
  children: n.children.map(cloneFolder),
  rules: n.rules.map((r) => ({ ...r, id: uid() })),
});

function TreeRow({
  node,
  selectedId,
  onSelect,
  onChange,
  depth = 0,
  parentChildren,
  onParentChange,
  index,
}: Props) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const isSelected = selectedId === node.id;

  const commitName = () => {
    setEditing(false);
    if (name.trim() && name !== node.name) onChange({ ...node, name: name.trim() });
    else setName(node.name);
  };

  const move = (dir: -1 | 1) => {
    if (!parentChildren || !onParentChange || index === undefined) return;
    const next = [...parentChildren];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    onParentChange(next);
  };

  return (
    <div className="animate-rise">
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm cursor-pointer transition-all",
          isSelected
            ? "bg-primary/15 text-primary ring-1 ring-primary/50 shadow-[0_0_24px_-6px_var(--primary)]"
            : "hover:bg-white/5 text-foreground/90"
        )}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")}
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
                if (e.key === "Escape") { setName(node.name); setEditing(false); }
              }}
              className="h-6 px-1.5 text-sm"
            />
            <button onClick={commitName} className="text-success"><Check className="size-3.5" /></button>
            <button onClick={() => { setName(node.name); setEditing(false); }} className="text-destructive"><X className="size-3.5" /></button>
          </div>
        ) : (
          <>
            <span className="flex-1 truncate font-mono-tight">{node.name}</span>
            {node.rules.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-nebula">
                <Zap className="size-3" />{node.rules.length}
              </span>
            )}
            <div className="hidden group-hover:flex items-center gap-0.5">
              {parentChildren && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); move(-1); }} className="text-muted-foreground hover:text-foreground p-0.5" title="Move up"><ArrowUp className="size-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); move(1); }} className="text-muted-foreground hover:text-foreground p-0.5" title="Move down"><ArrowDown className="size-3" /></button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="text-muted-foreground hover:text-foreground p-0.5" title="Rename"><Pencil className="size-3" /></button>
              <button onClick={(e) => { e.stopPropagation(); onChange({ ...node, children: [...node.children, newFolder()] }); setOpen(true); }} className="text-muted-foreground hover:text-primary p-0.5" title="Add child"><Plus className="size-3" /></button>
              {parentChildren && onParentChange && (
                <button onClick={(e) => { e.stopPropagation(); onParentChange([...parentChildren, cloneFolder(node)]); }} className="text-muted-foreground hover:text-cosmos p-0.5" title="Duplicate"><CopyIcon className="size-3" /></button>
              )}
            </div>
          </>
        )}
      </div>
      {open &&
        node.children.map((child, i) => (
          <TreeRow
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
            index={i}
            parentChildren={node.children}
            onParentChange={(nc) => onChange({ ...node, children: nc })}
            onChange={(updatedChild) => {
              onChange({
                ...node,
                children: node.children.map((c) => c.id === child.id ? updatedChild : c),
              });
            }}
          />
        ))}
    </div>
  );
}

export function FolderTree({
  root, selectedId, onSelect, onChange, query,
}: {
  root: FolderNode;
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (next: FolderNode) => void;
  query?: string;
}) {
  // simple search highlight: dim non-matching siblings (visual only — keep tree intact)
  void query;
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
          className="w-full hover:border-primary hover:text-primary"
          onClick={() => onChange({ ...root, children: [...root.children, newFolder()] })}
        >
          <Plus className="size-3.5" /> Add root folder
        </Button>
      </div>
    </div>
  );
}

const MATCH_LABELS: Record<RuleMatch, string> = {
  ext: "Extension",
  keyword: "Keyword",
  regex: "Regex",
  size: "File size",
  date: "Modified date",
};

export function NodeProperties({
  root, selectedId, onChange,
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
  const updateRule = (rid: string, fn: (r: SortRule) => SortRule) =>
    updateThis((n) => ({ ...n, rules: n.rules.map((x) => x.id === rid ? fn(x) : x) }));

  return (
    <div className="space-y-4 animate-warp-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Folder</div>
        <Input value={node.name} onChange={(e) => updateThis((n) => ({ ...n, name: e.target.value }))} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => updateThis((n) => ({ ...n, children: [...n.children, newFolder()] }))}>
          <Plus className="size-3.5" /> Subfolder
        </Button>
        <Button size="sm" variant="outline" className="border-nebula/40 text-nebula hover:text-nebula" onClick={() => updateThis((n) => ({ ...n, rules: [...n.rules, newRule()] }))}>
          <Zap className="size-3.5" /> Rule
        </Button>
        {!isRoot && (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={() => onChange(removeNode(root, node.id))}>
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
          <div key={r.id} className="rounded-lg border bg-card/50 p-2.5 space-y-2 animate-warp-in">
            <div className="flex items-center gap-2">
              <Input
                value={r.name}
                onChange={(e) => updateRule(r.id, (x) => ({ ...x, name: e.target.value }))}
                className="h-7 text-xs font-medium"
              />
              <button
                onClick={() => updateThis((n) => ({ ...n, rules: n.rules.filter((x) => x.id !== r.id) }))}
                className="text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Match by</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {(Object.keys(MATCH_LABELS) as RuleMatch[]).map((k) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={r.match === k ? "default" : "outline"}
                    className={cn("h-6 text-[10px] px-2", r.match === k && "gradient-galaxy text-primary-foreground border-0")}
                    onClick={() => updateRule(r.id, (x) => ({ ...x, match: k }))}
                  >
                    {MATCH_LABELS[k]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Source folder</Label>
              <Input
                value={r.source}
                onChange={(e) => updateRule(r.id, (x) => ({ ...x, source: e.target.value }))}
                className="h-7 text-xs font-mono-tight"
              />

              {r.match === "ext" && (
                <>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Extensions (comma separated, or *)</Label>
                  <Input
                    value={r.extensions}
                    onChange={(e) => updateRule(r.id, (x) => ({ ...x, extensions: e.target.value }))}
                    className="h-7 text-xs font-mono-tight"
                    placeholder=".jpg,.png"
                  />
                </>
              )}

              {r.match === "keyword" && (
                <>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Keyword(s) — comma separated</Label>
                  <Input
                    value={r.keyword ?? ""}
                    onChange={(e) => updateRule(r.id, (x) => ({ ...x, keyword: e.target.value }))}
                    className="h-7 text-xs font-mono-tight"
                    placeholder="invoice,receipt"
                  />
                </>
              )}

              {r.match === "regex" && (
                <>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Regex pattern</Label>
                  <Input
                    value={r.regex ?? ""}
                    onChange={(e) => updateRule(r.id, (x) => ({ ...x, regex: e.target.value }))}
                    className="h-7 text-xs font-mono-tight"
                    placeholder="^IMG_\\d+\\.jpg$"
                  />
                </>
              )}

              {r.match === "size" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Threshold (MB)</Label>
                    <Input
                      type="number"
                      value={r.sizeMb ?? 100}
                      onChange={(e) => updateRule(r.id, (x) => ({ ...x, sizeMb: Number(e.target.value) }))}
                      className="h-7 text-xs font-mono-tight"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Operator</Label>
                    <div className="flex gap-1">
                      {(["gt","lt"] as const).map((op) => (
                        <Button key={op} size="sm" variant={r.sizeOp === op ? "default" : "outline"} className={cn("h-7 text-[10px]", r.sizeOp === op && "gradient-galaxy border-0")} onClick={() => updateRule(r.id, (x) => ({ ...x, sizeOp: op }))}>
                          {op === "gt" ? "greater" : "less"}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {r.match === "date" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Days</Label>
                    <Input
                      type="number"
                      value={r.days ?? 30}
                      onChange={(e) => updateRule(r.id, (x) => ({ ...x, days: Number(e.target.value) }))}
                      className="h-7 text-xs font-mono-tight"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">When</Label>
                    <div className="flex gap-1">
                      {(["older","newer"] as const).map((op) => (
                        <Button key={op} size="sm" variant={r.dateOp === op ? "default" : "outline"} className={cn("h-7 text-[10px]", r.dateOp === op && "gradient-galaxy border-0")} onClick={() => updateRule(r.id, (x) => ({ ...x, dateOp: op }))}>
                          {op}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Target subfolder (optional)</Label>
              <Input
                value={r.target}
                onChange={(e) => updateRule(r.id, (x) => ({ ...x, target: e.target.value }))}
                className="h-7 text-xs font-mono-tight"
                placeholder="Pictures"
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`arch-${r.id}`}
                    checked={!!r.archiveByDate}
                    onCheckedChange={(v) => updateRule(r.id, (x) => ({ ...x, archiveByDate: v }))}
                  />
                  <Label htmlFor={`arch-${r.id}`} className="text-[11px] cursor-pointer">Archive by year/month</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`rec-${r.id}`}
                    checked={!!r.recursive}
                    onCheckedChange={(v) => updateRule(r.id, (x) => ({ ...x, recursive: v }))}
                  />
                  <Label htmlFor={`rec-${r.id}`} className="text-[11px] cursor-pointer">Recurse subfolders</Label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
