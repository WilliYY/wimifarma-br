"use client";

import { FormEvent, useRef, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function SiteSearch() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const search = query.trim();
    if (!search) {
      inputRef.current?.focus();
      return;
    }

    const message = `Ola, tudo bem? Gostaria de consultar disponibilidade e preco de: ${search}`;
    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  return (
    <form
      action={`https://wa.me/${siteConfig.phone}`}
      className="group/search mx-auto hidden h-14 w-full max-w-[42rem] flex-1 items-center gap-2 rounded-full border border-white/80 bg-white/98 py-1.5 pl-2 pr-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] transition duration-300 focus-within:border-brand/60 focus-within:shadow-[0_18px_44px_rgba(200,16,46,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] focus-within:ring-4 focus-within:ring-brand/15 md:flex"
      method="get"
      onSubmit={handleSubmit}
      rel="noreferrer"
      target="_blank"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition duration-300 group-focus-within/search:bg-brand group-focus-within/search:text-white">
        <Search className="h-5 w-5" />
      </span>
      <input
        aria-label="Buscar produtos e servicos"
        className="h-full min-w-0 flex-1 bg-transparent font-body text-[0.95rem] font-medium text-ink outline-none placeholder:text-[#6e7e95]"
        list="site-search-suggestions"
        autoComplete="off"
        name="text"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Remedio ou Farmacia Popular"
        ref={inputRef}
        type="search"
        value={query}
      />
      <datalist id="site-search-suggestions">
        <option value="Farmacia Popular" />
        <option value="Delivery" />
        <option value="Medicamentos" />
        <option value="Vitaminas" />
        <option value="Dermocosmeticos" />
      </datalist>
      <button
        className="soft-breathe inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 font-body text-sm font-black text-white shadow-[0_12px_28px_rgba(200,16,46,0.26)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white lg:px-6"
        type="submit"
      >
        <span>Consultar</span>
        <MessageCircle className="h-4 w-4 stroke-[2.6]" />
      </button>
    </form>
  );
}
