import type { FolderNode, Layout, Mode, ScriptKind } from "./types";

const joinWin = (...parts: string[]) =>
  parts
    .filter(Boolean)
    .join("\\")
    .replace(/\\+/g, "\\")
    .replace(/\\$/, "");

export type PlannedFolder = { path: string };
export type PlannedMove = {
  source: string;
  pattern: string;
  target: string;
  ruleName: string;
};

export type Plan = {
  folders: PlannedFolder[];
  moves: PlannedMove[];
};

const walk = (
  node: FolderNode,
  parentPath: string,
  plan: Plan
) => {
  const here = joinWin(parentPath, node.name);
  plan.folders.push({ path: here });
  for (const r of node.rules) {
    const exts = r.extensions
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const targetPath = joinWin(here, r.target || "");
    if (exts.length === 0 || exts.includes("*")) {
      plan.moves.push({
        source: r.source,
        pattern: "*.*",
        target: targetPath,
        ruleName: r.name,
      });
    } else {
      for (const ext of exts) {
        const clean = ext.startsWith(".") ? ext : "." + ext;
        plan.moves.push({
          source: r.source,
          pattern: "*" + clean,
          target: targetPath,
          ruleName: r.name,
        });
      }
    }
  }
  for (const child of node.children) walk(child, here, plan);
};

export const buildPlan = (layout: Layout): Plan => {
  const plan: Plan = { folders: [], moves: [] };
  walk(layout.tree, layout.rootPath.replace(/\\$/, ""), plan);
  return plan;
};

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

export const generateBat = (layout: Layout, plan: Plan, mode: Mode, dryRun: boolean) => {
  const op = mode === "copy" ? "copy /Y" : "move /Y";
  const lines: string[] = [];
  lines.push("@echo off");
  lines.push("setlocal EnableDelayedExpansion");
  lines.push(`title Drive Architect — ${layout.name}`);
  lines.push("");
  lines.push("echo ============================================");
  lines.push(`echo  Drive Architect — ${layout.name}`);
  lines.push(`echo  Mode: ${mode.toUpperCase()}${dryRun ? " (DRY RUN)" : ""}`);
  lines.push("echo ============================================");
  lines.push("echo.");
  lines.push("set /p CONFIRM=Proceed? (Y/N): ");
  lines.push('if /I not "%CONFIRM%"=="Y" (echo Cancelled. & pause & exit /b 0)');
  lines.push("");
  lines.push(`set LOG=%~dp0drive-architect-${stamp()}.log`);
  lines.push('echo Log: %LOG%');
  lines.push('echo Drive Architect run >> "%LOG%"');
  lines.push("");
  lines.push("echo.");
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
  lines.push("echo [2/2] Applying file rules...");
  for (const m of plan.moves) {
    const src = joinWin(m.source, m.pattern);
    if (dryRun) {
      lines.push(`echo [DRY] ${op} "${src}" "${m.target}" >> "%LOG%"`);
      lines.push(`echo   would ${mode}: ${src} -> ${m.target}`);
    } else {
      lines.push(`if not exist "${m.target}" mkdir "${m.target}"`);
      lines.push(`${op} "${src}" "${m.target}\\" >nul 2>>"%LOG%" && echo OK ${src} ^>^> ${m.target} >> "%LOG%"`);
    }
  }
  lines.push("");
  lines.push("echo.");
  lines.push("echo Done. See log: %LOG%");
  lines.push("pause");
  lines.push("endlocal");
  return lines.join("\r\n");
};

export const generatePs1 = (layout: Layout, plan: Plan, mode: Mode, dryRun: boolean) => {
  const verb = mode === "copy" ? "Copy-Item" : "Move-Item";
  const lines: string[] = [];
  lines.push("# Drive Architect — generated PowerShell script");
  lines.push(`# Layout: ${layout.name}`);
  lines.push(`# Mode: ${mode}${dryRun ? " (DRY RUN)" : ""}`);
  lines.push("$ErrorActionPreference = 'Continue'");
  lines.push(`$log = Join-Path $PSScriptRoot "drive-architect-${stamp()}.log"`);
  lines.push('Write-Host "Log: $log"');
  lines.push('"Drive Architect run started: $(Get-Date)" | Out-File $log');
  lines.push("");
  lines.push('$confirm = Read-Host "Proceed? (Y/N)"');
  lines.push('if ($confirm -notmatch "^[Yy]") { Write-Host "Cancelled."; exit }');
  lines.push("");
  lines.push('Write-Host "`n[1/2] Creating folders..." -ForegroundColor Cyan');
  for (const f of plan.folders) {
    if (dryRun) {
      lines.push(`Write-Host "  [DRY] would create: ${f.path}"`);
    } else {
      lines.push(`if (-not (Test-Path -LiteralPath "${f.path}")) { New-Item -ItemType Directory -Path "${f.path}" -Force | Out-Null; "Created: ${f.path}" | Add-Content $log }`);
    }
  }
  lines.push("");
  lines.push('Write-Host "`n[2/2] Applying file rules..." -ForegroundColor Cyan');
  for (const m of plan.moves) {
    const src = joinWin(m.source, m.pattern);
    if (dryRun) {
      lines.push(`Write-Host "  [DRY] would ${mode}: ${src} -> ${m.target}"`);
    } else {
      lines.push(`if (-not (Test-Path -LiteralPath "${m.target}")) { New-Item -ItemType Directory -Path "${m.target}" -Force | Out-Null }`);
      lines.push(`Get-ChildItem -Path "${m.source}" -Filter "${m.pattern}" -File -ErrorAction SilentlyContinue | ForEach-Object { try { ${verb} -LiteralPath $_.FullName -Destination "${m.target}" -Force; "${mode.toUpperCase()} $($_.FullName) -> ${m.target}" | Add-Content $log } catch { "ERR $($_.Exception.Message)" | Add-Content $log } }`);
    }
  }
  lines.push("");
  lines.push('Write-Host "`nDone. See log: $log" -ForegroundColor Green');
  lines.push("Read-Host 'Press Enter to exit'");
  return lines.join("\r\n");
};

export const generateRollbackBat = (plan: Plan) => {
  const lines: string[] = [];
  lines.push("@echo off");
  lines.push("title Drive Architect — Rollback");
  lines.push("echo This will attempt to move files back to their original folders.");
  lines.push("echo NOTE: rollback is best-effort and uses the original RULE source as destination.");
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

export const generate = (layout: Layout, kind: ScriptKind, mode: Mode, dryRun: boolean) => {
  const plan = buildPlan(layout);
  const main = kind === "bat" ? generateBat(layout, plan, mode, dryRun) : generatePs1(layout, plan, mode, dryRun);
  const rollback = generateRollbackBat(plan);
  return { plan, main, rollback };
};
