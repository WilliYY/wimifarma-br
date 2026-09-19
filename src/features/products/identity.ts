export function isValidGtin(value: string) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === check;
}

export function productIdentityKey(input: { name: string; brand: string; ean: string }) {
  return JSON.stringify([input.name.trim().toLowerCase(), input.brand.trim().toLowerCase(), input.ean.trim()]);
}
