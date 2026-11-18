"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decimalToMinorUnits } from "@/features/supplier-planning/form";
import { normalizeGtin } from "@/features/products/gtin";
import { formatCurrency } from "@/lib/utils";

type Offer = { id: string; supplier: string; externalCode: string; eanNormalized: string; unitCostCents: number; substitutionTaxCents: number | null; retailCeilingCents: number | null; stockQuantity: number | null; available: boolean; observedAt: string; validUntil: string; allocationQuantity: number; reservedQuantity: number; committedQuantity: number };
export function supplierOfferLabel(supplier: string): string {
  return supplier === "DM" ? "DM Paraná" : supplier === "GAM" ? "GAM / eGAM" : supplier;
}
export function SupplierProductOffers({ productId, ean, isMedicine, selectedSupplier, onSaved }: { productId: string; ean: string; isMedicine: boolean; selectedSupplier?: string; onSaved?: () => Promise<void> }) {
  const [offers,setOffers] = useState<Offer[]>([]);
  const [loading,setLoading] = useState(true);
  const [readError,setReadError] = useState("");
  const [supplier,setSupplier] = useState("ANB");
  const [code,setCode] = useState("");
  const [cost,setCost] = useState("");
  const [substitutionTax,setSubstitutionTax] = useState("");
  const [ceiling,setCeiling] = useState("");
  const [stock,setStock] = useState("");
  const [available,setAvailable] = useState(false);
  const [replenish,setReplenish] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  useEffect(()=>{ let live=true; setLoading(true);setReadError("");setOffers([]);void fetch(`/api/admin/fornecedores/ofertas?productId=${encodeURIComponent(productId)}`,{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error();const data=await r.json();if(!Array.isArray(data.data))throw new Error();if(live)setOffers(data.data);}).catch(()=>{if(live)setReadError("Não foi possível consultar as ofertas. Feche e reabra a comparação para tentar novamente.");}).finally(()=>{if(live)setLoading(false);}); return()=>{live=false;}; },[productId]);
  function matchesProduct(offer: Offer) {
    const productGtin = normalizeGtin(ean);
    return productGtin !== null && normalizeGtin(offer.eanNormalized) === productGtin;
  }
  function changeSupplier(value: string) {
    if (busy || value === supplier) return;
    setSupplier(value);setCode("");setCost("");setSubstitutionTax("");setCeiling("");setStock("");setAvailable(false);setReplenish(false);
    setMessage("Distribuidor alterado. Os dados da proposta anterior foram limpos. Informe e confira código, custo, ST, teto, saldo e disponibilidade desta distribuidora antes de salvar.");
  }
  function reviewOffer(offer: Offer) {
    if (busy) return;
    if (!matchesProduct(offer)) {
      setMessage("Apresentação incompatível: o EAN da oferta é inválido ou diferente do produto. Os dados não foram carregados para revisão.");
      return;
    }
    setSupplier(offer.supplier);setCode(offer.externalCode);setCost((offer.unitCostCents/100).toFixed(2));
    setCeiling(offer.retailCeilingCents == null ? "" : (offer.retailCeilingCents/100).toFixed(2));
    setStock(offer.stockQuantity == null ? "" : String(offer.stockQuantity));
    setSubstitutionTax("");setAvailable(false);setReplenish(false);
    setMessage(`Oferta ${supplierOfferLabel(offer.supplier)} carregada para revisão. Confira código, custo, teto e saldo antes de salvar. Confira novamente a ST e a disponibilidade; salvar sem marcar disponibilidade registra a oferta como indisponível.`);
  }
  const sortedOffers = [...offers].sort((a,b)=>Number(b.supplier===selectedSupplier)-Number(a.supplier===selectedSupplier)||a.unitCostCents-b.unitCostCents||a.supplier.localeCompare(b.supplier));
  async function save() {
    setBusy(true);setMessage("");
    try {
      const unitCostCents=decimalToMinorUnits(cost);
      const substitutionTaxCents=supplier==="PROFARMA"?decimalToMinorUnits(substitutionTax):null;
      const retailCeilingCents=ceiling.trim()?decimalToMinorUnits(ceiling):null;
      if(unitCostCents===null || unitCostCents<1 || (ceiling.trim()&&(retailCeilingCents===null||retailCeilingCents<1)) || !code.trim() || (stock.trim() && !/^\d+$/.test(stock.trim()))) throw new Error("Confira custo, teto de venda, código e saldo inteiro (ou deixe o saldo desconhecido).");
      const now=new Date();
      const response=await fetch("/api/admin/fornecedores/ofertas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,supplier,externalCode:code,eanNormalized:ean,unitCostCents,substitutionTaxCents,retailCeilingCents,available,stockQuantity:stock.trim()?Number(stock):null,allocationQuantity:5,replenishAllocation:replenish,observedAt:new Date(now.getTime()-1000).toISOString(),validUntil:new Date(now.getTime()+24*60*60_000-1000).toISOString()})});
      const payload=await response.json();if(!response.ok)throw new Error(typeof payload.error==="string"?payload.error:"Não foi possível salvar a oferta.");
      setOffers(current=>[...current.filter(row=>row.supplier!==supplier),payload.data]);setSubstitutionTax("");setAvailable(false);setReplenish(false);
      const savedMessage = isMedicine&&supplier==="PROFARMA"&&substitutionTaxCents===null?"Conferência salva. Sem cálculo de ST: esta oferta de medicamento Profarma fica fora da comparação até nova conferência com o valor de ST.":!available?"Conferência salva como indisponível.":"Conferência salva. O servidor resolve a oferta elegível usada na venda; estoque próprio preservado.";
      setMessage(savedMessage);
      if(onSaved) {
        try { await onSaved(); } catch { setMessage(`${savedMessage} A oferta foi salva, mas não foi possível atualizar o catálogo. Recarregue a página para conferir o custo e a venda atuais.`); }
      }
    } catch(error){setMessage(error instanceof Error?error.message:"Falha ao salvar a oferta.");}finally{setBusy(false);}
  }
  return <div className="min-w-0 space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
    <div><h3 className="font-bold text-ink">Ofertas das distribuidoras</h3><p className="mt-1 text-xs font-normal leading-5 text-muted">Compare os cadastros por fornecedor e custo. Confira a oferta marcada como Usada na venda. Custos menores podem estar indisponíveis ou com conferência pendente. Conferência manual de até 24 horas; a continuidade pode usar conferência vencida elegível, sem renovar suas datas. A cota histórica de cinco unidades não representa saldo real e não é reposta automaticamente.</p></div>
    <div className="space-y-2">
      {loading && <p role="status" className="text-sm text-muted">Consultando ofertas…</p>}
      {readError && <p role="alert" className="text-sm text-red-700">{readError}</p>}
      {!loading && !readError && offers.length===0 && <p className="text-sm text-muted">Nenhuma oferta cadastrada para este produto. Preencha os dados conferidos abaixo.</p>}
      {sortedOffers.map(offer=><div key={offer.id} className="rounded-lg border border-line bg-white p-3 text-xs font-normal leading-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong>{supplierOfferLabel(offer.supplier)} · custo final {formatCurrency(offer.unitCostCents/100)}</strong>{offer.supplier===selectedSupplier && <span className="rounded-md bg-brand/10 px-2 py-1 font-bold text-brand">Usada na venda</span>}</div>
        <p>{offer.available?"Disponibilidade informada":"Indisponível"} · {Date.parse(offer.validUntil)>Date.now()?"Conferência vigente":"Conferência vencida"}{offer.stockQuantity===0?" · saldo zero":null}</p>
        <p>EAN da oferta: {offer.eanNormalized || "não informado"}</p>
        {!matchesProduct(offer) && <p className="font-semibold text-red-700">Apresentação incompatível: EAN inválido ou diferente do produto. Revisão desta oferta bloqueada.</p>}
        {isMedicine&&offer.supplier==="PROFARMA"&&offer.substitutionTaxCents==null&&<p className="font-semibold text-amber-800">Sem cálculo de ST · fora da comparação de ofertas.</p>}
        <p>Código: {offer.externalCode} · saldo real: {offer.stockQuantity == null ? "desconhecido" : offer.stockQuantity} · teto de venda: {offer.retailCeilingCents == null ? "não informado" : formatCurrency(offer.retailCeilingCents/100)}</p>
        <p>Cota histórica: {offer.allocationQuantity} · reservado: {offer.reservedQuantity} · vendido: {offer.committedQuantity} · validade: {new Date(offer.validUntil).toLocaleString("pt-BR")}</p>
        <Button className="mt-2" type="button" size="sm" variant="secondary" disabled={busy || !matchesProduct(offer)} aria-label={`Revisar oferta ${supplierOfferLabel(offer.supplier)}`} onClick={()=>reviewOffer(offer)}>Revisar oferta</Button>
      </div>)}
    </div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs">Distribuidor<select className="h-11 rounded-md border border-line bg-white px-3" value={supplier} disabled={busy} onChange={e=>changeSupplier(e.target.value)}><option value="ANB">ANB</option><option value="PROFARMA">Profarma</option><option value="DM">DM Paraná</option><option value="GAM">GAM / eGAM</option></select></label>
      <label className="grid gap-1 text-xs">Código no fornecedor<Input value={code} onChange={e=>setCode(e.target.value)} /></label>
      <label className="grid gap-1 text-xs">Custo final por unidade (R$)<Input inputMode="decimal" value={cost} onChange={e=>setCost(e.target.value)} /><span className="font-normal text-muted">Informe o custo final já incluindo ST. O valor de ST não será somado novamente.</span></label>
      {supplier==="PROFARMA"&&<label className="grid gap-1 text-xs">ST por unidade conferida na Profarma (R$)<Input inputMode="decimal" placeholder="Sem cálculo de ST" value={substitutionTax} onChange={e=>setSubstitutionTax(e.target.value)} /><span className="font-normal text-muted">Opcional para salvar a pendência. Informe 0 somente se o portal mostrar zero explícito; traço ou campo ausente ficam em branco.{isMedicine?" Medicamento sem cálculo de ST fica fora da comparação de ofertas.":" A ausência de ST não impede a comparação deste produto."} Confira novamente a ST a cada conferência.</span></label>}
      <label className="grid gap-1 text-xs">Teto de venda conferido na CMED (R$)<Input inputMode="decimal" value={ceiling} onChange={e=>setCeiling(e.target.value)} /><span className="font-normal text-muted">Obrigatório para receita. Confira apresentação e UF/ICMS; considere todos os destinos atendidos.</span></label>
      <label className="grid gap-1 text-xs">Saldo real, se informado<Input inputMode="numeric" placeholder="Desconhecido" value={stock} onChange={e=>setStock(e.target.value)} /></label>
    </div>
    <label className="flex gap-2 text-sm font-normal"><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)} />Conferi agora: o fornecedor permite comprar esta apresentação.</label>
    <p className="text-xs font-normal leading-5 text-muted">Revise os dados antes de salvar. Salvar sem marcar a disponibilidade registra a oferta como indisponível. A ST exige nova conferência.</p>
    <label className="flex gap-2 text-sm font-normal"><input type="checkbox" checked={replenish} onChange={e=>setReplenish(e.target.checked)} />Renovar a cota histórica de cinco unidades após esta conferência. Reservas pendentes continuam descontadas.</label>
    <Button type="button" onClick={()=>void save()} disabled={busy}>{busy?"Salvando…":"Salvar conferência da oferta"}</Button>
    <p role="status" className="text-xs font-normal leading-5 text-ink">{message}</p>
  </div>;
}
