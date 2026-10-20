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
    <p className="mt-3 font-bold">Melhor Envio · {shipping.carrier} · {shipping.service}</p><p className="mt-1">Frete incluído: {(shipping.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · até {shipping.deliveryDays} dias úteis estimados, incluindo preparação.</p>
    {shipping.packaging && <div className="mt-3 rounded-lg border border-current/20 p-3" aria-label="Embalagem prevista na cotação">
      <p className="text-xs font-black">Embalagem prevista na cotação · {shipping.packaging.packages.length} pacote(s)</p>
      <ul className="mt-2 space-y-1 text-xs leading-5">{shipping.packaging.packages.map((pack, index) => <li key={index}>Pacote {index + 1}: {pack.lengthCm.toLocaleString("pt-BR")} × {pack.widthCm.toLocaleString("pt-BR")} × {pack.heightCm.toLocaleString("pt-BR")} cm (C × L × A) · {pack.weightGrams.toLocaleString("pt-BR")} g · {pack.items.reduce((sum, item) => sum + item.quantity, 0)} unidade(s)</li>)}</ul>
      {shipping.packaging.calculationMethod === "provider-conservative-envelope" && <p className="mt-2 text-xs font-bold leading-5">Usado espaço conservador por unidade após inconsistência no primeiro empacotamento. O cálculo pode reservar mais espaço que a embalagem física.</p>}
      <p className="mt-2 text-xs leading-5">{shipping.packaging.inputMeasurementBasis === "estimated" ? "Os pesos e medidas de origem são estimados. " : ""}O empacotamento do Melhor Envio é uma previsão. Pese e meça a caixa externa pronta, incluindo proteção. Se houver diferença, recalcule antes de emitir a etiqueta. Mais de um pacote pode exigir etiquetas separadas.</p>
    </div>}
    <p className="mt-2 text-xs leading-5">Esta é a cotação escolhida pelo cliente. Confira pagamento, nota fiscal, embalagem e dados do destinatário antes de comprar a etiqueta no Melhor Envio. A cotação não representa uma etiqueta comprada.</p><a className="mt-2 inline-block font-bold underline" href="https://melhorenvio.com.br/painel" rel="noreferrer" target="_blank">Preparar envio no Melhor Envio</a>
  </section>;
}
