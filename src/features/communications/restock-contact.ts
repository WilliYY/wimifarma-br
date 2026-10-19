import { SITE_URL } from "@/lib/seo";

/** Drafts only. Opening a link never marks a message as sent. */
export function restockContactLinks(contact: { phone: string | null; email: string | null; slug: string }) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(contact.slug)) return { whatsapp: null, email: null };
  const productUrl = `${SITE_URL}/produto/${encodeURIComponent(contact.slug)}`;
  const message = `Olá! O produto que você pediu para acompanhar na Wimifarma está disponível para consulta. Confira o preço e o estoque atual: ${productUrl}\nEste aviso não reserva estoque. Você pode gerenciar seus avisos em ${SITE_URL}/minha-conta#avisos.`;
  const phone = contact.phone?.replace(/[ ()+-]/g, "") ?? "";
  const email = contact.email?.trim() ?? "";
  return {
    whatsapp: /^55\d{10,11}$/.test(phone) ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null,
    email: /^[^\s@?&#%<>]+@[^\s@?&#%<>]+\.[^\s@?&#%<>]+$/.test(email) && email.length <= 254
      ? `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}\u003fsubject=${encodeURIComponent("Seu aviso de disponibilidade — Wimifarma")}&body=${encodeURIComponent(message)}`
      : null,
  };
}
