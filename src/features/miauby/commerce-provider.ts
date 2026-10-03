import { bridgeResultSchema, type CommerceType } from "./commerce-rules";

export function commerceConnection() {
  const base = process.env.MIAUBY_COMMERCE_URL;
  const token = process.env.MIAUBY_COMMERCE_TOKEN;
  if (!base || !token || token.length < 32) return null;
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash || !["http:", "https:"].includes(url.protocol)) return null;
    if (url.protocol === "http:" && !["wimifarma-miauw-whatsapp", "127.0.0.1", "localhost"].includes(url.hostname)) return null;
    return { base: base.replace(/\/$/, ""), token };
  } catch { return null; }
}
async function bridgeRequest(path: string, body?: unknown) {
  const connection = commerceConnection();
  if (!connection) throw new Error("MIAUBY_NOT_CONFIGURED");
  const response = await fetch(`${connection.base}/${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${connection.token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(body ? 95_000 : 10_000), redirect: "error", cache: "no-store" });
  if (!response.ok) throw new Error("MIAUBY_BRIDGE_UNAVAILABLE");
  if (!response.body) throw new Error("MIAUBY_INVALID_RESPONSE");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_000) { await reader.cancel(); throw new Error("MIAUBY_INVALID_RESPONSE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export async function sendCommerceEvent(event: { id: string; type: string; text: string }) {
  return bridgeResultSchema.parse(await bridgeRequest("alerts", { eventId: event.id, type: event.type as CommerceType, text: event.text }));
}
export async function commerceTransportStatus(): Promise<"connected" | "unavailable" | "unknown" | "unconfigured"> {
  if (!commerceConnection()) return "unconfigured";
  try {
    const data = await bridgeRequest("status") as { configured?: boolean; enabled?: boolean; connected?: boolean | null };
    if (!data.configured || !data.enabled) return "unavailable";
    return data.connected === true ? "connected" : data.connected === false ? "unavailable" : "unknown";
  } catch { return "unavailable"; }
}
