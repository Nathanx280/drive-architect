import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Sparkles, Plus, Save, Eye, Code2, FolderTree, RotateCcw } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";

export type Command = {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
};

export function CommandPalette({
  open, onOpenChange, commands,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  commands: Command[];
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  if (!open) return null;

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(q.toLowerCase()) ||
    (c.hint ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-background/70 backdrop-blur-md animate-warp-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl panel-glass overflow-hidden glow-primary"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <Search className="size-4 text-primary" />
          <input
            autoFocus
            placeholder="Search commands, templates, folders…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-transparent flex-1 outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground font-mono-tight">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { c.run(); onOpenChange(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 text-left transition-colors"
            >
              <span className="text-primary">{c.icon}</span>
              <span className="flex-1">{c.label}</span>
              {c.hint && <span className="text-[10px] text-muted-foreground font-mono-tight">{c.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const buildDefaultCommands = (handlers: {
  newLayout: () => void;
  save: () => void;
  goto: (tab: string) => void;
  applyTemplate: (id: string) => void;
  undo: () => void;
}): Command[] => {
  const tplCmds: Command[] = TEMPLATES.map((t) => ({
    id: `tpl:${t.id}`,
    label: `Load template — ${t.name}`,
    hint: t.rootPath,
    icon: <Sparkles className="size-3.5" />,
    run: () => handlers.applyTemplate(t.id),
  }));
  return [
    { id: "new", label: "New layout", hint: "⌘N", icon: <Plus className="size-3.5" />, run: handlers.newLayout },
    { id: "save", label: "Save layout", hint: "⌘S", icon: <Save className="size-3.5" />, run: handlers.save },
    { id: "tab:builder", label: "Go to Builder", icon: <FolderTree className="size-3.5" />, run: () => handlers.goto("builder") },
    { id: "tab:preview", label: "Go to Preview", icon: <Eye className="size-3.5" />, run: () => handlers.goto("preview") },
    { id: "tab:script", label: "Go to Script", icon: <Code2 className="size-3.5" />, run: () => handlers.goto("script") },
    { id: "undo", label: "Undo last change", hint: "⌘Z", icon: <RotateCcw className="size-3.5" />, run: handlers.undo },
    ...tplCmds,
  ];
};

export function classFor(active: boolean) {
  return cn("transition-colors", active && "text-primary");
}
