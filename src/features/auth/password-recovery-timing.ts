export const passwordEmailCodeLifetime = {
  recovery: { milliseconds: 60 * 60_000, label: "1 hora" },
  verification: { milliseconds: 15 * 60_000, label: "15 minutos" },
} as const;
