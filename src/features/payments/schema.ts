import { z } from "zod";

export class PaymentError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export const ASAAS_MIN_CARD_AMOUNT_CENTS = 500;
export const paymentSettingsSchema = z.object({
  revision: z.number().int().nonnegative(), enabled: z.boolean(), environment: z.enum(["test", "production"]),
  publicKey: z.string().trim().min(10).max(200),
  accessToken: z.string().trim().min(10).max(500).optional(),
  webhookSecret: z.string().trim().min(10).max(500).optional(),
});
export const paymentInputSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("pix"), email: z.email().max(160) }),
  z.object({
    method: z.literal("card"), email: z.email().max(160),
    token: z.string().regex(/^[a-zA-Z0-9_-]{10,250}$/),
    paymentMethodId: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),
    paymentType: z.enum(["credit_card", "debit_card", "prepaid_card"]),
    installments: z.number().int().min(1).max(12),
    identification: z.object({ type: z.enum(["CPF", "CNPJ"]), number: z.string().regex(/^\d{11,14}$/) }).optional(),
  }).refine(value => value.paymentType === "credit_card" || value.installments === 1, "Débito e pré-pago são à vista."),
]);
export type PaymentInput = z.infer<typeof paymentInputSchema>;
const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
export const providerOrderSchema = z.object({
  id: z.string().regex(/^ORD[A-Z0-9]+$/i), type: z.literal("online"),
  external_reference: z.string(), total_amount: money,
  country_code: z.literal("BRA"), user_id: z.union([z.string(), z.number()]).transform(String),
  currency: z.literal("BRL").optional(), currency_id: z.literal("BRL").optional(),
  status: z.string(), status_detail: z.string().optional(),
  last_updated_date: z.string().datetime({ offset: true }),
  transactions: z.object({ payments: z.array(z.object({
    amount: money, status: z.string(), status_detail: z.string().optional(),
    date_of_expiration: z.string().datetime({ offset: true }).optional(),
    payment_method: z.object({ id: z.string(), type: z.string(), qr_code: z.string().max(5000).optional() }),
  })).length(1) }),
});
export type ProviderOrder = z.infer<typeof providerOrderSchema>;
export const terminalPaymentStatuses = ["PAID", "FAILED", "CANCELED", "REFUNDED", "DISPUTED"];
