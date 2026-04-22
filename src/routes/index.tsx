import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  HardDrive, Sparkles, Save, FolderTree as TreeIcon, ScrollText,
  Download, Copy, Trash2, Plus, RotateCcw, Shield, Eye, Zap, Cpu,
  Database, AlertTriangle, Wand2, Search, Undo2, Redo2, Telescope,
  Orbit, Rocket, Globe2,
} from "lucide-react";
import { FolderTree, NodeProperties, newFolder } from "@/components/FolderTree";
import { CommandPalette, buildDefaultCommands } from "@/components/CommandPalette";
import { TEMPLATES } from "@/lib/templates";
import type { Layout, Mode, ScriptKind } from "@/lib/types";
import { uid } from "@/lib/uid";
import { generate, buildPlan } from "@/lib/scriptgen";
import { loadLayouts, upsertLayout, deleteLayout as removeStored, persistLast, loadLast } from "@/lib/storage";
import { computeSuggestions, simulateDeepScan } from "@/lib/ai";
import { useHistory } from "@/lib/useHistory";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drive Architect — Galaxy Edition · design your Windows file system" },
      { name: "description", content: "Visually design folder hierarchies, attach smart sorting rules, preview every operation, and export safe .bat / PowerShell / .sh scripts. Galaxy-themed power tool." },
      { property: "og:title", content: "Drive Architect — Galaxy Edition" },
      { property: "og:description", content: "Design, preview, deploy. A cosmic system layout engine for Windows." },
    ],
  }),
  component: App,
});

const blankLayout = (): Layout => ({
  id: uid(),
  name: "Untitled Cosmos",
  rootPath: "C:\\",
  tree: { ...newFolder("Cosmos") },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  notes: "",
});

function App() {
  const history = useHistory<Layout>(blankLayout());
  const layout = history.state;
  const setLayout = history.set;

  const [selectedId, setSelectedId] = useState<string>(layout.tree.id);
  const [saved, setSaved] = useState<Layout[]>([]);
  const [scriptKind, setScriptKind] = useState<ScriptKind>("bat");
  const [mode, setMode] = useState<Mode>("move");
  const [dryRun, setDryRun] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReturnType<typeof simulateDeepScan> | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  // Restore last layout
  useEffect(() => {
    setSaved(loadLayouts());
    const last = loadLast();
    if (last) history.reset(last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelectedId(layout.tree.id);
  }, [layout.id]);

  useEffect(() => {
    persistLast(layout);
  }, [layout]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      if (meta && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); history.undo(); }
      if (meta && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); history.redo(); }
      if (meta && e.key.toLowerCase() === "n") { e.preventDefault(); history.reset(blankLayout()); setTab("builder"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const plan = useMemo(() => buildPlan(layout, mode), [layout, mode]);
  const generated = useMemo(
    () => generate(layout, scriptKind, mode, dryRun),
    [layout, scriptKind, mode, dryRun]
  );
  const suggestions = useMemo(() => computeSuggestions(layout), [layout]);

  const useTemplate = useCallback((tpl: Layout) => {
    const fresh: Layout = {
      ...tpl,
      id: uid(),
      name: tpl.name + " (copy)",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    history.reset(fresh);
    setTab("builder");
    toast.success(`Loaded template: ${tpl.name}`);
  }, [history]);

  const save = useCallback(() => {
    const next = upsertLayout(layout);
    setLayout(next);
    setSaved(loadLayouts());
    toast.success("Layout saved to your galaxy");
  }, [layout, setLayout]);

  const loadSaved = (l: Layout) => { history.reset(l); setTab("builder"); };
  const deleteSaved = (id: string) => { removeStored(id); setSaved(loadLayouts()); toast.success("Removed."); };

  const download = (filename: string, content: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async (text: string) => { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); };
  const exportJson = () => download(`${layout.name.replace(/\s+/g, "-")}.layout.json`, JSON.stringify(layout, null, 2), "application/json");

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Layout;
        parsed.id = uid();
        history.reset(parsed);
        toast.success("Layout imported");
      } catch { toast.error("Invalid layout file"); }
    });
  };

  const stats = useMemo(() => {
    let folders = 0, rules = 0, depth = 0;
    const walk = (n: typeof layout.tree, d: number) => {
      folders++; rules += n.rules.length; depth = Math.max(depth, d);
      n.children.forEach((c) => walk(c, d + 1));
    };
    walk(layout.tree, 0);
    return { folders, rules, ops: plan.moves.length, conflicts: plan.conflicts.length, depth };
  }, [layout, plan]);

  const runDeepScan = async () => {
    setScanning(true); setScanProgress(0); setScanResult(null);
    for (let i = 0; i <= 100; i += 4) {
      await new Promise((r) => setTimeout(r, 30));
      setScanProgress(i);
    }
    setScanResult(simulateDeepScan(layout));
    setScanning(false);
    toast.success("Deep scan complete");
  };

  const commands = useMemo(() => buildDefaultCommands({
    newLayout: () => { history.reset(blankLayout()); setTab("builder"); },
    save,
    goto: setTab,
    applyTemplate: (id) => { const t = TEMPLATES.find((x) => x.id === id); if (t) useTemplate(t); },
    undo: history.undo,
  }), [history, save, useTemplate]);

  return (
    <div className="min-h-screen">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />

      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-background/40 sticky top-0 z-30">
        <div className="max-w-[1700px] mx-auto px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl gradient-galaxy flex items-center justify-center glow-primary animate-pulse-glow">
              <Orbit className="size-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                Drive <span className="gradient-text">Architect</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5 font-mono-tight">
                v3.0 · Galaxy Edition
              </p>
            </div>
          </div>

          <div className="ml-6 hidden lg:flex items-center gap-4 text-xs text-muted-foreground font-mono-tight">
            <span className="flex items-center gap-1.5"><Cpu className="size-3.5 text-primary" /> {stats.folders} folders</span>
            <span className="flex items-center gap-1.5"><Zap className="size-3.5 text-nebula" /> {stats.rules} rules</span>
            <span className="flex items-center gap-1.5"><Database className="size-3.5 text-cosmos" /> {stats.ops} ops</span>
            <span className="flex items-center gap-1.5"><Telescope className="size-3.5 text-stardust" /> depth {stats.depth}</span>
            {stats.conflicts > 0 && (
              <span className="flex items-center gap-1.5 text-warning"><AlertTriangle className="size-3.5" /> {stats.conflicts} conflicts</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPaletteOpen(true)} className="gap-1.5 text-muted-foreground hover:text-foreground hidden md:flex">
              <Search className="size-3.5" /> Command
              <kbd className="ml-1 text-[9px] px-1 py-0.5 rounded bg-white/10">⌘K</kbd>
            </Button>
            <Button size="icon" variant="ghost" onClick={history.undo} title="Undo (⌘Z)" className="size-8"><Undo2 className="size-3.5" /></Button>
            <Button size="icon" variant="ghost" onClick={history.redo} title="Redo (⌘⇧Z)" className="size-8"><Redo2 className="size-3.5" /></Button>
            <input type="file" accept=".json" id="import-json" className="hidden" onChange={importJson} />
            <Button size="sm" variant="ghost" asChild>
              <label htmlFor="import-json" className="cursor-pointer">Import</label>
            </Button>
            <Button size="sm" variant="outline" onClick={exportJson}>Export</Button>
            <Button size="sm" onClick={save} className="gradient-galaxy text-primary-foreground border-0 hover:opacity-90 glow-primary">
              <Save className="size-3.5" /> Save
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1700px] mx-auto px-5 py-5">
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="panel-glass">
            <TabsTrigger value="dashboard"><Sparkles className="size-3.5" /> Dashboard</TabsTrigger>
            <TabsTrigger value="builder"><TreeIcon className="size-3.5" /> Builder</TabsTrigger>
            <TabsTrigger value="preview"><Eye className="size-3.5" /> Preview</TabsTrigger>
            <TabsTrigger value="planet"><Globe2 className="size-3.5" /> Planet</TabsTrigger>
            <TabsTrigger value="ai"><Wand2 className="size-3.5" /> AI assist</TabsTrigger>
            <TabsTrigger value="script"><ScrollText className="size-3.5" /> Script</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6 animate-warp-in">
            <div className="rounded-3xl panel-glass p-8 relative overflow-hidden glow-cosmic">
              <div className="absolute inset-0 nebula-veil opacity-60 pointer-events-none" />
              <div className="absolute -top-10 right-10 size-24 rounded-full gradient-galaxy opacity-60 blur-2xl animate-float-slow" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-cosmos font-mono-tight tracking-widest uppercase mb-3">
                  <span className="size-1.5 rounded-full bg-cosmos animate-pulse" />
                  System ready · Galaxy edition online
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 max-w-2xl text-glow">
                  Engineer your <span className="gradient-text">storage cosmos</span>.
                </h2>
                <p className="text-muted-foreground max-w-xl mb-6 text-base">
                  Design Windows folder hierarchies visually. Attach smart sorting rules — by extension,
                  keyword, regex, file size, or age. Preview every operation, then export safe, reviewable
                  scripts. Nothing runs unless <em>you</em> run it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { history.reset(blankLayout()); setTab("builder"); }} className="gradient-galaxy text-primary-foreground border-0 hover:opacity-90 glow-primary">
                    <Rocket className="size-4" /> Launch new layout
                  </Button>
                  <Button variant="outline" onClick={() => setTab("builder")}>Continue editing</Button>
                  <Button variant="ghost" onClick={() => setPaletteOpen(true)}>
                    <Search className="size-3.5" /> Command palette
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat icon={<Cpu />} label="Folders" value={stats.folders} accent="primary" />
              <MiniStat icon={<Zap />} label="Smart rules" value={stats.rules} accent="nebula" />
              <MiniStat icon={<Database />} label="Planned ops" value={stats.ops} accent="cosmos" />
              <MiniStat icon={<Telescope />} label="Tree depth" value={stats.depth} accent="stardust" />
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Quick templates ({TEMPLATES.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => useTemplate(tpl)}
                    className="text-left rounded-2xl panel-glass hover-lift p-4 group relative overflow-hidden"
                  >
                    <div className="absolute -top-6 -right-6 size-20 rounded-full gradient-galaxy opacity-0 group-hover:opacity-30 blur-xl transition-opacity" />
                    <div className="relative">
                      <div className="font-semibold mb-1 group-hover:text-primary transition-colors">{tpl.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono-tight mb-3">{tpl.rootPath}</div>
                      <div className="text-xs text-muted-foreground line-clamp-3 font-mono-tight">
                        {tpl.tree.children.map((c) => `/${c.name}`).join("  ")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Saved layouts</h3>
              {saved.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-muted-foreground">
                  Nothing saved yet. Build a layout and hit <strong>Save</strong>.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {saved.map((l) => (
                    <div key={l.id} className="rounded-2xl panel-glass p-4 flex flex-col gap-2 hover-lift">
                      <div className="font-semibold">{l.name}</div>
                      <div className="text-xs text-muted-foreground font-mono-tight">
                        {l.rootPath} · {new Date(l.updatedAt).toLocaleString()}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" onClick={() => loadSaved(l)}>Load</Button>
                        <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => deleteSaved(l.id)}>
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
          <TabsContent value="builder" className="animate-warp-in">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_2fr] gap-4">
              <div className="rounded-2xl panel-glass p-4 space-y-4 h-fit">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Layout name</Label>
                  <Input value={layout.name} onChange={(e) => setLayout({ ...layout, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Root path (Windows)</Label>
                  <Input value={layout.rootPath} onChange={(e) => setLayout({ ...layout, rootPath: e.target.value })} className="font-mono-tight" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    e.g. <code>C:\</code>, <code>D:\Projects</code>, or <code>%USERPROFILE%\Organized</code>
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</Label>
                  <Textarea
                    value={layout.notes ?? ""}
                    onChange={(e) => setLayout({ ...layout, notes: e.target.value })}
                    className="text-xs min-h-[80px]"
                    placeholder="Anything you want to remember about this layout…"
                  />
                </div>
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-foreground/80">
                  <div className="flex items-center gap-1.5 text-warning font-semibold mb-1">
                    <Shield className="size-3.5" /> Safety first
                  </div>
                  Drive Architect never touches your files. It generates a reviewable script you run yourself.
                </div>
              </div>

              <div className="rounded-2xl panel-glass p-3 min-h-[60vh]">
                <div className="flex items-center gap-2 mb-2 px-1.5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground flex-1">Folder tree</div>
                  <div className="relative">
                    <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search…"
                      className="h-7 pl-7 text-xs w-40"
                    />
                  </div>
                </div>
                <FolderTree
                  root={layout.tree}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChange={(t) => setLayout({ ...layout, tree: t })}
                  query={search}
                />
              </div>

              <div className="rounded-2xl panel-glass p-4 min-h-[60vh]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Properties</div>
                <NodeProperties
                  root={layout.tree}
                  selectedId={selectedId}
                  onChange={(t) => setLayout({ ...layout, tree: t })}
                />
              </div>
            </div>
          </TabsContent>

          {/* PREVIEW */}
          <TabsContent value="preview" className="space-y-4 animate-warp-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <MiniStat icon={<Cpu />} label="Folders to create" value={plan.folders.length} accent="primary" />
              <MiniStat icon={<Zap />} label="File operations" value={plan.moves.length} accent="nebula" />
              <MiniStat icon={<Shield />} label="Mode" value={`${mode.toUpperCase()}${dryRun ? " · DRY" : ""}`} accent="cosmos" />
              <MiniStat icon={<AlertTriangle />} label="Conflicts" value={plan.conflicts.length} accent={plan.conflicts.length ? "warning" : "stardust"} />
            </div>

            {plan.conflicts.length > 0 && (
              <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-warning text-sm">
                  <AlertTriangle className="size-4" /> Issues detected ({plan.conflicts.length})
                </div>
                {plan.conflicts.map((c, i) => (
                  <div key={i} className="text-xs text-foreground/80 font-mono-tight">• {c.message}</div>
                ))}
              </div>
            )}

            <div className="rounded-2xl panel-glass p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground flex-1">Deep scan (simulated)</div>
                <Button size="sm" onClick={runDeepScan} disabled={scanning} className="gradient-galaxy border-0">
                  <Telescope className="size-3.5" /> {scanning ? "Scanning…" : "Run scan"}
                </Button>
              </div>
              {scanning && <Progress value={scanProgress} className="h-1.5" />}
              {scanResult && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs font-mono-tight">
                  <div className="rounded-lg bg-white/5 p-2"><div className="text-muted-foreground">Files scanned</div><div className="text-base font-bold text-cosmos">{scanResult.filesScanned.toLocaleString()}</div></div>
                  <div className="rounded-lg bg-white/5 p-2"><div className="text-muted-foreground">Duplicate groups</div><div className="text-base font-bold text-nebula">{scanResult.duplicateGroups}</div></div>
                  <div className="rounded-lg bg-white/5 p-2"><div className="text-muted-foreground">Reclaimable</div><div className="text-base font-bold text-stardust">{scanResult.reclaimableMb} MB</div></div>
                  <div className="rounded-lg bg-white/5 p-2"><div className="text-muted-foreground">Elapsed</div><div className="text-base font-bold text-primary">{scanResult.elapsedMs} ms</div></div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl panel-glass p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Folders ({plan.folders.length})
                </div>
                <div className="space-y-1 max-h-[60vh] overflow-auto font-mono-tight text-xs">
                  {plan.folders.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 animate-rise" style={{ animationDelay: `${i * 8}ms` }}>
                      <span className="text-success">+</span>
                      <span className="truncate">{f.path}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl panel-glass p-4">
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
                      <div key={i} className="py-1.5 px-2 rounded hover:bg-white/5 border-l-2 border-nebula/40 animate-rise" style={{ animationDelay: `${i * 6}ms` }}>
                        <div className="text-nebula">{m.ruleName} <span className="text-muted-foreground">[{m.mode}]</span></div>
                        <div className="text-muted-foreground truncate">{m.source}\\{m.pattern} → {m.target}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* PLANET */}
          <TabsContent value="planet" className="animate-warp-in">
            <PlanetView layout={layout} selectedId={selectedId} onSelect={setSelectedId} />
          </TabsContent>

          {/* AI */}
          <TabsContent value="ai" className="space-y-4 animate-warp-in">
            <div className="rounded-2xl panel-glass p-6 relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 size-40 rounded-full gradient-aurora opacity-30 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2 text-cosmos uppercase tracking-widest text-[10px] font-mono-tight">
                  <Wand2 className="size-3.5" /> Heuristic suggestions
                </div>
                <h3 className="text-xl font-bold mb-1">Suggestions for your layout</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Smart improvements based on what your layout is missing. One click to apply, undoable any time.
                </p>
                {suggestions.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">Your layout looks great — no suggestions right now.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {suggestions.map((s) => (
                      <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4 hover-lift">
                        <div className="font-semibold mb-1 flex items-center gap-2">
                          <Sparkles className="size-3.5 text-nebula" />{s.title}
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">{s.detail}</div>
                        <Button size="sm" className="gradient-galaxy border-0" onClick={() => { setLayout(s.apply(layout)); toast.success("Applied"); }}>
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* SCRIPT */}
          <TabsContent value="script" className="space-y-4 animate-warp-in">
            <div className="rounded-2xl panel-glass p-4 flex flex-wrap gap-4 items-end">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Script type</Label>
                <div className="flex gap-1 mt-1">
                  {(["bat", "ps1", "sh"] as ScriptKind[]).map((k) => (
                    <Button key={k} size="sm" variant={scriptKind === k ? "default" : "outline"} onClick={() => setScriptKind(k)} className={scriptKind === k ? "gradient-galaxy text-primary-foreground border-0" : ""}>
                      .{k}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Operation</Label>
                <div className="flex gap-1 mt-1">
                  {(["move", "copy"] as Mode[]).map((m) => (
                    <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)} className={mode === m ? "gradient-galaxy text-primary-foreground border-0" : ""}>
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Switch id="dry" checked={dryRun} onCheckedChange={setDryRun} />
                <Label htmlFor="dry" className="text-sm cursor-pointer">Dry run (log only, no changes)</Label>
              </div>

              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(generated.main)}>
                  <Copy className="size-3.5" /> Copy
                </Button>
                <Button size="sm" className="gradient-galaxy text-primary-foreground border-0 glow-primary"
                  onClick={() => download(`${layout.name.replace(/\s+/g, "-")}.${scriptKind}`, generated.main)}
                >
                  <Download className="size-3.5" /> Download .{scriptKind}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
              <div className="rounded-2xl border border-white/10 bg-[oklch(0.10_0.04_280)] overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
                  <div className="flex items-center gap-2 text-xs font-mono-tight">
                    <span className="size-2 rounded-full bg-destructive/70" />
                    <span className="size-2 rounded-full bg-warning/70" />
                    <span className="size-2 rounded-full bg-success/70" />
                    <span className="ml-2 text-muted-foreground">{layout.name.replace(/\s+/g, "-")}.{scriptKind}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{generated.main.split("\n").length} lines</span>
                </div>
                <pre className="p-4 text-xs font-mono-tight leading-relaxed overflow-auto max-h-[70vh] text-foreground/90">
                  {generated.main}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[oklch(0.10_0.04_280)] overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2 text-xs">
                      <RotateCcw className="size-3.5 text-warning" />
                      <span className="font-semibold">Rollback script</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => copy(generated.rollback)}><Copy className="size-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => download(`${layout.name.replace(/\s+/g, "-")}.rollback.bat`, generated.rollback)}><Download className="size-3" /></Button>
                    </div>
                  </div>
                  <pre className="p-3 text-[11px] font-mono-tight leading-relaxed overflow-auto max-h-[40vh] text-foreground/80">
                    {generated.rollback}
                  </pre>
                </div>

                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    <Shield className="size-4" /> How to run
                  </div>
                  <ol className="list-decimal list-inside text-xs space-y-1 text-foreground/80">
                    <li>Download the script.</li>
                    <li>Right-click → <strong>Run as administrator</strong> if needed.</li>
                    <li>Confirm the prompt. Watch the log file generated next to the script.</li>
                    <li>Use the rollback script to revert moves.</li>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <footer className="max-w-[1700px] mx-auto px-5 py-6 text-center text-[11px] text-muted-foreground font-mono-tight">
        Drive Architect — Galaxy Edition · all processing happens in your browser · no files leave your machine.
      </footer>
    </div>
  );
}

function MiniStat({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "primary" | "nebula" | "cosmos" | "stardust" | "warning";
}) {
  const accentClass: Record<string, string> = {
    primary: "text-primary bg-primary/15",
    nebula: "text-nebula bg-nebula/15",
    cosmos: "text-cosmos bg-cosmos/15",
    stardust: "text-stardust bg-stardust/15",
    warning: "text-warning bg-warning/15",
  };
  return (
    <div className="rounded-2xl panel-glass p-4 flex items-center gap-3 hover-lift">
      <div className={cn("size-9 rounded-lg flex items-center justify-center", accentClass[accent])}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold font-mono-tight">{value}</div>
      </div>
    </div>
  );
}

/* ---------- Planet visualization ---------- */
function PlanetView({
  layout, selectedId, onSelect,
}: {
  layout: Layout;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const children = layout.tree.children;
  const radius = 220;
  return (
    <div className="rounded-3xl panel-glass p-6 relative overflow-hidden min-h-[70vh]">
      <div className="absolute inset-0 nebula-veil opacity-50" />
      <div className="text-center mb-2 text-xs uppercase tracking-widest text-muted-foreground font-mono-tight relative">
        Orbit view of <span className="text-cosmos">{layout.tree.name}</span>
      </div>
      <div className="relative h-[60vh] flex items-center justify-center">
        {/* Orbit rings */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/10"
            style={{ width: radius * i * 0.8, height: radius * i * 0.8 }}
          />
        ))}
        {/* Center sun = root */}
        <button
          onClick={() => onSelect(layout.tree.id)}
          className={cn(
            "absolute size-28 rounded-full gradient-galaxy glow-primary animate-pulse-glow flex items-center justify-center text-primary-foreground font-bold text-sm text-center px-3 z-10",
            selectedId === layout.tree.id && "ring-galaxy"
          )}
        >
          {layout.tree.name}
        </button>
        {/* Planets = first-level children */}
        {children.map((c, i) => {
          const angle = (i / Math.max(1, children.length)) * Math.PI * 2;
          const r = radius;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const hue = (i * 47) % 360;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "absolute size-20 rounded-full flex items-center justify-center text-[11px] font-semibold text-center px-2 hover-lift transition-all",
                selectedId === c.id && "ring-galaxy"
              )}
              style={{
                transform: `translate(${x}px, ${y}px)`,
                background: `radial-gradient(circle at 30% 30%, oklch(0.78 0.18 ${hue}), oklch(0.40 0.15 ${hue}))`,
                boxShadow: `0 0 30px -6px oklch(0.78 0.18 ${hue} / 0.7), inset -8px -10px 20px oklch(0 0 0 / 0.5)`,
              }}
            >
              <span className="text-white drop-shadow">{c.name}</span>
              {c.children.length > 0 && (
                <span className="absolute -bottom-2 -right-2 size-5 rounded-full bg-background border border-white/20 text-[9px] flex items-center justify-center text-muted-foreground">
                  {c.children.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-center text-xs text-muted-foreground mt-4 relative">
        Click a planet to inspect its branch in the Builder.
      </div>
    </div>
  );
}
