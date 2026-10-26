"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

export function CatalogFilterPanel({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <aside aria-label="Filtros do catálogo" className="min-w-0 rounded-2xl border border-line bg-white shadow-sm [scrollbar-width:thin] lg:sticky lg:top-[var(--site-header-offset,14rem)] lg:max-h-[calc(100dvh-var(--site-header-offset,14rem)-1rem)] lg:overflow-y-auto">
    <button aria-controls={id} aria-expanded={expanded} className="flex min-h-14 w-full items-center gap-3 px-5 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden" onClick={() => setExpanded(!expanded)} type="button"><SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-brand" />Categorias e filtros<ChevronDown aria-hidden="true" className={`ml-auto h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
    <div className={`${expanded ? "block" : "hidden"} lg:block`} id={id}>{children}</div>
  </aside>;
}
