"use client";
import { useState } from "react";
import { Copy, Download, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { campaignUrl, marketingIssues, type MarketingProduct } from "@/features/products/marketing";
import { buildProductMetaDescription } from "@/features/products/product-detail";
import { formatCurrency } from "@/lib/utils";

export function ProductMarketingTools({ product }: { product: MarketingProduct }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"whatsapp" | "instagram" | "google">("whatsapp");
  const [campaign, setCampaign] = useState("catalogo");
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const url = campaignUrl(product.slug, source, campaign);
  const issues = marketingIssues(product);
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); setMessage("Copiado. Confira antes de publicar."); } catch { setMessage("Não foi possível copiar. Selecione o texto manualmente."); } };
  async function download() {
    setDownloading(true); setMessage("");
    try {
      const response = await fetch("/api/admin/marketing/google-feed");
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.error || "Falha na exportação."); }
      const href = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = href; anchor.download = "wimifarma-google-revisao.xml"; anchor.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
      setMessage(`Exportados ${response.headers.get("X-Feed-Included")} produtos; ${response.headers.get("X-Feed-Excluded")} precisam de revisão ou não entram nesta exportação.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na exportação."); } finally { setDownloading(false); }
  }
  const text = `${product.name}\n${product.description || "Confira os detalhes na Wimifarma."}\n${product.requiresPrescription || product.isPopularPharmacy ? "Consulte a equipe sobre disponibilidade e atendimento." : `${formatCurrency(Number(product.promotionalPrice ?? product.price))} · Disponibilidade sujeita à confirmação.`}\n${url}`;
  return <><Button onClick={() => setOpen(true)} size="sm" type="button" variant="secondary"><Megaphone className="h-4 w-4" />SEO e marketing</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Seu produto no Google</DialogTitle><DialogDescription>Ao publicar, esta página entra automaticamente no catálogo e no sitemap. Compartilhar links é opcional e não é necessário para o Google encontrar o produto.</DialogDescription></DialogHeader>
      <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{product.status === "ACTIVE" ? "Página publicada e disponível para descoberta. A indexação e a posição dependem do Google." : "Publique o produto para liberar sua página e incluí-la automaticamente no sitemap."}</p>
      <div className="min-w-0 space-y-5"><div className="rounded-lg border border-line p-4"><p className="text-lg font-bold text-brand">{product.name} | Wimifarma</p><p className="mt-1 break-words text-xs text-emerald-700">wimifarma.com.br/produto/{product.slug}</p><p className="mt-2 text-sm leading-6">{buildProductMetaDescription(product)}</p><p className="mt-2 text-xs text-muted">Prévia ilustrativa. O Google pode apresentar outro título ou resumo.</p></div>
      {issues.length ? <ul className="list-disc space-y-2 pl-5 text-sm text-amber-800">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p className="text-sm text-emerald-700">Dados básicos preenchidos. Confira embalagem, foto e fontes antes de divulgar.</p>}
      <h3 className="border-t border-line pt-4 text-sm font-bold">Divulgação opcional</h3><p className="text-xs leading-5 text-muted">Os recursos abaixo ajudam em campanhas e redes sociais. Não é preciso usá-los para cada produto aparecer no sitemap.</p>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Canal<select className="h-11 rounded-md border border-line px-3" onChange={event => setSource(event.target.value as typeof source)} value={source}><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="google">Google Ads</option></select></label><label className="grid gap-2 text-sm font-semibold">Nome da campanha<Input maxLength={100} onChange={event => setCampaign(event.target.value)} value={campaign} /></label></div>
      <label className="grid gap-2 text-sm font-semibold">Link de campanha<textarea className="min-h-20 w-full rounded-md border border-line p-3 text-xs" readOnly value={url} /></label><Button disabled={product.status !== "ACTIVE"} onClick={() => void copy(url)} type="button" variant="secondary"><Copy className="h-4 w-4" />Copiar link</Button>
      <label className="grid gap-2 text-sm font-semibold">Texto para revisar<textarea className="min-h-40 w-full rounded-md border border-line p-3 text-sm" readOnly value={text} /></label><Button disabled={product.status !== "ACTIVE"} onClick={() => void copy(text)} type="button" variant="secondary"><Copy className="h-4 w-4" />Copiar texto</Button>
      <div className="rounded-lg bg-surface-subtle p-4"><h3 className="text-sm font-bold">Catálogo para Google Merchant Center</h3><p className="mt-2 text-xs leading-5 text-muted">Exporta itens publicados de alimentos, higiene e beleza que atendem aos requisitos básicos. Medicamentos, suplementos, artes geradas e dados incompletos ficam fora. Textos são identificados como assistidos por IA. Revise o arquivo, a origem dos textos, o frete, as devoluções e a adequação do checkout antes de enviar ao Google.</p><Button className="mt-3 h-auto min-h-11 w-full whitespace-normal sm:w-auto" disabled={downloading} onClick={() => void download()} type="button" variant="secondary"><Download className="h-4 w-4 shrink-0" />{downloading ? "Preparando..." : "Exportar catálogo para revisão"}</Button><p className="mt-2 text-xs text-muted">Esta ação baixa um arquivo. Não publica anúncios nem garante aprovação. UTM identifica o link; a medição depende da sua ferramenta de análise.</p></div>
      {message && <p className="text-sm text-ink" role="status">{message}</p>}</div>
    </DialogContent></Dialog></>;
}
