import { createRoot } from "react-dom/client";
import { useRef, useState } from "react";
import { ProductShippingFields, type ProductShippingFieldsHandle } from "../../src/components/admin/product-shipping-fields";
import type { ShippingReference } from "../../src/features/shipping/product-reference";

// Deliberately synthetic; this preview has no backend, provider or customer data.
const reference: ShippingReference = { productName: "Fralda sintética M 40 unidades", packageLevel: "retail_unit", weightGrams: 800, widthCm: 20, heightCm: 30, lengthCm: 15, weightSource: { title: "Fonte sintética de QA", url: "https://example.com/peso", evidence: "Peso bruto sintético: 800 g com embalagem comercial." }, dimensionsSource: { title: "Fonte sintética de QA", url: "https://example.com/medidas", evidence: "Dimensões sintéticas: comprimento 15 cm, largura 20 cm, altura 30 cm." }, warnings: ["Confira o volume pronto para envio, incluindo a proteção adicional."], researchedAt: "2026-10-01T00:00:00.000Z" };
const estimatedReference: ShippingReference = { ...reference, weightGrams: null, widthCm: null, heightCm: null, lengthCm: null, weightSource: null, dimensionsSource: null, estimate: {
  comparableName: "Fralda comparável sintética M 40 unidades", packageDescription: "Pacote fechado flexível da mesma contagem e tamanho.", confidence: "low",
  source: { title: "Comparável sintético de QA", url: "https://example.com/comparavel", evidence: "Fralda comparável sintética M 40 unidades: peso bruto 800 g, comprimento 15 cm, largura 20 cm, altura 30 cm." },
  assumptions: ["Mesma apresentação e material; margem de 20% em cada eixo e peso.", "Caixa adicional e proteção da farmácia ainda precisam ser conferidas."],
  weightGrams: { min: 640, max: 960 }, lengthCm: { min: 12, max: 18 }, widthCm: { min: 16, max: 24 }, heightCm: { min: 24, max: 36 },
} };
function Preview() {
  const shippingFieldsRef = useRef<ProductShippingFieldsHandle>(null);
  const [identity, setIdentity] = useState(reference.productName);
  const [suggestion, setSuggestion] = useState<ShippingReference | null>(null);
  const [admin, setAdmin] = useState(true);
  const [estimated, setEstimated] = useState(false);
  const [result, setResult] = useState("");
  return <main className="mx-auto max-w-3xl space-y-4 p-4"><h1 className="text-xl font-black">QA isolado · embalagem sintética</h1><p className="text-sm">Nenhum pedido, produto ou chamada de IA é gravado nesta página.</p><label className="grid gap-2 text-sm">Identidade do produto<input className="h-11 rounded border px-3" value={identity} onChange={e => { setIdentity(e.target.value); setSuggestion(null); }} /></label><label className="flex gap-2"><input checked={admin} type="checkbox" onChange={e => setAdmin(e.target.checked)} />Administrador</label><label className="flex gap-2"><input checked={estimated} type="checkbox" onChange={e => { setEstimated(e.target.checked); setSuggestion(null); }} />Simular estimativa por comparação</label><button className="min-h-11 rounded border border-line px-4 font-bold" type="button" onClick={() => { const nextReference = estimated ? estimatedReference : reference; setSuggestion(nextReference); shippingFieldsRef.current?.applySuggestion(nextReference, identity); }}>Pesquisar e aplicar referência sintética</button><form onSubmit={e => { e.preventDefault(); setResult(String(new FormData(e.currentTarget).get("shippingDraft") ?? "Sem alteração de frete")); }}><ProductShippingFields key={String(admin)} ref={shippingFieldsRef} identityKey={identity} suggestion={suggestion} researched={Boolean(suggestion)} canEdit={admin} medicine={/medicamento/i.test(identity)} /><button className="my-4 min-h-11 rounded bg-brand px-4 font-bold text-white" type="submit">Ver rascunho sintético</button></form><output className="block break-all text-xs" aria-label="Rascunho sintético">{result}</output></main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
