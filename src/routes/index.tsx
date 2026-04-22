import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  HardDrive,
  Sparkles,
  Save,
  FolderTree as TreeIcon,
  ScrollText,
  Download,
  Copy,
  Trash2,
  Plus,
  RotateCcw,
  Shield,
  Eye,
  Zap,
  Cpu,
  Database,
} from "lucide-react";
import {
  FolderTree,
  NodeProperties,
  newFolder,
} from "@/components/FolderTree";
import { TEMPLATES } from "@/lib/templates";
import type { Layout, Mode, ScriptKind } from "@/lib/types";
import { uid } from "@/lib/uid";
import { generate, buildPlan } from "@/lib/scriptgen";
import {
  loadLayouts,
  upsertLayout,
  deleteLayout as removeStored,
} from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drive Architect — Design & deploy your Windows file system" },
      {
        name: "description",
        content:
          "Design folder structures, set smart sorting rules, preview every action, and export safe .bat or PowerShell scripts. Reversible. Visual. Power-user grade.",
      },
      { property: "og:title", content: "Drive Architect" },
      {
        property: "og:description",
        content:
          "A visual system layout engine for Windows. Design, preview, deploy.",
      },
    ],
  }),
  component: App,
});

const blankLayout = (): Layout => ({
  id: uid(),
  name: "Untitled Layout",
  rootPath: "C:\\",
  tree: { ...newFolder("Root") },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

function App() {
  const [layout, setLayout] = useState<Layout>(blankLayout());
  const [selectedId, setSelectedId] = useState<string>(layout.tree.id);
  const [saved, setSaved] = useState<Layout[]>([]);
  const [scriptKind, setScriptKind] = useState<ScriptKind>("bat");
  const [mode, setMode] = useState<Mode>("move");
  const [dryRun, setDryRun] = useState(true);
  const [tab, setTab] = useState("builder");

  useEffect(() => {
    setSaved(loadLayouts());
  }, []);

  useEffect(() => {
    setSelectedId(layout.tree.id);
  }, [layout.id]);

  const plan = useMemo(() => buildPlan(layout), [layout]);
  const generated = useMemo(
    () => generate(layout, scriptKind, mode, dryRun),
    [layout, scriptKind, mode, dryRun]
  );

  const useTemplate = (tpl: Layout) => {
    const fresh: Layout = {
      ...tpl,
      id: uid(),
      name: tpl.name + " (copy)",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setLayout(fresh);
    setTab("builder");
    toast.success(`Loaded template: ${tpl.name}`);
  };

  const save = () => {
    const next = upsertLayout(layout);
    setLayout(next);
    setSaved(loadLayouts());
    toast.success("Layout saved locally");
  };

  const loadSaved = (l: Layout) => {
    setLayout(l);
    setTab("builder");
  };

  const deleteSaved = (id: string) => {
    removeStored(id);
    setSaved(loadLayouts());
  };

  const download = (filename: string, content: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const exportJson = () => {
    download(
      `${layout.name.replace(/\s+/g, "-")}.layout.json`,
      JSON.stringify(layout, null, 2),
      "application/json"
    );
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Layout;
        parsed.id = uid();
        setLayout(parsed);
        toast.success("Layout imported");
      } catch {
        toast.error("Invalid layout file");
      }
    });
  };

  const stats = useMemo(() => {
    let folders = 0;
    let rules = 0;
    const walk = (n: typeof layout.tree) => {
      folders++;
      rules += n.rules.length;
      n.children.forEach(walk);
    };
    walk(layout.tree);
    return { folders, rules, ops: plan.moves.length };
  }, [layout, plan]);

  return (
    <div className="min-h-screen scanlines">
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur-xl bg-background/70 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg gradient-cyber flex items-center justify-center glow-primary">
              <HardDrive className="size-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                Drive <span className="gradient-text">Architect</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5 font-mono-tight">
                v2.0.0 · system layout engine
              </p>
            </div>
          </div>

          <div className="ml-6 hidden md:flex items-center gap-4 text-xs text-muted-foreground font-mono-tight">
            <span className="flex items-center gap-1.5">
              <Cpu className="size-3.5 text-primary" /> {stats.folders} folders
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5 text-neon" /> {stats.rules} rules
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="size-3.5 text-warning" /> {stats.ops} planned ops
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              id="import-json"
              className="hidden"
              onChange={importJson}
            />
            <Button size="sm" variant="ghost" asChild>
              <label htmlFor="import-json" className="cursor-pointer">
                Import
              </label>
            </Button>
            <Button size="sm" variant="outline" onClick={exportJson}>
              Export JSON
            </Button>
            <Button size="sm" onClick={save} className="gradient-cyber text-primary-foreground border-0 hover:opacity-90">
              <Save className="size-3.5" /> Save
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-5 py-5">
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-card/60 border">
            <TabsTrigger value="dashboard">
              <Sparkles className="size-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="builder">
              <TreeIcon className="size-3.5" /> Builder
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="size-3.5" /> Preview
            </TabsTrigger>
            <TabsTrigger value="script">
              <ScrollText className="size-3.5" /> Script
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="rounded-2xl surface-panel border p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute -top-20 -right-20 size-80 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-neon/20 blur-3xl" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-primary font-mono-tight tracking-widest uppercase mb-3">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  System ready
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 max-w-2xl">
                  Design your <span className="gradient-text">storage</span> like an architect.
                </h2>
                <p className="text-muted-foreground max-w-xl mb-6">
                  Visually plan folder hierarchies, attach smart sorting rules, preview every operation,
                  then export a safe, reviewable script. Nothing runs unless <em>you</em> run it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setLayout(blankLayout());
                      setTab("builder");
                    }}
                    className="gradient-cyber text-primary-foreground border-0 hover:opacity-90"
                  >
                    <Plus className="size-4" /> New layout
                  </Button>
                  <Button variant="outline" onClick={() => setTab("builder")}>
                    Continue editing
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Quick templates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => useTemplate(tpl)}
                    className="text-left rounded-xl border bg-card/60 hover:bg-card hover:border-primary/50 hover:shadow-[0_0_30px_-10px_var(--primary)] transition-all p-4 group"
                  >
                    <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {tpl.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono-tight mb-3">
                      {tpl.rootPath}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-3 font-mono-tight">
                      {tpl.tree.children.map((c) => `/${c.name}`).join("  ")}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Saved layouts
              </h3>
              {saved.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nothing saved yet. Build a layout and hit <strong>Save</strong>.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {saved.map((l) => (
                    <div
                      key={l.id}
                      className="rounded-xl border bg-card/60 p-4 flex flex-col gap-2"
                    >
                      <div className="font-semibold">{l.name}</div>
                      <div className="text-xs text-muted-foreground font-mono-tight">
                        {l.rootPath} ·{" "}
                        {new Date(l.updatedAt).toLocaleString()}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" onClick={() => loadSaved(l)}>
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive ml-auto"
                          onClick={() => deleteSaved(l.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* BUILDER */}
          <TabsContent value="builder">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_2fr] gap-4">
              {/* Layout meta */}
              <div className="rounded-xl surface-panel border p-4 space-y-4 h-fit">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Layout name
                  </Label>
                  <Input
                    value={layout.name}
                    onChange={(e) =>
                      setLayout({ ...layout, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Root path (Windows)
                  </Label>
                  <Input
                    value={layout.rootPath}
                    onChange={(e) =>
                      setLayout({ ...layout, rootPath: e.target.value })
                    }
                    className="font-mono-tight"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    e.g. <code>C:\</code>, <code>D:\Projects</code>, or{" "}
                    <code>%USERPROFILE%\Organized</code>
                  </p>
                </div>
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-foreground/80">
                  <div className="flex items-center gap-1.5 text-warning font-semibold mb-1">
                    <Shield className="size-3.5" /> Safety first
                  </div>
                  Drive Architect never touches your files. It generates a
                  reviewable script you run yourself on Windows.
                </div>
              </div>

              {/* Tree */}
              <div className="rounded-xl surface-panel border p-3 min-h-[60vh]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1.5">
                  Folder tree
                </div>
                <FolderTree
                  root={layout.tree}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChange={(t) => setLayout({ ...layout, tree: t })}
                />
              </div>

              {/* Properties */}
              <div className="rounded-xl surface-panel border p-4 min-h-[60vh]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Properties
                </div>
                <NodeProperties
                  root={layout.tree}
                  selectedId={selectedId}
                  onChange={(t) => setLayout({ ...layout, tree: t })}
                />
              </div>
            </div>
          </TabsContent>

          {/* PREVIEW */}
          <TabsContent value="preview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard
                icon={<Cpu className="size-4" />}
                label="Folders to create"
                value={plan.folders.length}
              />
              <StatCard
                icon={<Zap className="size-4" />}
                label="File operations"
                value={plan.moves.length}
              />
              <StatCard
                icon={<Shield className="size-4" />}
                label="Mode"
                value={`${mode.toUpperCase()}${dryRun ? " · DRY" : ""}`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl surface-panel border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Folders ({plan.folders.length})
                </div>
                <div className="space-y-1 max-h-[60vh] overflow-auto font-mono-tight text-xs">
                  {plan.folders.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-success">+</span>
                      <span className="truncate">{f.path}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl surface-panel border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  File operations ({plan.moves.length})
                </div>
                {plan.moves.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic py-6 text-center">
                    No file rules yet. Select a folder in the Builder and add a rule.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[60vh] overflow-auto font-mono-tight text-xs">
                    {plan.moves.map((m, i) => (
                      <div
                        key={i}
                        className="py-1.5 px-2 rounded hover:bg-muted/50 border-l-2 border-neon/40"
                      >
                        <div className="text-neon">{m.ruleName}</div>
                        <div className="text-muted-foreground truncate">
                          {m.source}\\{m.pattern} → {m.target}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* SCRIPT */}
          <TabsContent value="script" className="space-y-4">
            <div className="rounded-xl surface-panel border p-4 flex flex-wrap gap-4 items-end">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Script type
                </Label>
                <div className="flex gap-1 mt-1">
                  {(["bat", "ps1"] as ScriptKind[]).map((k) => (
                    <Button
                      key={k}
                      size="sm"
                      variant={scriptKind === k ? "default" : "outline"}
                      onClick={() => setScriptKind(k)}
                      className={
                        scriptKind === k
                          ? "gradient-cyber text-primary-foreground border-0"
                          : ""
                      }
                    >
                      .{k}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Operation
                </Label>
                <div className="flex gap-1 mt-1">
                  {(["move", "copy"] as Mode[]).map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={mode === m ? "default" : "outline"}
                      onClick={() => setMode(m)}
                      className={
                        mode === m
                          ? "gradient-cyber text-primary-foreground border-0"
                          : ""
                      }
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Switch id="dry" checked={dryRun} onCheckedChange={setDryRun} />
                <Label htmlFor="dry" className="text-sm cursor-pointer">
                  Dry run (log only, no changes)
                </Label>
              </div>

              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(generated.main)}>
                  <Copy className="size-3.5" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="gradient-cyber text-primary-foreground border-0"
                  onClick={() =>
                    download(
                      `${layout.name.replace(/\s+/g, "-")}.${scriptKind}`,
                      generated.main
                    )
                  }
                >
                  <Download className="size-3.5" /> Download .{scriptKind}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
              <div className="rounded-xl border bg-[oklch(0.12_0.02_260)] overflow-hidden">
                <div className="px-4 py-2 border-b border-border/60 flex items-center justify-between bg-card/40">
                  <div className="flex items-center gap-2 text-xs font-mono-tight">
                    <span className="size-2 rounded-full bg-destructive/70" />
                    <span className="size-2 rounded-full bg-warning/70" />
                    <span className="size-2 rounded-full bg-success/70" />
                    <span className="ml-2 text-muted-foreground">
                      {layout.name.replace(/\s+/g, "-")}.{scriptKind}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {generated.main.split("\n").length} lines
                  </span>
                </div>
                <pre className="p-4 text-xs font-mono-tight leading-relaxed overflow-auto max-h-[70vh] text-foreground/90">
                  {generated.main}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border bg-[oklch(0.12_0.02_260)] overflow-hidden">
                  <div className="px-4 py-2 border-b border-border/60 flex items-center justify-between bg-card/40">
                    <div className="flex items-center gap-2 text-xs">
                      <RotateCcw className="size-3.5 text-warning" />
                      <span className="font-semibold">Rollback script</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copy(generated.rollback)}
                      >
                        <Copy className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          download(
                            `${layout.name.replace(/\s+/g, "-")}.rollback.bat`,
                            generated.rollback
                          )
                        }
                      >
                        <Download className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <pre className="p-3 text-[11px] font-mono-tight leading-relaxed overflow-auto max-h-[40vh] text-foreground/80">
                    {generated.rollback}
                  </pre>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    <Shield className="size-4" /> How to run
                  </div>
                  <ol className="list-decimal list-inside text-xs space-y-1 text-foreground/80">
                    <li>Download the script.</li>
                    <li>Right-click → <strong>Run as administrator</strong> (only if needed).</li>
                    <li>Confirm the prompt. Watch the log file generated next to the script.</li>
                    <li>Use the rollback script to revert moves.</li>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <footer className="max-w-[1600px] mx-auto px-5 py-6 text-center text-[11px] text-muted-foreground font-mono-tight">
        Drive Architect · web edition · all processing happens in your browser ·
        no files leave your machine.
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl surface-panel border p-4 flex items-center gap-3">
      <div className="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-xl font-bold font-mono-tight">{value}</div>
      </div>
    </div>
  );
}
