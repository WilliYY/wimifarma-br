"use client";

import { FocusEvent, FormEvent, useMemo, useRef, useState } from "react";
import { MessageCircle, Search, X } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type SearchRelation = {
  label: string;
  description: string;
  terms: string[];
};

const SEARCH_RELATIONS: SearchRelation[] = [
  {
    label: "Dipirona",
    description: "Medicamentos, gotas, comprimidos e similares",
    terms: ["dipirona", "dor", "febre", "analgesico", "antitermico"],
  },
  {
    label: "Farmacia Popular",
    description: "Itens com regras de receita e disponibilidade",
    terms: ["farmacia popular", "popular", "remedio gratuito", "desconto"],
  },
  {
    label: "Delivery",
    description: "Entrega, frete e atendimento em Ivate",
    terms: ["delivery", "entrega", "frete", "whatsapp", "ivate"],
  },
  {
    label: "Vitaminas",
    description: "Suplementos e apoio para rotina de cuidados",
    terms: ["vitamina", "vitaminas", "suplemento", "imunidade"],
  },
  {
    label: "Dermocosmeticos",
    description: "Cuidados com pele, cabelo e protecao solar",
    terms: ["dermo", "dermocosmetico", "pele", "protetor", "cabelo"],
  },
];

function normalizeSearchTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function SiteSearch() {
  const [query, setQuery] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();
  const relatedItems = useMemo(() => {
    const normalizedQuery = normalizeSearchTerm(query);

    if (!normalizedQuery) {
      return SEARCH_RELATIONS.slice(0, 4);
    }

    return SEARCH_RELATIONS.filter((item) => {
      const searchable = [item.label, item.description, ...item.terms]
        .map(normalizeSearchTerm)
        .join(" ");

      return searchable.includes(normalizedQuery);
    }).slice(0, 4);
  }, [query]);
  const hasRelatedItems = relatedItems.length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedQuery) {
      inputRef.current?.focus();
      setIsSuggestionsOpen(true);
      return;
    }

    const message = `Ola, tudo bem? Gostaria de consultar disponibilidade e preco de: ${trimmedQuery}`;
    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    const nextTarget = event.relatedTarget;

    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setIsSuggestionsOpen(false);
    }
  }

  function handleRelationClick(item: SearchRelation) {
    setQuery(item.label);
    setIsSuggestionsOpen(false);
    inputRef.current?.focus();
  }

  function handleClear() {
    setQuery("");
    setIsSuggestionsOpen(true);
    inputRef.current?.focus();
  }

  return (
    <form
      action={`https://wa.me/${siteConfig.phone}`}
      className="group/search relative mx-auto hidden h-14 w-full max-w-[42rem] flex-1 items-center gap-2 rounded-full border border-white/80 bg-white/98 py-1.5 pl-2 pr-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] transition duration-300 focus-within:border-brand/60 focus-within:shadow-[0_18px_44px_rgba(200,16,46,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] focus-within:ring-4 focus-within:ring-brand/15 md:flex"
      method="get"
      onBlur={handleBlur}
      onFocus={() => setIsSuggestionsOpen(true)}
      onSubmit={handleSubmit}
      rel="noreferrer"
      target="_blank"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition duration-300 group-focus-within/search:bg-brand group-focus-within/search:text-white">
        <Search className="h-5 w-5" />
      </span>
      <input
        aria-autocomplete="list"
        aria-controls="site-search-relations"
        aria-expanded={isSuggestionsOpen}
        aria-haspopup="listbox"
        aria-label="Buscar produtos e servicos"
        className="h-full min-w-0 flex-1 bg-transparent font-body text-[0.95rem] font-medium text-ink outline-none placeholder:text-[#6e7e95]"
        autoComplete="off"
        name="text"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Remedio ou Farmacia Popular"
        ref={inputRef}
        role="combobox"
        type="text"
        value={query}
      />
      {trimmedQuery ? (
        <button
          aria-label="Limpar busca"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#53647c] transition duration-200 hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          onClick={handleClear}
          type="button"
        >
          <X className="h-4 w-4 stroke-[2.8]" />
        </button>
      ) : null}
      <button
        className="soft-breathe inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 font-body text-sm font-black text-white shadow-[0_12px_28px_rgba(200,16,46,0.26)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white lg:px-6"
        type="submit"
      >
        <span>Consultar</span>
        <MessageCircle className="h-4 w-4 stroke-[2.6]" />
      </button>
      {isSuggestionsOpen ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-50 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-[0_22px_55px_rgba(17,24,39,0.24)]"
          id="site-search-relations"
          role="listbox"
        >
          <div className="px-3 pb-1.5 pt-1 font-body text-[0.68rem] font-black uppercase tracking-[0.14em] text-brand">
            Relacionados
          </div>
          {hasRelatedItems ? (
            <div className="grid gap-1">
              {relatedItems.map((item) => (
                <button
                  aria-selected={item.label === query}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition duration-200 hover:bg-[#fff4f6] focus-visible:bg-[#fff4f6] focus-visible:outline-none"
                  key={item.label}
                  onClick={() => handleRelationClick(item)}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-body text-sm font-black text-ink">
                      {item.label}
                    </span>
                    <span className="block truncate font-body text-xs font-medium text-muted">
                      {item.description}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 font-body text-[0.68rem] font-black uppercase tracking-[0.08em] text-brand">
                    Ver
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-[#fff8f9] px-3 py-3 font-body text-sm font-semibold text-muted">
              Consulte no WhatsApp para confirmarmos disponibilidade.
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
