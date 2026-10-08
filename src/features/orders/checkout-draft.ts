import { z } from "zod";
import { isLocalDeliveryAddress } from "@/features/shipping/delivery-policy";
import { normalizeBrazilianPhone } from "@/lib/brazilian-phone";
import { shippingSelectionSchema } from "@/features/shipping/schema";

export const CHECKOUT_DRAFT_KEY = "wimifarma-checkout-draft-v1";
export const CHECKOUT_DRAFT_TTL = 2 * 60 * 60 * 1000;
export const checkoutSteps = ["identificacao", "entrega", "pagamento", "revisao"] as const;
export type CheckoutStep = 0 | 1 | 2 | 3;

export const draftSchema = z.object({
  customer: z.object({ name: z.string().max(120), phone: z.string().max(20), email: z.string().max(160) }),
  address: z.object({ postalCode: z.string().max(9), street: z.string().max(120), number: z.string().max(20), complement: z.string().max(80), neighborhood: z.string().max(80), city: z.string().max(80), state: z.string().max(2) }),
  fulfillmentMethod: z.enum(["DELIVERY", "PICKUP"]),
  paymentMethod: z.enum(["PIX", "CARD_ON_DELIVERY", "CASH", "ONLINE"]),
  notes: z.string().max(500),
  shippingSelection: shippingSelectionSchema.optional(),
  onlineMethod: z.enum(["pix", "card"]).optional(),
  onlineInstallments: z.number().int().min(1).max(12).optional(),
});
export type CheckoutDraft = z.infer<typeof draftSchema>;

export function readCheckoutDraft(raw: string | null, owner: string, now = Date.now()): CheckoutDraft | null {
  if (!raw || raw.length > 8_000) return null;
  try {
    const parsed = z.object({ owner: z.string(), savedAt: z.number(), data: draftSchema }).safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.owner !== owner || now < parsed.data.savedAt || now - parsed.data.savedAt >= CHECKOUT_DRAFT_TTL) return null;
    return parsed.data.data;
  } catch { return null; }
}

export function checkoutStepError(step: CheckoutStep, draft: CheckoutDraft): string | null {
  if (step === 0) {
    if (draft.customer.name.trim().length < 2) return "Informe seu nome completo.";
    if (!normalizeBrazilianPhone(draft.customer.phone)) return "Informe um telefone válido com DDD. Você pode usar +55.";
    if (draft.customer.email && !z.email().safeParse(draft.customer.email.trim()).success) return "Informe um e-mail valido ou deixe o campo vazio.";
  }
  if (step === 1 && draft.fulfillmentMethod === "DELIVERY") {
    const address = draft.address;
    if (address.postalCode.replace(/\D/g, "").length !== 8 || !address.street.trim() || !address.number.trim() || !address.neighborhood.trim() || !address.city.trim() || !/^[A-Z]{2}$/.test(address.state)) return "Preencha CEP, endereco, numero, bairro, cidade e UF.";
    if (!draft.shippingSelection && !isLocalDeliveryAddress(address)) return "Calcule e escolha o frete para este CEP, ou selecione retirada na farmácia.";
  }
  return null;
}

export function allowedCheckoutStep(requested: number, draft: CheckoutDraft): CheckoutStep {
  const target = Math.min(3, Math.max(0, Math.trunc(requested) || 0)) as CheckoutStep;
  for (let step = 0; step < target; step++) if (checkoutStepError(step as CheckoutStep, draft)) return step as CheckoutStep;
  return target;
}
