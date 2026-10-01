import { createRoot } from "react-dom/client";
import { useState } from "react";
import { ProductShippingFields } from "../../src/components/admin/product-shipping-fields";
import type { ShippingReference } from "../../src/features/shipping/product-reference";

// Deliberately synthetic; this preview has no backend, provider or customer data.
const reference: ShippingReference = { productName: "Fralda sintética M 40 unidades", packageLevel: "retail_unit", weightGrams: 800, widthCm: 20, heightCm: 30, lengthCm: 15, weightSource: { title: "Fonte sintética de QA", url: "https://example.com/peso", evidence: "Peso bruto sintético: 800 g com embalagem comercial." }, dimensionsSource: { title: "Fonte sintética de QA", url: "https://example.com/medidas", evidence: "Dimensões sintéticas: comprimento 15 cm, largura 20 cm, altura 30 cm." }, warnings: ["Confira o volume pronto para envio, incluindo a proteção adicional."], researchedAt: "2026-10-01T00:00:00.000Z" };
function Preview() {
  const [identity, setIdentity] = useState(reference.productName);
  const [suggestion, setSuggestion] = useState<ShippingReference | null>(null);
  const [admin, setAdmin] = useState(true);
  const [result, setResult] = useState("");
  return <main className="mx-auto max-w-3xl space-y-4 p-4"><h1 className="text-xl font-black">QA isolado · embalagem sintética</h1><p className="text-sm">Nenhum pedido, produto ou chamada de IA é gravado nesta página.</p><label className="grid gap-2 text-sm">Identidade do produto<input className="h-11 rounded border px-3" value={identity} onChange={e => { setIdentity(e.target.value); setSuggestion(null); }} /></label><label className="flex gap-2"><input checked={admin} type="checkbox" onChange={e => setAdmin(e.target.checked)} />Administrador</label><form onSubmit={e => { e.preventDefault(); setResult(String(new FormData(e.currentTarget).get("shippingDraft") ?? "Sem alteração de frete")); }}><ProductShippingFields key={String(admin)} identityKey={identity} suggestion={suggestion} researched={Boolean(suggestion)} canEdit={admin} busy={false} onResearch={() => setSuggestion(reference)} medicine={/medicamento/i.test(identity)} /><button className="my-4 min-h-11 rounded bg-brand px-4 font-bold text-white" type="submit">Ver rascunho sintético</button></form><output className="block break-all text-xs" aria-label="Rascunho sintético">{result}</output></main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
