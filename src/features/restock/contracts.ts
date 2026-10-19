import { z } from "zod";

const id = z.string().trim().min(1).max(100);
export const subscribeSchema = z.object({ productId: id, whatsapp: z.boolean(), email: z.boolean(), consent: z.literal(true) }).strict().refine(value => value.whatsapp || value.email);
export const cancelSchema = z.object({ id }).strict();
export const notificationSchema = z.object({ id, channel: z.enum(["WHATSAPP", "EMAIL"]), updatedAt: z.string().datetime() }).strict();
export const customerQuerySchema = z.object({ productId: id.optional() }).strict();
export const adminQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100_000).default(1), filter: z.enum(["all", "available"]).default("all") }).strict();
export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type RestockStatus = "WAITING" | "NOTIFIED" | "CANCELED" | "EXPIRED";
export type RestockInterestDto = {
  id: string; product: { id: string; name: string; slug: string; imageUrl?: string | null };
  whatsapp: boolean; emailEnabled: boolean; phone: string | null; email: string | null;
  whatsappNotifiedAt: string | null; emailNotifiedAt: string | null; status: RestockStatus;
  createdAt: string; expiresAt: string; updatedAt: string; available: boolean;
};

export class RestockError extends Error {
  constructor(message: string, public readonly status = 422) { super(message); }
}
