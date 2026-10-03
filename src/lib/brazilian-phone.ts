const areaCodes = new Set("11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99".split(" "));

/** Returns DDD + subscriber number; international prefixes are removed only when explicit. */
export function normalizeBrazilianPhone(value: string): string | null {
  const text = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(text)) return null;
  let digits = text.replace(/\D/g, "");
  if (text.startsWith("+") && !text.startsWith("+55")) return null;
  if (digits.startsWith("0055") && [14, 15].includes(digits.length)) digits = digits.slice(4);
  else if (digits.startsWith("55") && [12, 13].includes(digits.length)) digits = digits.slice(2);
  else if (text.startsWith("+")) return null;
  if (![10, 11].includes(digits.length) || !areaCodes.has(digits.slice(0, 2))) return null;
  const number = digits.slice(2);
  if (!/^(?:[2-5]\d{7}|9\d{8})$/.test(number) || /^(\d)\1+$/.test(digits)) return null;
  return digits;
}
