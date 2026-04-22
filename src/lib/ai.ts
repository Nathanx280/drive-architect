/** Heuristic AI-style suggestions based on layout shape. */
import type { Layout, SortRule } from "./types";
import { uid } from "./uid";

export type Suggestion = {
  id: string;
  title: string;
  detail: string;
  apply: (l: Layout) => Layout;
};

const HOME = "%USERPROFILE%";

const findFolder = (l: Layout, name: string) => {
  const stack = [l.tree];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.name.toLowerCase() === name.toLowerCase()) return n;
    n.children.forEach((c) => stack.push(c));
  }
  return null;
};

const addFolder = (l: Layout, parentName: string, child: { name: string; rules?: SortRule[] }): Layout => {
  const clone = structuredClone(l) as Layout;
  const stack = [clone.tree];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.name === parentName) {
      n.children.push({
        id: uid(),
        name: child.name,
        children: [],
        rules: child.rules ?? [],
      });
      return clone;
    }
    n.children.forEach((c) => stack.push(c));
  }
  return clone;
};

export const computeSuggestions = (layout: Layout): Suggestion[] => {
  const out: Suggestion[] = [];

  if (!findFolder(layout, "Pictures") && !findFolder(layout, "Images")) {
    out.push({
      id: "add-pics",
      title: "Add a Pictures folder with image rule",
      detail: "Auto-sort .jpg/.png/.webp from your Desktop.",
      apply: (l) =>
        addFolder(l, l.tree.name, {
          name: "Pictures",
          rules: [
            {
              id: uid(),
              name: "Images from Desktop",
              match: "ext",
              extensions: ".jpg,.jpeg,.png,.gif,.webp,.bmp",
              target: "",
              source: `${HOME}\\Desktop`,
            },
          ],
        }),
    });
  }

  if (!findFolder(layout, "Archives")) {
    out.push({
      id: "add-archives",
      title: "Add Archives folder for .zip/.rar",
      detail: "Keep your Downloads tidy.",
      apply: (l) =>
        addFolder(l, l.tree.name, {
          name: "Archives",
          rules: [
            {
              id: uid(),
              name: "Archives from Downloads",
              match: "ext",
              extensions: ".zip,.rar,.7z,.tar,.gz",
              target: "",
              source: `${HOME}\\Downloads`,
            },
          ],
        }),
    });
  }

  if (!findFolder(layout, "BigFiles")) {
    out.push({
      id: "big-files",
      title: "Quarantine files larger than 500 MB",
      detail: "Move giant files out of your Downloads automatically.",
      apply: (l) =>
        addFolder(l, l.tree.name, {
          name: "BigFiles",
          rules: [
            {
              id: uid(),
              name: "Big files (>500MB)",
              match: "size",
              sizeOp: "gt",
              sizeMb: 500,
              extensions: "*",
              target: "",
              source: `${HOME}\\Downloads`,
              archiveByDate: true,
            },
          ],
        }),
    });
  }

  if (!findFolder(layout, "Old")) {
    out.push({
      id: "old-docs",
      title: "Archive Documents older than 180 days",
      detail: "Group by year/month so nothing is lost.",
      apply: (l) =>
        addFolder(l, l.tree.name, {
          name: "Old",
          rules: [
            {
              id: uid(),
              name: "Old docs",
              match: "date",
              dateOp: "older",
              days: 180,
              extensions: "*",
              target: "",
              source: `${HOME}\\Documents`,
              archiveByDate: true,
            },
          ],
        }),
    });
  }

  // Always present: rename root if "Root"
  if (layout.tree.name === "Root") {
    out.push({
      id: "rename-root",
      title: "Rename Root → Cosmos",
      detail: "A more on-theme name for the top of your layout.",
      apply: (l) => ({ ...l, tree: { ...l.tree, name: "Cosmos" } }),
    });
  }

  return out.slice(0, 5);
};

/** Simulated deep-scan results for the preview tab. */
export const simulateDeepScan = (layout: Layout) => {
  let folders = 0;
  let rules = 0;
  const stack = [layout.tree];
  while (stack.length) {
    const n = stack.pop()!;
    folders++;
    rules += n.rules.length;
    n.children.forEach((c) => stack.push(c));
  }
  // Pseudo-random but stable
  const seed = layout.id
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (mod: number) => ((seed * 9301 + 49297) % 233280 % mod);
  const filesScanned = 1200 + rand(8000);
  const dupGroups = rand(40);
  const reclaimableMb = (rand(40000) / 10).toFixed(1);
  return {
    folders,
    rules,
    filesScanned,
    duplicateGroups: dupGroups,
    reclaimableMb,
    elapsedMs: 600 + rand(2400),
  };
};
