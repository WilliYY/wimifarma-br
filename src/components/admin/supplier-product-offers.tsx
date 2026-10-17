"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decimalToMinorUnits } from "@/features/supplier-planning/form";

type Offer = { id: string; supplier: string; unitCostCents: number; available: boolean; validUntil: string; allocationQuantity: number; reservedQuantity: number; committedQuantity: number };
export function SupplierProductOffers({ productId, ean }: { productId: string; ean: string }) {
  const [offers,setOffers] = useState<Offer[]>([]);
  const [supplier,setSupplier] = useState("ANB");
  const [code,setCode] = useState("");
  const [cost,setCost] = useState("");
  const [ceiling,setCeiling] = useState("");
  const [stock,setStock] = useState("");
  const [available,setAvailable] = useState(false);
  const [replenish,setReplenish] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  useEffect(()=>{ let live=true; void fetch(`/api/admin/fornecedores/ofertas?productId=${encodeURIComponent(productId)}`,{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error();const data=await r.json();if(live)setOffers(data.data);}).catch(()=>{if(live)setMessage("Não foi possível consultar as ofertas. Tente reabrir o produto.");}); return()=>{live=false;}; },[productId]);
  async function save() {
    setBusy(true);setMessage("");
    try {
      const unitCostCents=decimalToMinorUnits(cost);
      const retailCeilingCents=ceiling.trim()?decimalToMinorUnits(ceiling):null;
      if(unitCostCents===null || unitCostCents<1 || (ceiling.trim()&&(retailCeilingCents===null||retailCeilingCents<1)) || !code.trim() || (stock.trim() && !/^\d+$/.test(stock.trim()))) throw new Error("Confira custo, teto de venda, código e saldo inteiro (ou deixe o saldo desconhecido).");
      const now=new Date();
      const response=await fetch("/api/admin/fornecedores/ofertas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,supplier,externalCode:code,eanNormalized:ean,unitCostCents,retailCeilingCents,available,stockQuantity:stock.trim()?Number(stock):null,allocationQuantity:5,replenishAllocation:replenish,observedAt:new Date(now.getTime()-1000).toISOString(),validUntil:new Date(now.getTime()+24*60*60_000-1000).toISOString()})});
      const payload=await response.json();if(!response.ok)throw new Error(typeof payload.error==="string"?payload.error:"Não foi possível salvar a oferta.");
      setOffers(current=>[...current.filter(row=>row.supplier!==supplier),payload.data]);setMessage("Conferência salva. O site passa a usar a oferta válida mais barata; estoque próprio preservado.");
    } catch(error){setMessage(error instanceof Error?error.message:"Falha ao salvar a oferta.");}finally{setBusy(false);}
  }
  return <div className="min-w-0 space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
    <div><h3 className="font-bold text-ink">Ofertas do distribuidor</h3><p className="mt-1 text-xs font-normal leading-5 text-muted">Conferência manual válida por até 24 horas. Limite operacional do piloto: cinco unidades por oferta, descontando pedidos reservados e pagos. Esse limite não é o saldo real do fornecedor e não é reposto automaticamente.</p></div>
    <div className="space-y-2">{offers.map(offer=><div key={offer.id} className="rounded-lg bg-white p-3 text-xs font-normal leading-5"><strong>{offer.supplier}</strong> · custo {(offer.unitCostCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} · {offer.available&&Date.parse(offer.validUntil)>Date.now()?"conferida":"indisponível ou vencida"}<br />Reservado: {offer.reservedQuantity} · vendido: {offer.committedQuantity} · validade: {new Date(offer.validUntil).toLocaleString("pt-BR")}</div>)}</div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs">Distribuidor<select className="h-11 rounded-md border border-line bg-white px-3" value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="ANB">ANB</option><option value="SANTA_CRUZ">SantaCruz</option><option value="PROFARMA">Profarma</option></select></label>
      <label className="grid gap-1 text-xs">Código no fornecedor<Input value={code} onChange={e=>setCode(e.target.value)} /></label>
      <label className="grid gap-1 text-xs">Custo final por unidade (R$)<Input inputMode="decimal" value={cost} onChange={e=>setCost(e.target.value)} /></label>
      <label className="grid gap-1 text-xs">Teto de venda conferido na CMED (R$)<Input inputMode="decimal" value={ceiling} onChange={e=>setCeiling(e.target.value)} /><span className="font-normal text-muted">Obrigatório para receita. Confira apresentação e UF/ICMS; considere todos os destinos atendidos.</span></label>
      <label className="grid gap-1 text-xs">Saldo real, se informado<Input inputMode="numeric" placeholder="Desconhecido" value={stock} onChange={e=>setStock(e.target.value)} /></label>
    </div>
    <label className="flex gap-2 text-sm font-normal"><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)} />Conferi agora: o fornecedor permite comprar esta apresentação.</label>
    <label className="flex gap-2 text-sm font-normal"><input type="checkbox" checked={replenish} onChange={e=>setReplenish(e.target.checked)} />Renovar a cota de cinco unidades para novos pedidos após esta conferência. Reservas pendentes continuam descontadas.</label>
    <Button type="button" onClick={()=>void save()} disabled={busy}>{busy?"Salvando…":"Salvar conferência da oferta"}</Button>
    <p role="status" className="text-xs font-normal leading-5 text-ink">{message}</p>
  </div>;
}
