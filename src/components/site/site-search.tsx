"use client";

import {
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { ProductSearchResults } from "@/components/site/product-search-results";
import type { PublicProductSearchItem } from "@/features/products/public-search";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type SearchResponse = {
  data?: {
    products: PublicProductSearchItem[];
    relatedProducts: PublicProductSearchItem[];
  };
  error?: string;
};

const emptyResults = {
  products: [] as PublicProductSearchItem[],
  relatedProducts: [] as PublicProductSearchItem[],
};

export function SiteSearch() {
  const router = useRouter();
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(emptyResults);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const trimmedQuery = query.trim();
  const items = useMemo(
    () => [...results.products, ...results.relatedProducts],
    [results],
  );

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults(emptyResults);
      setActiveId(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/produtos/busca?q=${encodeURIComponent(trimmedQuery)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as SearchResponse;

        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "Nao foi possivel buscar agora.");
        }

        setResults(payload.data);
        setActiveId(
          (currentId) =>
            [...payload.data!.products, ...payload.data!.relatedProducts].find(
              (item) => item.id === currentId,
            )?.id ?? payload.data!.products[0]?.id ?? null,
        );
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setResults(emptyResults);
        setActiveId(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Nao foi possivel buscar agora.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 240);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => mobileInputRef.current?.focus(), 30);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  function closeSearch() {
    const shouldRestoreMobileFocus = isMobileOpen;
    setIsDesktopOpen(false);
    setIsMobileOpen(false);
    if (shouldRestoreMobileFocus) {
      window.setTimeout(() => mobileTriggerRef.current?.focus(), 0);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedQuery) {
      (isMobileOpen ? mobileInputRef : desktopInputRef).current?.focus();
      return;
    }

    if (isLoading) return;

    const selectedProduct =
      items.find((item) => item.id === activeId) ?? results.products[0];

    if (selectedProduct) {
      closeSearch();
      router.push(`/produto/${selectedProduct.slug}`);
      return;
    }

    const message = `Ola, tudo bem? Gostaria de consultar disponibilidade e preco de: ${trimmedQuery}`;
    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      closeSearch();
      event.currentTarget.blur();
      return;
    }

    if (!items.length || !["ArrowDown", "ArrowUp"].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = items.findIndex((item) => item.id === activeId);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      currentIndex < 0
        ? direction > 0
          ? 0
          : items.length - 1
        : (currentIndex + direction + items.length) % items.length;
    setActiveId(items[nextIndex].id);
  }

  function handleDesktopBlur(event: FocusEvent<HTMLFormElement>) {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setIsDesktopOpen(false);
    }
  }

  function handleMobileDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (!firstElement || !lastElement) return;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function handleClear() {
    setQuery("");
    setResults(emptyResults);
    setActiveId(null);
    setError(null);
    (isMobileOpen ? mobileInputRef : desktopInputRef).current?.focus();
  }

  const desktopActiveOptionId = activeId
    ? `desktop-site-search-option-${activeId}`
    : undefined;
  const mobileActiveOptionId = activeId
    ? `mobile-site-search-option-${activeId}`
    : undefined;

  return (
    <>
      <form
        className="group/search relative mx-auto hidden h-14 w-full max-w-[42rem] flex-1 items-center gap-2 rounded-full border border-white/80 bg-white/98 py-1.5 pl-2 pr-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] transition duration-300 focus-within:border-brand/60 focus-within:shadow-[0_18px_44px_rgba(200,16,46,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] focus-within:ring-4 focus-within:ring-brand/15 md:flex"
        onBlur={handleDesktopBlur}
        onFocus={() => setIsDesktopOpen(true)}
        onSubmit={handleSubmit}
        role="search"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition duration-300 group-focus-within/search:rotate-[-8deg] group-focus-within/search:bg-brand group-focus-within/search:text-white">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </span>
        <input
          aria-activedescendant={desktopActiveOptionId}
          aria-autocomplete="list"
          aria-controls="desktop-product-search-results"
          aria-expanded={isDesktopOpen}
          aria-haspopup="listbox"
          aria-label="Buscar produtos"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent font-body text-[0.95rem] font-medium text-ink outline-none placeholder:text-[#6e7e95]"
          maxLength={80}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsDesktopOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Busque por produto, principio ativo ou sintoma"
          ref={desktopInputRef}
          role="combobox"
          type="search"
          value={query}
        />
        {trimmedQuery ? (
          <button
            aria-label="Limpar busca"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#53647c] transition hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            onClick={handleClear}
            type="button"
          >
            <X className="h-4 w-4 stroke-[2.8]" />
          </button>
        ) : null}
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 font-body text-sm font-black text-white shadow-[0_12px_28px_rgba(200,16,46,0.26)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:px-6"
          type="submit"
        >
          <span>Encontrar</span>
          <ArrowRight className="h-4 w-4 stroke-[2.6]" />
        </button>
        {isDesktopOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-50">
            <ProductSearchResults
              activeId={activeId}
              error={error}
              id="desktop-product-search-results"
              isLoading={isLoading}
              onActiveChange={setActiveId}
              onChoose={closeSearch}
              optionIdPrefix="desktop-site-search-option"
              products={results.products}
              query={query}
              relatedProducts={results.relatedProducts}
            />
          </div>
        ) : null}
      </form>

      <button
        aria-expanded={isMobileOpen}
        aria-label="Abrir busca de produtos"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white text-brand shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden"
        onClick={() => setIsMobileOpen(true)}
        ref={mobileTriggerRef}
        type="button"
      >
        <Search className="h-5 w-5" />
      </button>

      {isMobileOpen ? (
        <div
          aria-label="Busca de produtos"
          aria-modal="true"
          className="fixed inset-0 z-[80] bg-[#121820]/96 px-3 py-4 backdrop-blur-md md:hidden"
          onKeyDown={handleMobileDialogKeyDown}
          role="dialog"
        >
          <div className="mx-auto flex h-full max-w-xl flex-col">
            <div className="flex items-center justify-between gap-4 px-1 pb-4 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-white/65">Catalogo Wimifarma</p>
                <h2 className="mt-1 text-xl font-black">Encontre seu produto</h2>
              </div>
              <button
                aria-label="Fechar busca"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={closeSearch}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="flex h-14 items-center gap-2 rounded-full bg-white p-1.5 pl-3 shadow-xl" onSubmit={handleSubmit} role="search">
              {isLoading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" /> : <Search className="h-5 w-5 shrink-0 text-brand" />}
              <input
                aria-activedescendant={mobileActiveOptionId}
                aria-autocomplete="list"
                aria-controls="mobile-product-search-results"
                aria-expanded="true"
                aria-haspopup="listbox"
                aria-label="Buscar produtos"
                autoComplete="off"
                className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:text-muted"
                maxLength={80}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Produto ou principio ativo"
                ref={mobileInputRef}
                role="combobox"
                type="search"
                value={query}
              />
              {trimmedQuery ? (
                <button aria-label="Limpar busca" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted" onClick={handleClear} type="button">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button aria-label="Abrir produto encontrado" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white" type="submit">
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>

            <div className="mt-3 min-h-0 flex-1">
              <ProductSearchResults
                activeId={activeId}
                error={error}
                id="mobile-product-search-results"
                isLoading={isLoading}
                onActiveChange={setActiveId}
                onChoose={closeSearch}
                optionIdPrefix="mobile-site-search-option"
                products={results.products}
                query={query}
                relatedProducts={results.relatedProducts}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
