// .env에 키만 있고 값이 비면 Number('')가 0
export const positive = (
  value: string | undefined,
  fallback: number,
): number => (Number(value) > 0 ? Number(value) : fallback);
