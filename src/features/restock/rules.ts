import { z } from "zod";
import { requiresPurchaseAssistance, type ProductPurchaseRules } from "@/features/products/purchase-policy";
import { toSaleProduct, type CommerceProduct } from "@/features/supplier-catalog/commerce";
import { RestockError } from "./contracts";

export type RestockProduct = CommerceProduct & ProductPurchaseRules & { status: string; deletedAt: Date | null };
export function restockAvailability(product: RestockProduct, now = Date.now()) {
  const eligible = product.status === "ACTIVE" && product.deletedAt === null && !requiresPurchaseAssistance(product);
  return { eligible, available: eligible && toSaleProduct(product, now).availableForPurchase };
}
export function assertSubscription(product: RestockProduct, now = Date.now()) {
  const availability = restockAvailability(product, now);
  if (!availability.eligible) throw new RestockError("Produto indisponível para avisos.", 404);
  if (availability.available) throw new RestockError("Este produto já está disponível.", 409);
}
export function currentContacts(customer: { phone: string | null; email: string | null }) {
  const digits = customer.phone?.replace(/\D/g, "") ?? "";
  const phone = /^(?:55)?[1-9]\d(?:9\d{8}|[2-5]\d{7})$/.test(digits) ? (digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`) : null;
  const email = z.string().email().max(254).safeParse(customer.email?.trim());
  return { phone, email: email.success ? email.data : null };
}
export function contactChannels(customer: { phone: string | null; email: string | null }, channels: { whatsapp: boolean; email: boolean }) {
  const contacts = currentContacts(customer);
  if (!channels.whatsapp && !channels.email) throw new RestockError("Escolha pelo menos um canal.");
  if ((channels.whatsapp && !contacts.phone) || (channels.email && !contacts.email)) throw new RestockError("Atualize o contato do canal escolhido na sua conta.");
  return { phone: channels.whatsapp ? contacts.phone : null, email: channels.email ? contacts.email : null };
}

export function restockContactsMatch(row: { whatsapp: boolean; emailEnabled: boolean; phone: string | null; email: string | null }, customer: { phone: string | null; email: string | null }) {
  const contact = currentContacts(customer);
  return (!row.whatsapp || Boolean(row.phone && row.phone === contact.phone)) &&
    (!row.emailEnabled || Boolean(row.email && row.email === contact.email));
}
