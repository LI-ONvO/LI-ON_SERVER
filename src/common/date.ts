export const toDateString = (value: Date | null): string | null =>
  value === null ? null : value.toISOString().slice(0, 10);

export const toIsoSeconds = (value: Date): string =>
  `${value.toISOString().slice(0, 19)}Z`;
