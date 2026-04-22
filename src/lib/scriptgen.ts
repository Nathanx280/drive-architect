import type { FolderNode, Layout, Mode, ScriptKind, SortRule } from "./types";

const joinWin = (...parts: string[]) =>
  parts.filter(Boolean).join("\\").replace(/\\+/g, "\\").replace(/\\$/, "");

const joinNix = (...parts: string[]) =>
  parts.filter(Boolean).join("/").replace(/\/+/g, "/").replace(/\/$/, "");

export type PlannedFolder = { path: string };
export type PlannedMove = {
  source: string;
  pattern: string;
  target: string;
  ruleName: string;
  rule: SortRule;
  mode: Mode;
};

export type Conflict = {
  kind: "duplicate-target" | "overlapping-source" | "missing-source" | "ambiguous-pattern";
  message: string;
};

export type Plan = {
  folders: PlannedFolder[];
  moves: PlannedMove[];
  conflicts: Conflict[];
};

const ruleDescription = (r: SortRule): string => {
  switch (r.match) {
    case "ext":
      return `extensions ${r.extensions || "*"}`;
    case "keyword":
      return `name contains "${r.keyword || ""}"`;
    case "regex":
      return `regex /${r.regex || ""}/`;
    case "size":
      return `size ${r.sizeOp === "lt" ? "<" : ">"} ${r.sizeMb || 0} MB`;
    case "date":
      return `${r.dateOp === "newer" ? "newer than" : "older than"} ${r.days || 0} days`;
  }
};

const expandExtPatterns = (r: SortRule): string[] => {
  const exts = (r.extensions || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (exts.length === 0 || exts.includes("*")) return ["*.*"];
  return exts.map((e) => "*" + (e.startsWith(".") ? e : "." + e));
};

const walk = (node: FolderNode, parentPath: string, plan: Plan, mode: Mode) => {
  const here = joinWin(parentPath, node.name);
  plan.folders.push({ path: here });

  for (const r of node.rules) {
    const targetBase = joinWin(here, r.target || "");
    const ruleMode = r.modeOverride ?? mode;

    if (r.match === "ext") {
      for (const pattern of expandExtPatterns(r)) {
        plan.moves.push({
          source: r.source,
          pattern,
          target: targetBase,
          ruleName: `${r.name} · ${ruleDescription(r)}`,
          rule: r,
          mode: ruleMode,
        });
      }
    } else {
      // Keyword/regex/size/date all need *.* enumeration in script and per-file filter.
      plan.moves.push({
        source: r.source,
        pattern: "*.*",
        target: targetBase,
        ruleName: `${r.name} · ${ruleDescription(r)}`,
        rule: r,
        mode: ruleMode,
      });
    }
  }

  for (const child of node.children) walk(child, here, plan, mode);
};

const detectConflicts = (plan: Plan) => {
  const seen = new Map<string, string[]>();
  for (const m of plan.moves) {
    const k = `${m.source}|${m.pattern}`;
    const list = seen.get(k) ?? [];
    list.push(m.ruleName);
    seen.set(k, list);
  }
  for (const [k, names] of seen) {
    if (names.length > 1) {
      plan.conflicts.push({
        kind: "duplicate-target",
        message: `Multiple rules match "${k}": ${names.join(", ")}`,
      });
    }
  }
  for (const m of plan.moves) {
    if (!m.source.trim()) {
      plan.conflicts.push({
        kind: "missing-source",
        message: `Rule "${m.ruleName}" has no source folder.`,
      });
    }
    if (m.rule.match === "regex") {
      try {
        new RegExp(m.rule.regex || "");
      } catch {
        plan.conflicts.push({
          kind: "ambiguous-pattern",
          message: `Rule "${m.ruleName}" has an invalid regex.`,
        });
      }
    }
  }
};

export const buildPlan = (layout: Layout, mode: Mode = "move"): Plan => {
  const plan: Plan = { folders: [], moves: [], conflicts: [] };
  walk(layout.tree, layout.rootPath.replace(/\\$/, ""), plan, mode);
  detectConflicts(plan);
  return plan;
};

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

/* ----------------- BAT ----------------- */

const batFilterClause = (r: SortRule): string => {
  // Returns extra "if" condition expressed as a CMD test on %F
  switch (r.match) {
    case "keyword": {
      const kws = (r.keyword || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (kws.length === 0) return "";
      const ors = kws
        .map((k) => `not "!NM!"=="!NM:${k}=!"`)
        .join(" ^| ");
      return `( ${ors} )`;
    }
    case "size": {
      const bytes = Math.max(0, Math.round((r.sizeMb || 0) * 1024 * 1024));
      return r.sizeOp === "lt"
        ? `!SZ! LSS ${bytes}`
        : `!SZ! GTR ${bytes}`;
    }
    case "date": {
      // Approximate: use forfiles outside; here we just always pass and rely on PS for date
      return "";
    }
    default:
      return "";
  }
};

export const generateBat = (layout: Layout, plan: Plan, mode: Mode, dryRun: boolean) => {
  const lines: string[] = [];
  lines.push("@echo off");
  lines.push("setlocal EnableDelayedExpansion");
  lines.push(`title Drive Architect — ${layout.name}`);
  lines.push("");
  lines.push("echo ============================================");
  lines.push(`echo  Drive Architect — ${layout.name}`);
  lines.push(`echo  Mode: ${mode.toUpperCase()}${dryRun ? " (DRY RUN)" : ""}`);
  lines.push(`echo  Folders: ${plan.folders.length}    Rules: ${plan.moves.length}`);
  lines.push("echo ============================================");
  lines.push("echo.");
  lines.push("set /p CONFIRM=Proceed? (Y/N): ");
  lines.push('if /I not "%CONFIRM%"=="Y" (echo Cancelled. & pause & exit /b 0)');
  lines.push("");
  lines.push(`set LOG=%~dp0drive-architect-${stamp()}.log`);
  lines.push('echo Log: %LOG%');
  lines.push('echo Drive Architect run >> "%LOG%"');
  lines.push("");
  lines.push("echo [1/2] Creating folders...");
  for (const f of plan.folders) {
    if (dryRun) {
      lines.push(`echo [DRY] mkdir "${f.path}" >> "%LOG%"`);
      lines.push(`echo   would create: "${f.path}"`);
    } else {
      lines.push(`if not exist "${f.path}" mkdir "${f.path}"`);
      lines.push(`echo Created: "${f.path}" >> "%LOG%"`);
    }
  }
  lines.push("");
  lines.push("echo [2/2] Applying rules...");
  for (const m of plan.moves) {
    const op = m.mode === "copy" ? "copy /Y" : "move /Y";
    const filter = batFilterClause(m.rule);
    if (dryRun) {
      lines.push(`echo [DRY] ${op} "${joinWin(m.source, m.pattern)}" -> "${m.target}" >> "%LOG%"`);
      lines.push(`echo   would ${m.mode}: ${m.pattern} from ${m.source} -> ${m.target}`);
      continue;
    }
    lines.push(`if not exist "${m.target}" mkdir "${m.target}"`);
    if (!filter) {
      lines.push(`${op} "${joinWin(m.source, m.pattern)}" "${m.target}\\" >nul 2>>"%LOG%" && echo OK ${m.pattern} >> "%LOG%"`);
    } else {
      lines.push(`for %%F in ("${joinWin(m.source, m.pattern)}") do (`);
      lines.push(`  set "NM=%%~nxF"`);
      lines.push(`  set "SZ=%%~zF"`);
      lines.push(`  if ${filter} (`);
      lines.push(`    ${op} "%%F" "${m.target}\\" >nul 2>>"%LOG%" && echo OK %%~nxF >> "%LOG%"`);
      lines.push("  )");
      lines.push(")");
    }
  }
  lines.push("");
  lines.push("echo Done. See log: %LOG%");
  lines.push("pause");
  lines.push("endlocal");
  return lines.join("\r\n");
};

/* ----------------- PS1 ----------------- */

const ps1FilterClause = (r: SortRule): string => {
  switch (r.match) {
    case "keyword": {
      const kws = (r.keyword || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!kws.length) return "$true";
      return kws.map((k) => `($_.Name -like '*${k}*')`).join(" -or ");
    }
    case "regex":
      return `($_.Name -match '${(r.regex || "").replace(/'/g, "''")}')`;
    case "size": {
      const bytes = Math.max(0, Math.round((r.sizeMb || 0) * 1024 * 1024));
      return r.sizeOp === "lt" ? `($_.Length -lt ${bytes})` : `($_.Length -gt ${bytes})`;
    }
    case "date": {
      const days = Math.max(0, r.days || 0);
      return r.dateOp === "newer"
        ? `($_.LastWriteTime -gt (Get-Date).AddDays(-${days}))`
        : `($_.LastWriteTime -lt (Get-Date).AddDays(-${days}))`;
    }
    default:
      return "$true";
  }
};

export const generatePs1 = (layout: Layout, plan: Plan, mode: Mode, dryRun: boolean) => {
  const lines: string[] = [];
  lines.push("# Drive Architect — generated PowerShell script");
  lines.push(`# Layout: ${layout.name}`);
  lines.push(`# Mode: ${mode}${dryRun ? " (DRY RUN)" : ""}`);
  lines.push("$ErrorActionPreference = 'Continue'");
  lines.push(`$log = Join-Path $PSScriptRoot "drive-architect-${stamp()}.log"`);
  lines.push('Write-Host "Log: $log" -ForegroundColor Cyan');
  lines.push('"Drive Architect run started: $(Get-Date)" | Out-File $log');
  lines.push("");
  lines.push('$confirm = Read-Host "Proceed? (Y/N)"');
  lines.push('if ($confirm -notmatch "^[Yy]") { Write-Host "Cancelled."; exit }');
  lines.push("");
  lines.push('Write-Host "`n[1/2] Creating folders..." -ForegroundColor Magenta');
  for (const f of plan.folders) {
    if (dryRun) {
      lines.push(`Write-Host "  [DRY] would create: ${f.path}"`);
    } else {
      lines.push(`if (-not (Test-Path -LiteralPath "${f.path}")) { New-Item -ItemType Directory -Path "${f.path}" -Force | Out-Null; "Created: ${f.path}" | Add-Content $log }`);
    }
  }
  lines.push("");
  lines.push('Write-Host "`n[2/2] Applying rules..." -ForegroundColor Magenta');
  for (const m of plan.moves) {
    const verb = m.mode === "copy" ? "Copy-Item" : "Move-Item";
    const filter = ps1FilterClause(m.rule);
    const archive = m.rule.archiveByDate
      ? `$dest = Join-Path "${m.target}" ("{0:yyyy}\\{0:MM}" -f $_.LastWriteTime); if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }`
      : `$dest = "${m.target}"`;
    if (dryRun) {
      lines.push(`Write-Host "  [DRY] would ${m.mode}: ${m.pattern} from ${m.source} -> ${m.target}"`);
      continue;
    }
    lines.push(`if (-not (Test-Path -LiteralPath "${m.target}")) { New-Item -ItemType Directory -Path "${m.target}" -Force | Out-Null }`);
    const recurse = m.rule.recursive ? " -Recurse" : "";
    lines.push(`Get-ChildItem -Path "${m.source}" -Filter "${m.pattern}" -File${recurse} -ErrorAction SilentlyContinue | Where-Object { ${filter} } | ForEach-Object { try { ${archive}; ${verb} -LiteralPath $_.FullName -Destination $dest -Force; "${m.mode.toUpperCase()} $($_.FullName) -> $dest" | Add-Content $log } catch { "ERR $($_.Exception.Message)" | Add-Content $log } }`);
  }
  lines.push("");
  lines.push('Write-Host "`nDone. See log: $log" -ForegroundColor Green');
  lines.push("Read-Host 'Press Enter to exit'");
  return lines.join("\r\n");
};

/* ----------------- SH (bash, Windows-style paths swapped to /mnt/c style) ----------------- */

export const generateSh = (layout: Layout, plan: Plan, mode: Mode, dryRun: boolean) => {
  const toNix = (p: string) =>
    p
      .replace(/^([A-Za-z]):\\/, (_m, d: string) => `/mnt/${d.toLowerCase()}/`)
      .replace(/\\/g, "/");
  const lines: string[] = [];
  lines.push("#!/usr/bin/env bash");
  lines.push("# Drive Architect — generated bash script (WSL / macOS / Linux)");
  lines.push(`# Layout: ${layout.name}`);
  lines.push("set -u");
  lines.push(`LOG="$(dirname "$0")/drive-architect-${stamp()}.log"`);
  lines.push('echo "Log: $LOG"');
  lines.push('read -r -p "Proceed? (y/N) " ok; [[ "$ok" =~ ^[Yy]$ ]] || { echo Cancelled; exit 0; }');
  lines.push("");
  for (const f of plan.folders) {
    const p = toNix(f.path);
    if (dryRun) lines.push(`echo "[DRY] mkdir -p '${p}'"`);
    else lines.push(`mkdir -p "${p}" && echo "Created: ${p}" >> "$LOG"`);
  }
  for (const m of plan.moves) {
    const src = joinNix(toNix(m.source), m.pattern.replace("*", ""));
    const tgt = toNix(m.target);
    const cmd = m.mode === "copy" ? "cp" : "mv";
    if (dryRun) lines.push(`echo "[DRY] ${cmd} ${toNix(m.source)}/${m.pattern} -> ${tgt}"`);
    else {
      lines.push(`mkdir -p "${tgt}"`);
      lines.push(`shopt -s nullglob; for f in "${toNix(m.source)}"/${m.pattern}; do ${cmd} -f "$f" "${tgt}/" && echo "${m.mode.toUpperCase()} $f" >> "$LOG"; done; shopt -u nullglob`);
    }
    void src;
  }
  lines.push('echo "Done. See log: $LOG"');
  return lines.join("\n");
};

export const generateRollbackBat = (plan: Plan) => {
  const lines: string[] = [];
  lines.push("@echo off");
  lines.push("title Drive Architect — Rollback");
  lines.push("echo This will attempt to move files back to their original folders.");
  lines.push("set /p CONFIRM=Continue? (Y/N): ");
  lines.push('if /I not "%CONFIRM%"=="Y" (echo Cancelled. & pause & exit /b 0)');
  for (const m of plan.moves) {
    lines.push(`if not exist "${m.source}" mkdir "${m.source}"`);
    lines.push(`move /Y "${m.target}\\${m.pattern}" "${m.source}\\" >nul 2>&1`);
  }
  lines.push("echo Rollback finished.");
  lines.push("pause");
  return lines.join("\r\n");
};

export const generate = (
  layout: Layout,
  kind: ScriptKind,
  mode: Mode,
  dryRun: boolean
) => {
  const plan = buildPlan(layout, mode);
  const main =
    kind === "bat"
      ? generateBat(layout, plan, mode, dryRun)
      : kind === "ps1"
      ? generatePs1(layout, plan, mode, dryRun)
      : generateSh(layout, plan, mode, dryRun);
  const rollback = generateRollbackBat(plan);
  return { plan, main, rollback };
};
