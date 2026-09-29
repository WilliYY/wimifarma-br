import { shippingQuotePayloadSchema } from "@/features/shipping/schema";

export function OrderShippingSummary({ quote }: { quote: unknown }) {
  const parsed = shippingQuotePayloadSchema.safeParse(quote);
  if (!parsed.success) return null;
  const shipping = parsed.data;
  return <div className="border-b border-line bg-sky-50 px-5 py-4 text-sm text-sky-950"><strong>Melhor Envio · {shipping.carrier} · {shipping.service}</strong><p className="mt-1">Frete incluído: {(shipping.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · até {shipping.deliveryDays} dias úteis estimados, incluindo preparação.</p><p className="mt-2 text-xs leading-5">Esta é a cotação escolhida pelo cliente. Confira pagamento, nota fiscal, embalagem e dados do destinatário antes de comprar a etiqueta no Melhor Envio. A cotação não representa uma etiqueta comprada.</p><a className="mt-2 inline-block font-bold underline" href="https://melhorenvio.com.br/painel" rel="noreferrer" target="_blank">Preparar envio no Melhor Envio</a></div>;
}
