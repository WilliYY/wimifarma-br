"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productTypeLabels } from "@/features/products/product-types";
import type { ImageCandidate, PhotoIdentity, PhotoSuggestions } from "@/features/product-images/suggestion-types";

export type PhotoSource = { file: File } | { url: string; name: string };

export function ProductPhotoSuggestions({ source, identity, disabled, onChoose }: {
  source: PhotoSource; identity: PhotoIdentity; disabled: boolean; onChoose: (file: File) => void;
}) {
  const [automatic, setAutomatic] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoSuggestions | null>(null);
  const [artworks, setArtworks] = useState<ImageCandidate[]>([]);
  const [error, setError] = useState("");
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const automaticallyAnalyzed = useRef<PhotoSource | null>(null);
  const runRef = useRef<(action: "analyze" | "studio" | "editorial") => Promise<void>>(null);
  const identityKey = JSON.stringify(identity);
  const current = useRef({ source, identityKey });
  current.current = { source, identityKey };

  useEffect(() => {
    requestRef.current?.abort();
    setBusy(null); setError(""); setResult(null); setArtworks([]); setChosenId(null); setExpanded(null);
    return () => requestRef.current?.abort();
  }, [source, identityKey]);

  useEffect(() => {
    if (!automatic || disabled || automaticallyAnalyzed.current === source) return;
    const timer = setTimeout(() => { automaticallyAnalyzed.current = source; void runRef.current?.("analyze"); }, 500);
    return () => clearTimeout(timer);
  }, [source, automatic, disabled]);

  async function requestSuggestions(action: "analyze" | "studio" | "editorial") {
    if (busy || disabled) return;
    const controller = new AbortController();
    requestRef.current?.abort(); requestRef.current = controller;
    const snapshot = { source, identityKey };
    const isCurrent = () => !controller.signal.aborted && current.current.source === snapshot.source && current.current.identityKey === snapshot.identityKey;
    setBusy(action); setError("");
    try {
      let file: File;
      if ("file" in source) file = source.file;
      else {
        const response = await fetch(source.url, { signal: controller.signal });
        if (!response.ok) throw new Error("Nao foi possivel abrir a foto selecionada.");
        const blob = await response.blob();
        file = new File([blob], source.name, { type: blob.type });
      }
      const form = new FormData();
      form.set("image", file); form.set("action", action);
      for (const [key, value] of Object.entries(identity)) form.set(key, value);
      const response = await fetch("/api/admin/imagens-produtos/sugestoes", { method: "POST", body: form, signal: controller.signal });
      const payload = await response.json();
      if (!isCurrent()) return;
      if (!response.ok || !payload.data) throw new Error(typeof payload.error === "string" ? payload.error : "Nao foi possivel obter sugestoes.");
      if (action === "analyze") setResult(payload.data as PhotoSuggestions);
      else setArtworks(items => [...items.slice(-3), payload.data as ImageCandidate]);
    } catch (caught) {
      if (isCurrent()) setError(caught instanceof Error ? caught.message : "Falha ao buscar sugestoes.");
    } finally { if (isCurrent()) setBusy(null); }
  }
  runRef.current = requestSuggestions;

  async function choose(candidate: ImageCandidate) {
    const snapshot = current.current;
    const response = await fetch(candidate.previewDataUrl);
    const blob = await response.blob();
    if (current.current.source !== snapshot.source || current.current.identityKey !== snapshot.identityKey) return;
    onChoose(new File([blob], `${candidate.kind === "generated" ? "arte-ilustrativa" : "foto-real"}-${candidate.view}.webp`, { type: "image/webp" }));
    setChosenId(candidate.id);
  }

  const candidates = [...(result?.candidates ?? []), ...artworks];
  return (
    <section aria-label="Sugestoes de fotos e artes" className="min-w-0 rounded-xl border border-brand/20 bg-white p-3 sm:p-4 [&_button]:min-h-11">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-sm font-bold text-ink"><Sparkles className="h-4 w-4 text-brand" />Fotos e artes para escolher</h3>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted">A IA lê sua embalagem e procura fotos reais. Você escolhe a capa antes de salvar.</p></div>
        <label className="flex min-h-11 items-center gap-2 text-xs font-semibold"><input checked={automatic} disabled={disabled} onChange={event => { setAutomatic(event.target.checked); if (!event.target.checked) { requestRef.current?.abort(); setBusy(null); } }} type="checkbox" />Analisar ao enviar foto</label>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">Sua foto é enviada ao assistente de IA. Artes são geradas somente ao clicar, conforme o uso da conta configurada.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={Boolean(busy) || disabled} onClick={() => void (async () => {
          const snapshot = current.current;
          const file = "file" in source ? source.file : new File([await (await fetch(source.url)).blob()], source.name, { type: "image/webp" });
          if (current.current.source !== snapshot.source || current.current.identityKey !== snapshot.identityKey) return;
          onChoose(file); setChosenId(null);
        })().catch(() => setError("Nao foi possivel recuperar a foto original."))} size="sm" type="button" variant="ghost">Usar foto original</Button>
        <Button disabled={Boolean(busy) || disabled} onClick={() => void requestSuggestions("analyze")} size="sm" type="button" variant="secondary"><Search className="h-4 w-4" />Buscar fotos reais</Button>
        <Button disabled={Boolean(busy) || disabled} onClick={() => void requestSuggestions("studio")} size="sm" type="button" variant="secondary"><Sparkles className="h-4 w-4" />Criar arte de estúdio</Button>
        <Button disabled={Boolean(busy) || disabled} onClick={() => void requestSuggestions("editorial")} size="sm" type="button" variant="secondary"><Sparkles className="h-4 w-4" />Criar arte editorial</Button>
      </div>
      {busy && <div aria-live="polite" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-brand" role="status"><Loader2 className="h-4 w-4 shrink-0 animate-spin" /><span className="min-w-0 flex-1">{busy === "analyze" ? "Analisando embalagem e conferindo fotos nas fontes..." : "Preparando uma arte a partir da sua foto..."}</span><Button onClick={() => { requestRef.current?.abort(); setBusy(null); }} size="sm" type="button" variant="ghost">Cancelar</Button></div>}
      {error && <p className="mt-3 rounded-md bg-rose-50 p-3 text-xs leading-5 text-rose-800" role="alert">{error}</p>}
      {result && <div className="mt-3 rounded-lg bg-surface-subtle p-3 text-xs leading-5 text-muted"><p className="font-bold text-ink">{result.analysis.name || "Identidade a conferir"} · {productTypeLabels[result.analysis.productType]}</p><p>{result.analysis.summary}</p>{[...result.analysis.warnings, ...result.warnings].map((warning, i) => <p className="mt-1" key={i}>{warning}</p>)}</div>}
      {candidates.length > 0 && <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
        {candidates.map(candidate => <article className="min-w-0 rounded-lg border border-line p-2" key={candidate.id}>
          <button aria-label={`Ampliar ${candidate.label}`} aria-expanded={expanded === candidate.id} className="block w-full cursor-zoom-in rounded-md focus-visible:outline-2 focus-visible:outline-brand" onClick={() => setExpanded(expanded === candidate.id ? null : candidate.id)} type="button"><Image alt={candidate.label} className="aspect-square max-h-56 w-full object-contain" height={240} src={candidate.previewDataUrl} unoptimized width={240} /></button>
          <p className="mt-2 text-xs font-bold text-ink">{candidate.label}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted">{candidate.kind === "generated" ? "Arte gerada por IA · confira os rótulos" : "Foto encontrada · confira a versão"}</p>
          {candidate.sourceUrl && <a className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs text-brand underline" href={candidate.sourceUrl} rel="noreferrer" target="_blank">Ver fonte<ExternalLink className="h-3 w-3" /></a>}
          <Button className="mt-2 w-full" disabled={disabled || Boolean(busy)} onClick={() => void choose(candidate).catch(() => setError("Nao foi possivel selecionar esta imagem."))} size="sm" type="button" variant={chosenId === candidate.id ? "default" : "secondary"}>{chosenId === candidate.id ? <><Check className="h-3 w-3" />Escolhida</> : "Usar esta imagem"}</Button>
        </article>)}
      </div>}
      {expanded && candidates.find(item => item.id === expanded) && <div className="mt-3 rounded-lg border border-line bg-white p-3"><Button onClick={() => setExpanded(null)} size="sm" type="button" variant="ghost">Fechar ampliação</Button><Image alt="Sugestao ampliada para conferir embalagem" className="mx-auto max-h-[70vh] w-full object-contain" height={900} src={candidates.find(item => item.id === expanded)!.previewDataUrl} unoptimized width={900} /></div>}
      <p className="mt-3 text-xs leading-5 text-muted">Verso e lateral aparecem apenas quando encontramos uma foto real compatível. A arte mantém o ângulo enviado. Nenhuma sugestão é publicada automaticamente.</p>
    </section>
  );
}
