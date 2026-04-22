import type { Layout } from "./types";

const KEY = "drive-architect:layouts";
const HIST = "drive-architect:last";

export const loadLayouts = (): Layout[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Layout[];
  } catch {
    return [];
  }
};

export const saveLayouts = (layouts: Layout[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(layouts));
};

export const upsertLayout = (layout: Layout) => {
  const all = loadLayouts();
  const idx = all.findIndex((l) => l.id === layout.id);
  const next = { ...layout, updatedAt: Date.now() };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  saveLayouts(all);
  return next;
};

export const deleteLayout = (id: string) => {
  saveLayouts(loadLayouts().filter((l) => l.id !== id));
};

export const persistLast = (layout: Layout) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(HIST, JSON.stringify(layout)); } catch { /* noop */ }
};

export const loadLast = (): Layout | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HIST);
    return raw ? (JSON.parse(raw) as Layout) : null;
  } catch { return null; }
};
