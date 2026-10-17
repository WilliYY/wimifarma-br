/** Converts an explicit decimal amount to cents (or percent to basis points). */
export function decimalToMinorUnits(text: string): number | null {
  const value = text.trim();
  if (!value) return null;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) {
    throw new Error("Use um valor positivo com até duas casas, sem separador de milhar.");
  }
  const [whole, fraction = ""] = value.split(/[.,]/);
  const amount = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (amount > BigInt(100_000_000)) throw new Error("Valor acima do limite permitido.");
  return Number(amount);
}

export function quantityFromText(text: string): number {
  const value = text.trim();
  if (!/^\d+$/.test(value) || BigInt(value) < BigInt(1) || BigInt(value) > BigInt(10_000)) {
    throw new Error("Informe uma quantidade inteira de 1 a 10.000.");
  }
  return Number(value);
}
