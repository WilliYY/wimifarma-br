const storageKey = "wimifarma-shipping-postal-code";
const postalCodePattern = /^(?!00000000)\d{8}$/;

export function readPreferredPostalCode() {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value && postalCodePattern.test(value) ? value : "";
  } catch {
    return "";
  }
}

export function rememberPreferredPostalCode(value: string) {
  if (!postalCodePattern.test(value)) return;
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // The estimate and checkout also work when browser storage is unavailable.
  }
}
