"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownToLine, Calculator, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decimalToMinorUnits, quantityFromText } from "@/features/supplier-planning/form";
import { compareSupplierOffers, priceWithMarkup, simulateOrder } from "@/features/supplier-planning/planning";
import { SupplierOfferSchema, type SupplierOffer } from "@/features/supplier-planning/schema";

const suppliers = ["ANB", "SANTA_CRUZ", "PROFARMA", "GAM", "DM"] as const;
const names = { ANB: "ANB", SANTA_CRUZ: "SantaCruz", PROFARMA: "Profarma", GAM: "GAM", DM: "DM Paraná" };
const money = (value: number | null) => value === null ? "Pendente" : (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const section = "rounded-xl border border-line bg-white p-4 shadow-sm sm:p-6";
const select = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus:outline-brand";
const initialOffer = () => ({ cost: "", inbound: "0", availability: "UNKNOWN", stock: "", checked: "", validity: "15" });
const initialSimulation = {
  cost: "", markup: "60", quantity: "1", sale: "", inbound: "0", packaging: "", carrier: "", tax: "", fee: "", fixed: "", other: "",
  cashback: "2", coins: "2", wallet: "0", currentThreshold: "99,90", currentPix: "0", proposedThreshold: "99", proposedPix: "3", pmc: "", uf: "",
};
type SimulationField = keyof typeof initialSimulation;
type Comparison = ReturnType<typeof compareSupplierOffers>;
type Simulation = ReturnType<typeof simulateOrder>;
const missingLabels: Record<string, string> = { packagingCents: "embalagem", carrierFreightCents: "transportadora", taxBps: "tributos", paymentFeeBps: "taxa percentual", paymentFixedCents: "taxa fixa", otherVariableCents: "outros custos", pmcCeilingCents: "PMC" };

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>{children}</div>;
}

function Result({ title, result }: { title: string; result: Simulation }) {
  const rows: [string, number | null][] = [
    ["Produtos antes dos descontos", result.grossProductsCents], ["Resgate de saldos existentes", result.grossProductsCents - result.pixDiscountCents - result.netProductsCents], ["Desconto Pix", result.pixDiscountCents],
    ["Produtos após descontos", result.netProductsCents], ["Aquisição", result.acquisitionCents], ["Entrada por pedido", result.inboundFreightCents],
    ["Embalagem", result.packagingCents], ["Tributos sobre produtos líquidos", result.taxCents], ["Taxas sobre total cobrado", result.paymentFeeCents],
    ["Cashback futuro", result.cashbackCents], ["WimiCoins futuros (equivalente em R$)", result.wimicoinsCents], ["Outros custos", result.otherVariableCents],
  ];
  return <article className="min-w-0 rounded-xl border border-line bg-white p-5">
    <h3 className="text-lg font-bold text-ink">{title}</h3>
    <dl className="mt-4 space-y-3 text-sm">
      {([["Receita total cobrada", result.collectedCents], ["Frete pago pelo cliente", result.customerFreightCents], ["Custo real da transportadora", result.carrierFreightCents]] as [string, number | null][]).map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-semibold tabular-nums">{money(value)}</dd></div>)}
    </dl>
    <div className="mt-5 rounded-lg bg-brand-soft p-4"><p className="text-sm text-brand">Contribuição estimada do pedido</p><p className="mt-1 text-2xl font-bold tabular-nums text-ink">{money(result.contributionCents)}</p><p className="mt-1 text-xs text-muted">Após os custos informados; despesas fixas não incluídas.</p></div>
    {result.missing.length > 0 && <p className="mt-3 text-sm text-amber-800">Preencha: {result.missing.map(key => missingLabels[key] ?? key).join(", ")}.</p>}
    {result.warnings.map(warning => <p key={warning} className="mt-3 text-sm font-semibold text-red-700">{warning} Recomendação de preço bloqueada.</p>)}
    <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-brand">Ver composição de custos e benefícios</summary><dl className="mt-3 space-y-2">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-muted">{label}</dt><dd className="tabular-nums">{money(value)}</dd></div>)}</dl></details>
  </article>;
}

export function SupplierPlanningPanel() {
  const [ean, setEan] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [offers, setOffers] = useState(() => suppliers.map(initialOffer));
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [comparisonError, setComparisonError] = useState("");
  const [form, setForm] = useState(initialSimulation);
  const [prescription, setPrescription] = useState(false);
  const [popular, setPopular] = useState(false);
  const [pmcRequired, setPmcRequired] = useState(false);
  const [beforePix, setBeforePix] = useState(false);
  const [results, setResults] = useState<{ current: Simulation; proposed: Simulation } | null>(null);
  const [simulationError, setSimulationError] = useState("");
  function invalidateComparison() { setComparison(null); setExcluded([]); setComparisonError(""); }
  function updateOffer(index: number, key: keyof ReturnType<typeof initialOffer>, value: string) {
    setOffers(previous => previous.map((offer, position) => position === index ? { ...offer, [key]: value } : offer)); invalidateComparison();
  }
  function updateForm(key: SimulationField, value: string) { setForm(previous => ({ ...previous, [key]: value })); setResults(null); setSimulationError(""); }
  function compare() {
    invalidateComparison();
    try {
      const count = quantityFromText(quantity);
      const valid: SupplierOffer[] = [];
      const exclusions: string[] = [];
      offers.forEach((offer, index) => {
        try {
          if (!offer.cost.trim()) throw new Error("Preço não informado.");
          if (!offer.checked) throw new Error("Conferência manual e horário não informados.");
          const minutes = quantityFromText(offer.validity);
          if (minutes > 1440) throw new Error("Validade deve ser de 1 a 1.440 minutos.");
          if (offer.stock.trim() && !/^\d+$/.test(offer.stock.trim())) throw new Error("Saldo deve ser um inteiro não negativo.");
          const checked = new Date(offer.checked);
          valid.push(SupplierOfferSchema.parse({ supplier: suppliers[index], ean, unitCostCents: decimalToMinorUnits(offer.cost), inboundUnitCostCents: decimalToMinorUnits(offer.inbound), availability: offer.availability, stockQuantity: offer.stock.trim() ? Number(offer.stock) : null, checkedAt: checked.toISOString(), validUntil: new Date(checked.getTime() + minutes * 60_000).toISOString() }));
        } catch (error) { exclusions.push(`${names[suppliers[index]]}: ${error instanceof Error && !("issues" in error) ? error.message : "Revise preço, entrada, saldo, EAN e conferência."}`); }
      });
      setComparison(compareSupplierOffers({ ean, quantity: count, offers: valid }, Date.now())); setExcluded(exclusions);
    } catch { setComparisonError("Informe EAN válido da mesma apresentação e quantidade inteira de 1 a 10.000."); }
  }
  function useBest() {
    if (!comparison) return;
    const fresh = compareSupplierOffers({ ean, quantity: quantityFromText(quantity), offers: comparison.options.map(option => option.offer) }, Date.now());
    setComparison(fresh);
    if (!fresh.best) { setComparisonError("A oferta não está mais válida. Confira novamente antes de usar o custo."); return; }
    setForm(previous => ({ ...previous, cost: (fresh.best!.unitCostCents / 100).toFixed(2), inbound: (fresh.best!.inboundUnitCostCents * Number(quantity) / 100).toFixed(2), quantity, sale: "" })); setResults(null);
  }
  function simulate() {
    setResults(null); setSimulationError("");
    try {
      const required = (key: SimulationField) => { const value = decimalToMinorUnits(form[key]); if (value === null) throw new Error("Preencha os campos obrigatórios."); return value; };
      const unitCostCents = required("cost");
      const unitSaleCents = decimalToMinorUnits(form.sale) ?? priceWithMarkup(unitCostCents, required("markup"));
      const pmcCeilingCents = decimalToMinorUnits(form.pmc);
      if (pmcCeilingCents !== null && !form.uf) throw new Error("Selecione a UF do PMC e confira a apresentação e alíquota.");
      const common = { unitCostCents, unitSaleCents, quantity: quantityFromText(form.quantity), inboundFreightCents: required("inbound"), packagingCents: decimalToMinorUnits(form.packaging), carrierFreightCents: decimalToMinorUnits(form.carrier), taxBps: decimalToMinorUnits(form.tax), paymentFeeBps: decimalToMinorUnits(form.fee), paymentFixedCents: decimalToMinorUnits(form.fixed), otherVariableCents: decimalToMinorUnits(form.other), cashbackBps: required("cashback"), wimicoinsBps: required("coins"), requiresPrescription: prescription, isPopularPharmacy: popular, walletDiscountCents: required("wallet"), freeShippingBeforePix: beforePix, pmcRequired, pmcCeilingCents };
      setResults({ current: simulateOrder({ ...common, pixDiscountBps: required("currentPix"), freeShippingThresholdCents: required("currentThreshold") }), proposed: simulateOrder({ ...common, pixDiscountBps: required("proposedPix"), freeShippingThresholdCents: required("proposedThreshold") }) });
    } catch (error) { setSimulationError(error instanceof Error && !("issues" in error) ? error.message : "Revise valores: custo e venda positivos; percentuais de 0 a 100; descontos inferiores ao total."); }
  }
  const input = (key: SimulationField, label: string, hint?: string) => <Field key={key} id={`simulation-${key}`} label={label}><Input id={`simulation-${key}`} inputMode="decimal" value={form[key]} onChange={event => updateForm(key, event.target.value)} placeholder={hint} /></Field>;
  return <div className="min-w-0 space-y-6">
    <div className="rounded-xl border border-brand/20 bg-brand-soft p-5"><p className="text-xs font-bold uppercase tracking-wider text-brand">Planejamento comercial · somente ADMIN</p><h2 className="mt-2 text-2xl font-bold text-ink">Compare o custo. Teste a contribuição.</h2><p className="mt-2 max-w-3xl text-sm text-muted">Dados desta sessão não são salvos nem publicam preços, estoque ou regras. Ofertas são manuais; não há consulta automática aos distribuidores. Gravação de configuração e automatização permanecem pendentes.</p></div>
    <section className={section} aria-labelledby="supplier-title">
      <h2 id="supplier-title" className="flex items-center gap-2 text-xl font-bold text-ink"><Scale className="size-5 text-brand" aria-hidden />Comparação por EAN</h2>
      <p className="mt-2 text-sm text-muted">Compare a mesma apresentação. Conferência não reserva mercadoria; preço, saldo e validade precisam de confirmação manual.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field id="offer-ean" label="EAN da apresentação"><Input id="offer-ean" inputMode="numeric" value={ean} onChange={event => { setEan(event.target.value.trim()); invalidateComparison(); }} /></Field><Field id="offer-quantity" label="Quantidade desejada"><Input id="offer-quantity" inputMode="numeric" value={quantity} onChange={event => { setQuantity(event.target.value); invalidateComparison(); }} /></Field></div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">{offers.map((offer, index) => <fieldset key={suppliers[index]} className="min-w-0 rounded-lg border border-line p-4"><legend className="px-2 font-bold text-ink">{names[suppliers[index]]} · manual</legend><div className="grid gap-3">
        {([ ["cost", "Custo por unidade (R$)"], ["inbound", "Entrada por unidade (R$)"], ["stock", "Saldo disponível (unidades)"] ] as const).map(([key, label]) => <Field key={key} id={`offer-${index}-${key}`} label={label}><Input id={`offer-${index}-${key}`} inputMode={key === "stock" ? "numeric" : "decimal"} value={offer[key]} onChange={event => updateOffer(index, key, event.target.value)} placeholder={key === "stock" ? "Desconhecido" : undefined} /></Field>)}
        <Field id={`offer-${index}-availability`} label="Disponibilidade"><select id={`offer-${index}-availability`} className={select} value={offer.availability} onChange={event => updateOffer(index, "availability", event.target.value)}><option value="UNKNOWN">Não conferida</option><option value="AVAILABLE">Disponível (conferida manualmente)</option><option value="UNAVAILABLE">Indisponível</option></select></Field>
        <Field id={`offer-${index}-checked`} label="Conferido manualmente em"><Input id={`offer-${index}-checked`} type="datetime-local" value={offer.checked} onChange={event => updateOffer(index, "checked", event.target.value)} /></Field>
        <Field id={`offer-${index}-validity`} label="Validade da conferência (minutos)"><Input id={`offer-${index}-validity`} type="number" min={1} max={1440} value={offer.validity} onChange={event => updateOffer(index, "validity", event.target.value)} /></Field>
      </div></fieldset>)}</div>
      <Button type="button" className="mt-5" onClick={compare}>Comparar ofertas manuais</Button>
      <div aria-live="polite" className="mt-4 space-y-2 text-sm">{comparisonError && <p role="alert" className="text-red-700">{comparisonError}</p>}{excluded.map(reason => <p key={reason} className="text-amber-800">{reason}</p>)}{comparison?.options.map(option => <div key={option.offer.supplier} className="rounded-lg bg-surface p-3"><p className="font-semibold">{names[option.offer.supplier]}: {money(option.totalCostCents)} no lote, com entrada</p><p className="mt-1 text-muted">{option.reasons.join(" ") || "Elegível nesta conferência; sem reserva de estoque."}</p></div>)}{comparison && <p className="font-semibold text-ink">{comparison.best ? `Menor custo elegível: ${names[comparison.best.supplier]}.` : "Nenhuma oferta elegível para a quantidade informada."}</p>}</div>
      {comparison?.best && <Button type="button" variant="secondary" className="mt-3 max-w-full whitespace-normal" onClick={useBest}><ArrowDownToLine className="size-4 shrink-0" aria-hidden />Usar custo na simulação</Button>}
    </section>
    <section className={section} aria-labelledby="simulation-title">
      <h2 id="simulation-title" className="flex items-center gap-2 text-xl font-bold text-ink"><Calculator className="size-5 text-brand" aria-hidden />Simulação por pedido</h2>
      <p className="mt-2 text-sm text-muted">Acréscimo de 60% e benefícios de 2% são cenários editáveis. Custos desconhecidos ficam vazios; informe zero somente quando confirmado. Entrada inicial zero conforme informado pelo lojista.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {input("cost", "Custo por unidade (R$)")}{input("markup", "Acréscimo sobre custo (%)")}{input("quantity", "Quantidade do pedido")}{input("sale", "Preço de venda por unidade (R$)", "Vazio: sugerir pelo acréscimo")}{input("inbound", "Entrada por pedido (R$)")}{input("packaging", "Embalagem por pedido (R$)", "Pendente")}{input("carrier", "Transportadora por pedido (R$)", "Pendente")}{input("tax", "Tributos sobre produtos líquidos (%)", "Pendente")}{input("fee", "Taxa do pagamento (%)", "Pendente")}{input("fixed", "Taxa fixa do pagamento (R$)", "Pendente")}{input("other", "Outros custos por pedido (R$)", "Pendente")}{input("cashback", "Cashback futuro (%)")}{input("coins", "WimiCoins futuros (%)")}{input("wallet", "Resgate de saldos existentes (R$)")}{input("pmc", "PMC unitário confirmado (R$)", "Pendente quando exigido")}
        <Field id="simulation-uf" label="UF de destino para o PMC"><select id="simulation-uf" className={select} value={form.uf} onChange={event => updateForm("uf", event.target.value)}><option value="">Selecione a UF</option>{"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ").map(uf => <option key={uf}>{uf}</option>)}</select></Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">{([{ label: "Produto exige receita", value: prescription, set: setPrescription }, { label: "Farmácia Popular", value: popular, set: setPopular }, { label: "Exigir conferência do PMC", value: pmcRequired, set: setPmcRequired }, { label: "Testar frete grátis antes do Pix", value: beforePix, set: setBeforePix }]).map(option => <label key={option.label} className="flex items-center gap-2"><input type="checkbox" checked={option.value} onChange={event => { option.set(event.target.checked); setResults(null); }} className="size-4 accent-brand" />{option.label}</label>)}</div>
      <p className="mt-3 text-xs text-muted">Receita/Farmácia Popular zeram novos benefícios. Frete grátis usa, por padrão, o total após resgates e Pix. PMC exige conferência humana da apresentação, UF e ICMS; base tributária simplificada, a validar com contador.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><fieldset className="rounded-lg border border-line p-4"><legend className="px-2 font-semibold">Cenário atual</legend><div className="grid gap-4 sm:grid-cols-2">{input("currentThreshold", "Frete grátis a partir de (R$)")}{input("currentPix", "Desconto Pix (%)")}</div></fieldset><fieldset className="rounded-lg border border-brand/30 p-4"><legend className="px-2 font-semibold text-brand">Proposta em estudo</legend><div className="grid gap-4 sm:grid-cols-2">{input("proposedThreshold", "Frete grátis proposto (R$)")}{input("proposedPix", "Desconto Pix proposto (%)")}</div></fieldset></div>
      <Button type="button" className="mt-5" onClick={simulate}>Calcular cenários</Button>
      <div aria-live="polite">{simulationError && <p role="alert" className="mt-3 text-sm text-red-700">{simulationError}</p>}{results && <div className="mt-5 grid gap-4 lg:grid-cols-2"><Result title="Cenário atual informado" result={results.current} /><Result title="Proposta em estudo" result={results.proposed} /></div>}</div>
    </section>
  </div>;
}
