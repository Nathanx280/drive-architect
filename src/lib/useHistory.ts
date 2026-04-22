import { useEffect, useRef, useState } from "react";

/** Bounded undo/redo stack hook. */
export function useHistory<T>(initial: T, limit = 60) {
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const skipNext = useRef(false);

  // Push to history when present changes (except during undo/redo).
  const lastSnapshot = useRef(initial);
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      lastSnapshot.current = present;
      return;
    }
    if (lastSnapshot.current !== present) {
      past.current.push(lastSnapshot.current);
      if (past.current.length > limit) past.current.shift();
      future.current = [];
      lastSnapshot.current = present;
    }
  }, [present, limit]);

  const undo = () => {
    if (!past.current.length) return;
    const prev = past.current.pop()!;
    future.current.push(present);
    skipNext.current = true;
    setPresent(prev);
  };
  const redo = () => {
    if (!future.current.length) return;
    const next = future.current.pop()!;
    past.current.push(present);
    skipNext.current = true;
    setPresent(next);
  };
  const reset = (val: T) => {
    past.current = [];
    future.current = [];
    skipNext.current = true;
    lastSnapshot.current = val;
    setPresent(val);
  };

  return {
    state: present,
    set: setPresent,
    undo,
    redo,
    reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
