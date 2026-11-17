"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseCotefacilEans, type collectCatalogEans } from "@/features/supplier-planning/cotefacil-eans";

type CatalogEans = ReturnType<typeof collectCatalogEans>;

export function CotefacilEanPanel() {
  const [text, setText] = useState("");
  const [catalog, setCatalog] = useState<CatalogEans | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const { eans, invalid, duplicates } = catalog ?? parseCotefacilEans(text);
  const list = eans.join("\n");

  async function loadCatalog() {
    setLoading(true);
    setCopyFailed(false);
    setFeedback("Carregando EANs do site.");
    try {
      const response = await fetch("/api/admin/fornecedores/cotefacil/eans", { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar o catálogo.");
      const { data } = await response.json() as { data: CatalogEans };
      setCatalog(data);
      setText(data.eans.join("\n"));
      setFeedback("EANs do site carregados.");
    } catch {
      setFeedback("Não foi possível carregar os EANs do catálogo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function copyEans() {
    setCopyFailed(false);
    setFeedback("");
    try {
      await navigator.clipboard.writeText(list);
      setFeedback("EANs copiados.");
    } catch {
      setCopyFailed(true);
      setFeedback("A cópia automática falhou. Selecione e copie a lista preparada abaixo.");
    }
  }

  return (
    <section aria-labelledby="cotefacil-heading" className="space-y-4 rounded-xl border border-line bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 id="cotefacil-heading" className="text-lg font-bold text-ink">Cotefácil</h2>
        <p className="mt-1 text-sm text-muted">
          Prepare uma lista com um EAN por linha para consulta manual. O formato de importação do portal ainda precisa ser confirmado.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cotefacil-eans" className="block text-sm font-medium text-ink">EANs para consulta</label>
        <p id="cotefacil-eans-help" className="text-sm text-muted">
          Cole ou digite um ou mais códigos. Separe por espaço, vírgula, ponto e vírgula ou nova linha. Ao carregar do site, o campo recebe os códigos dos produtos ativos e dos itens publicados para consulta.
        </p>
        <Textarea
          id="cotefacil-eans"
          aria-describedby="cotefacil-eans-help"
          className="font-mono"
          rows={4}
          spellCheck={false}
          disabled={loading}
          value={text}
          onChange={event => {
            setText(event.target.value);
            setCatalog(null);
            setCopyFailed(false);
            setFeedback("");
          }}
        />
      </div>
      <p className="text-sm text-muted">
        EANs válidos: {eans.length} · Inválidos: {invalid} · Duplicados removidos: {duplicates}
        {catalog && <> · Produtos sem EAN: {catalog.missing}</>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={loadCatalog}>
          Carregar EANs do site
        </Button>
        <Button type="button" disabled={loading || !eans.length} onClick={copyEans}>Copiar EANs</Button>
        <Button asChild variant="ghost">
          <a href="https://www.cotefacil.com/login/" target="_blank" rel="noopener noreferrer">Abrir Cotefácil</a>
        </Button>
      </div>
      <p role="status" className="text-sm text-muted">{feedback}</p>
      {copyFailed && (
        <div className="space-y-1.5">
          <label htmlFor="cotefacil-copy" className="block text-sm font-medium text-ink">EANs preparados</label>
          <Textarea id="cotefacil-copy" className="font-mono" rows={4} readOnly value={list} />
        </div>
      )}
    </section>
  );
}
