export const uid = () =>
  Math.random().toString(36).slice(2, 8) +
  Math.random().toString(36).slice(2, 6);
