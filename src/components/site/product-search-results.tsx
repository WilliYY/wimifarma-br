import { productImageAlt } from "@/features/products/image-placeholder";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Loader2, Pill, SearchX, Sparkles } from "lucide-react";
import { ProductImagePlaceholder } from "@/components/site/product-image-placeholder";
import { isPrescriptionSearchProduct, productSearchHref, productSearchPlan, type PublicProductSearchItem } from "@/features/products/public-search";
import { PrescriptionSearchDetails } from "./prescription-search-details";
import { cn, formatCurrency } from "@/lib/utils";
import { productDisplayName } from "@/features/products/display-name";

type ProductSearchResultsProps = {
  activeId: string | null;
  correctedQuery?: string | null;
  error: string | null;
  id: string;
  isLoading: boolean;
  onActiveChange: (id: string) => void;
  onChoose: () => void;
  optionIdPrefix: string;
  products: PublicProductSearchItem[];
  query: string;
  relatedProducts: PublicProductSearchItem[];
};

function ResultItem({
  activeId,
  item,
  kind,
  onActiveChange,
  onChoose,
  optionIdPrefix,
  topicSearch,
}: {
  activeId: string | null;
  item: PublicProductSearchItem;
  kind: "product" | "related";
  onActiveChange: (id: string) => void;
  onChoose: () => void;
  optionIdPrefix: string;
  topicSearch: boolean;
}) {
  if (topicSearch && isPrescriptionSearchProduct(item)) return (
    <Link aria-selected={activeId === item.id} className={cn("block rounded-md px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35", activeId === item.id ? "bg-surface-subtle" : "hover:bg-surface-subtle")}
      href={`/produto/${item.slug}`} id={`${optionIdPrefix}-${item.id}`} onClick={onChoose}
      onFocus={() => onActiveChange(item.id)} onMouseMove={() => onActiveChange(item.id)} role="option">
      <PrescriptionSearchDetails item={item} />
    </Link>
  );
  const currentPrice = Number(item.promotionalPrice ?? item.price);
  const hasPromotion = Boolean(
    item.promotionalPrice && Number(item.promotionalPrice) < Number(item.price),
  );

  return (
    <Link
      aria-selected={activeId === item.id}
      className={cn(
        "grid min-h-20 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 rounded-lg px-2 py-2 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 sm:grid-cols-[3.75rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-2.5",
        activeId === item.id ? "bg-brand-soft" : "hover:bg-[#fff7f8]",
      )}
      href={`/produto/${item.slug}`}
      id={`${optionIdPrefix}-${item.id}`}
      onClick={onChoose}
      onFocus={() => onActiveChange(item.id)}
      onMouseMove={() => onActiveChange(item.id)}
      role="option"
    >
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
        {item.imageUrl ? (
          <Image
            alt={productImageAlt(item.name, item.imageUrl)}
            className="h-full w-full object-contain p-1"
            height={56}
            src={item.imageUrl}
            unoptimized
            width={56}
          />
        ) : (
          <ProductImagePlaceholder catalogClassification={item.catalogClassification} category={item.category} requiresPrescription={item.requiresPrescription} className="h-full w-full p-1" />
        )}
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="line-clamp-2 font-body text-sm font-bold leading-5 text-ink">
            {productDisplayName(item.name)}
          </span>
        </span>
        <span className="mt-1 block truncate font-body text-xs font-semibold text-muted">
          {item.activeIngredients.length > 0
            ? item.activeIngredients.join(" + ")
            : [item.brand, item.category].filter(Boolean).join(" · ") || "Consulte os detalhes"}
        </span>
        <span className="mt-1 flex items-baseline gap-2">
          <strong className="font-body text-sm text-brand">
            {formatCurrency(currentPrice)}
          </strong>
          {hasPromotion ? (
            <span className="font-body text-[0.68rem] font-semibold text-muted line-through">
              {formatCurrency(Number(item.price))}
            </span>
          ) : null}
        </span>
      </span>

      <span
        className={cn(
          "hidden rounded-full px-2 py-1 font-body text-[0.62rem] font-black uppercase sm:inline-flex",
          kind === "related"
            ? "bg-[#ecfdf3] text-[#027a48]"
            : "bg-white text-brand shadow-sm",
        )}
      >
        {kind === "related" ? "Correlato" : "Produto"}
      </span>
    </Link>
  );
}

export function ProductSearchResults({
  activeId,
  correctedQuery,
  error,
  id,
  isLoading,
  onActiveChange,
  onChoose,
  optionIdPrefix,
  products,
  query,
  relatedProducts,
}: ProductSearchResultsProps) {
  const trimmedQuery = query.trim();
  const topicSearch = productSearchPlan(correctedQuery ?? trimmedQuery).topics.length > 0;

  return (
    <div
      className="max-h-[min(34rem,calc(100dvh-11rem))] overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-[0_16px_40px_rgba(17,24,39,0.16)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200"
    >
      {trimmedQuery.length >= 2 && !isLoading && !error && products.length > 0 && correctedQuery ? (
        <p className="px-3 py-2 text-xs leading-5 text-muted" role="status">
          Resultados aproximados para “{correctedQuery}”.
        </p>
      ) : null}
      <div id={id} role="listbox">
      {trimmedQuery.length < 2 ? (
        <div className="flex min-h-14 items-center gap-3 rounded-xl bg-surface-subtle px-3 py-2.5 text-sm text-muted">
          <Sparkles className="h-5 w-5 shrink-0 text-brand" />
          <span><strong className="block text-sm font-bold text-ink">Busque no catálogo</strong><span className="text-xs leading-5">Digite pelo menos 2 letras.</span></span>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-14 items-center gap-3 px-3 py-2.5 text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          Buscando produtos
        </div>
      ) : error ? (
        <div className="flex min-h-14 items-center gap-3 rounded-xl bg-brand-soft px-3 py-2.5 text-sm font-semibold leading-5 text-brand">
          <SearchX className="h-5 w-5 shrink-0" />
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="flex min-h-14 items-center gap-3 rounded-xl bg-surface-subtle px-3 py-2.5 text-sm text-muted">
          <SearchX className="h-5 w-5 shrink-0" />
          <span><strong className="block text-sm font-bold text-ink">Nenhum produto encontrado</strong><span className="text-xs leading-5">Tente outro nome, marca ou princípio ativo.</span></span>
        </div>
      ) : (
        <div className="grid gap-2">
          <div aria-label="Produtos encontrados" role="group">
            <div className="flex items-center gap-2 px-2 pb-1 pt-1 font-body text-[0.68rem] font-black uppercase tracking-[0.12em] text-brand">
              <Pill className="h-3.5 w-3.5" />
              Produtos encontrados
            </div>
            <div className="grid gap-1">
              {products.map((item) => (
                <ResultItem
                  activeId={activeId}
                  item={item}
                  key={item.id}
                  kind="product"
                  onActiveChange={onActiveChange}
                  onChoose={onChoose}
                  optionIdPrefix={optionIdPrefix}
                  topicSearch={topicSearch}
                />
              ))}
            </div>
          </div>

          {relatedProducts.length > 0 ? (
            <div aria-label="Produtos correlatos" className="border-t border-line pt-2" role="group">
              <div className="flex items-center gap-2 px-2 pb-1 font-body text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#027a48]">
                <Sparkles className="h-3.5 w-3.5" />
                Correlatos do primeiro resultado
              </div>
              <div className="grid gap-1">
                {relatedProducts.map((item) => (
                  <ResultItem
                    activeId={activeId}
                    item={item}
                    key={item.id}
                    kind="related"
                    onActiveChange={onActiveChange}
                    onChoose={onChoose}
                    optionIdPrefix={optionIdPrefix}
                    topicSearch={topicSearch}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {relatedProducts.length > 0 && <p className="border-t border-line px-2 pb-1 pt-2 text-[0.68rem] font-semibold leading-5 text-muted">
            Correlatos ajudam na busca, mas nao significam substituicao. Confirme com a equipe.
          </p>}
        </div>
      )}
      </div>
      {trimmedQuery.length >= 2 ? (
        <Link className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-brand-soft px-3 py-3 text-sm font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={productSearchHref(trimmedQuery)} onClick={onChoose}>
          Ver todos os resultados <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </Link>
      ) : null}
    </div>
  );
}
