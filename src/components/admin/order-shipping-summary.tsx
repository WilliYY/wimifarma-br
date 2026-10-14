import { shippingQuotePayloadSchema } from "@/features/shipping/schema";
import { orderPostingLocation } from "@/features/shipping/posting";

export function OrderShippingSummary({ quote }: { quote: unknown }) {
  const parsed = shippingQuotePayloadSchema.safeParse(quote);
  if (!parsed.success) return null;
  const shipping = parsed.data;
  const location = orderPostingLocation(quote);
  return <section aria-label="Postagem do pedido" className={`border-b border-line px-5 py-4 text-sm sm:px-7 ${location && !location.requiresTravel ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}>
    <p className="text-xs font-black uppercase">Local de postagem</p>
    <p className="mt-1 break-words text-base font-black">{location ? location.requiresTravel ? `Levar para ${location.city}/${location.state}` : `Postagem em ${location.city}/${location.state}` : "Local de postagem: confirmação pendente"}</p>
    {location?.pointName && <p className="mt-1 break-words font-semibold">Ponto: {location.pointName}</p>}
    <p className="mt-1 text-xs leading-5">{location ? location.requiresTravel ? "Exige deslocamento para outra cidade. Organize a viagem antes da postagem." : "Postagem na cidade de origem da farmácia." : "Este pedido não tem local registrado. Confirme o ponto e a cidade antes de organizar a postagem."}</p>
    <p className="mt-3 font-bold">Melhor Envio · {shipping.carrier} · {shipping.service}</p><p className="mt-1">Frete incluído: {(shipping.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · até {shipping.deliveryDays} dias úteis estimados, incluindo preparação.</p><p className="mt-2 text-xs leading-5">Esta é a cotação escolhida pelo cliente. Confira pagamento, nota fiscal, embalagem e dados do destinatário antes de comprar a etiqueta no Melhor Envio. A cotação não representa uma etiqueta comprada.</p><a className="mt-2 inline-block font-bold underline" href="https://melhorenvio.com.br/painel" rel="noreferrer" target="_blank">Preparar envio no Melhor Envio</a>
  </section>;
}
