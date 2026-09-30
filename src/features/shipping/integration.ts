import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { encryptValue, decryptValue } from "@/lib/secret-vault";
import { defaultShippingSettings, shippingSettingsSchema, ShippingError, type ShippingSettings } from "./schema";
import { melhorEnvioRequest, tokenSchema } from "./provider";

export const SHIPPING_INTEGRATION_ID = "melhor-envio";
const credentialsSchema = z.object({
  clientId: z.string().min(1), clientSecret: z.string().min(1),
  accessToken: z.string().optional(), refreshToken: z.string().optional(), expiresAt: z.number().optional(),
});
export type ShippingCredentials = z.infer<typeof credentialsSchema>;
export async function readShippingIntegration() {
  const row = await getPrisma().shippingIntegration.findUnique({ where: { id: SHIPPING_INTEGRATION_ID } });
  if (!row) return { settings: defaultShippingSettings as ShippingSettings, credentials: null, revision: 0 };
  const settings = shippingSettingsSchema.parse(row.settings);
  const credentials = row.ciphertext && row.iv && row.tag ? credentialsSchema.parse(JSON.parse(decryptValue({ ciphertext: row.ciphertext, iv: row.iv, tag: row.tag }))) : null;
  return { settings, credentials, revision: row.revision };
}
export async function saveShippingSettings(settings: ShippingSettings, revision: number, userId: string, application?: { clientId: string; clientSecret: string }) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.shippingIntegration.findUnique({ where: { id: SHIPPING_INTEGRATION_ID } });
    if ((existing?.revision ?? 0) !== revision) throw new ShippingError("A configuração mudou. Atualize a página antes de salvar.", 409);
    const previousEnvironment = existing ? shippingSettingsSchema.parse(existing.settings).environment : undefined;
    const reset = Boolean(application) || previousEnvironment !== settings.environment;
    if (reset && settings.enabled) throw new ShippingError("Salve a conexão desativada e autorize o aplicativo antes de habilitar as cotações.");
    if (settings.enabled && (!existing?.ciphertext || !settings.serviceIds.length || settings.environment !== "production")) throw new ShippingError("Conecte a conta de produção e selecione os serviços antes de ativar.");
    if (settings.enabled && existing?.ciphertext && existing.iv && existing.tag) {
      const connected = credentialsSchema.parse(JSON.parse(decryptValue({ ciphertext: existing.ciphertext, iv: existing.iv, tag: existing.tag })));
      if (!connected.accessToken || !connected.refreshToken) throw new ShippingError("Autorize a conta no Melhor Envio antes de ativar as cotações.");
    }
    const encrypted = application ? encryptValue(JSON.stringify(application)) : undefined;
    const data = { settings, ...(encrypted ?? {}), ...(reset && !encrypted ? { ciphertext: null, iv: null, tag: null } : {}) };
    const saved = existing
      ? await tx.shippingIntegration.updateMany({ where: { id: SHIPPING_INTEGRATION_ID, revision }, data: { ...data, revision: { increment: 1 } } })
      : await tx.shippingIntegration.create({ data: { id: SHIPPING_INTEGRATION_ID, ...data } });
    if ("count" in saved && saved.count !== 1) throw new ShippingError("A configuração mudou. Atualize a página.", 409);
    await tx.auditLog.create({ data: { userId, action: "SHIPPING_SETTINGS_UPDATED", entity: "ShippingIntegration", entityId: SHIPPING_INTEGRATION_ID, metadata: { enabled: settings.enabled, environment: settings.environment, credentialsChanged: reset } } });
  });
}

let refreshInFlight: Promise<string> | null = null;
export async function shippingAccessToken() {
  const current = await readShippingIntegration();
  const credentials = current.credentials;
  if (!credentials?.accessToken || !credentials.refreshToken || !credentials.expiresAt) throw new ShippingError("A integração com o Melhor Envio ainda não foi conectada.", 503);
  if (credentials.expiresAt > Date.now() + 5 * 60 * 1000) return credentials.accessToken;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    // A database advisory lock also serializes refreshes across app instances.
    return getPrisma().$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(728239144)`;
      const row = await tx.shippingIntegration.findUniqueOrThrow({ where: { id: SHIPPING_INTEGRATION_ID } });
      if (!row.ciphertext || !row.iv || !row.tag) throw new ShippingError("Reconecte o Melhor Envio.", 503);
      const latest = credentialsSchema.parse(JSON.parse(decryptValue({ ciphertext: row.ciphertext, iv: row.iv, tag: row.tag })));
      if (latest.accessToken && latest.expiresAt && latest.expiresAt > Date.now() + 5 * 60 * 1000) return latest.accessToken;
      if (!latest.refreshToken) throw new ShippingError("Reconecte o Melhor Envio.", 503);
      const settings = shippingSettingsSchema.parse(row.settings);
      const tokens = tokenSchema.parse(await melhorEnvioRequest(settings, "/oauth/token", undefined, { grant_type: "refresh_token", client_id: latest.clientId, client_secret: latest.clientSecret, refresh_token: latest.refreshToken }));
      const encrypted = encryptValue(JSON.stringify({ ...latest, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000 }));
      const updated = await tx.shippingIntegration.updateMany({ where: { id: row.id, revision: row.revision, ciphertext: row.ciphertext }, data: encrypted });
      if (updated.count !== 1) throw new ShippingError("A conexão mudou. Repita a consulta.", 409);
      return tokens.access_token;
    }, { timeout: 20_000, maxWait: 20_000 });
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
