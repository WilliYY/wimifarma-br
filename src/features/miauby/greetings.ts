/** Local UI copy only: no profile, product lookup or assistant requests. */
export function safeMiaubyFirstName(value: unknown): string | null {
  if (typeof value !== "string" || /[\r\n<>@]/u.test(value)) return null;
  const firstName = value.trim().split(/\s+/u)[0];
  return firstName && /^[\p{L}\p{M}][\p{L}\p{M}'’\-]{0,23}$/u.test(firstName) ? firstName : null;
}

export function miaubyRouteTip(pathname: string): { key: string; text: string } | null {
  if (pathname === "/catalogo" || pathname.startsWith("/catalogo/")) {
    return { key: "catalog", text: "Explorando o catálogo? Posso ajudar a encontrar um produto." };
  }
  if (pathname.startsWith("/produto/")) {
    return { key: "product", text: "Quer consultar um produto? Abra a conversa e me diga o nome." };
  }
  if (pathname === "/carrinho") {
    return { key: "cart", text: "Seu carrinho está por aqui. Posso explicar entrega e retirada." };
  }
  return null;
}

type NoticeStorage = Pick<Storage, "getItem" | "setItem">;
const noticesKey = "miauby-notices-v2";

/** Store opaque identity markers only; never store names or conversation content. */
export function claimMiaubyNotice(storage: NoticeStorage, identity: string, kind: string): boolean {
  try {
    const raw = storage.getItem(noticesKey);
    const value: unknown = raw ? JSON.parse(raw) : { welcomes: [], tips: [] };
    if (!value || typeof value !== "object" || !("welcomes" in value) || !("tips" in value)) return false;
    const { welcomes, tips } = value;
    if (!Array.isArray(welcomes) || !Array.isArray(tips) || welcomes.length > 8 || tips.length > 3 || [...welcomes, ...tips].some(marker => typeof marker !== "string" || marker.length > 80)) return false;
    const markers = kind === "welcome" ? welcomes : tips;
    if (markers.length >= (kind === "welcome" ? 8 : 3)) return false;
    const marker = `${identity}:${kind}`;
    if (markers.includes(marker)) return false;
    markers.push(marker);
    storage.setItem(noticesKey, JSON.stringify({ welcomes, tips }));
    return true;
  } catch {
    return false;
  }
}
