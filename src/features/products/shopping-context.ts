export const SHOPPING_CONTEXT_KEY = "wimifarma:shopping-context:v1";
export const SHOPPING_RETURN_KEY = "wimifarma:shopping-return:v1";
export const SHOPPING_CONTEXT_MAX_AGE = 2 * 60 * 60 * 1000;

export type ShoppingContext = { href: string; scrollY: number; savedAt: number };

// Persist only public catalog filters, never arbitrary return URLs or query parameters.
export function shoppingListHref(value: string): string | null {
  if (value.length > 1600 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return null;
  const url = new URL(value, "https://shopping.invalid");
  if (url.origin !== "https://shopping.invalid" || !/^(\/(catalogo|busca|ofertas)|\/categorias\/[a-z0-9-]+)$/.test(url.pathname) || url.hash) return null;
  const allowed = new Set(["q", "grupo", "assunto", "marca", "ordem", "ofertas", "pagina"]);
  for (const [key, item] of url.searchParams) {
    if (!allowed.has(key) || item.length > 120 || /[\u0000-\u001f]/.test(item) || url.searchParams.getAll(key).length > 1) return null;
  }
  return `${url.pathname}${url.search}`;
}

export function readShoppingContext(value: string | null, now = Date.now()): ShoppingContext | null {
  try {
    const record = JSON.parse(value ?? "null");
    if (!record || typeof record.href !== "string" || shoppingListHref(record.href) !== record.href ||
      !Number.isFinite(record.scrollY) || record.scrollY < 0 || record.scrollY > 1_000_000 ||
      !Number.isFinite(record.savedAt) || record.savedAt > now || now - record.savedAt > SHOPPING_CONTEXT_MAX_AGE) return null;
    return { href: record.href, scrollY: record.scrollY, savedAt: record.savedAt };
  } catch { return null; }
}
