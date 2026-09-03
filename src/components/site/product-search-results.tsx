import Image from "next/image";
import Link from "next/link";
import { ImageIcon, Loader2, Pill, SearchX, Sparkles } from "lucide-react";
import type { PublicProductSearchItem } from "@/features/products/public-search";
import { cn, formatCurrency } from "@/lib/utils";

type ProductSearchResultsProps = {
  activeId: string | null;
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
}: {
  activeId: string | null;
  item: PublicProductSearchItem;
  kind: "product" | "related";
  onActiveChange: (id: string) => void;
  onChoose: () => void;
  optionIdPrefix: string;
}) {
  const currentPrice = Number(item.promotionalPrice ?? item.price);
  const hasPromotion = Boolean(
    item.promotionalPrice && Number(item.promotionalPrice) < Number(item.price),
  );

  return (
    <Link
      aria-selected={activeId === item.id}
      className={cn(
        "grid min-h-20 grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2.5 py-2 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
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
            alt=""
            className="h-full w-full object-contain p-1"
            height={56}
            src={item.imageUrl}
            unoptimized
            width={56}
          />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted" />
        )}
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-body text-sm font-black text-ink">
            {item.name}
          </span>
          {item.requiresPrescription ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[0.62rem] font-black uppercase text-amber-700">
              Receita
            </span>
          ) : null}
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
          "rounded-full px-2 py-1 font-body text-[0.62rem] font-black uppercase",
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

  return (
    <div
      className="max-h-[min(34rem,calc(100vh-11rem))] overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-[0_24px_60px_rgba(17,24,39,0.24)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200"
      id={id}
      role="listbox"
    >
      {trimmedQuery.length < 2 ? (
        <div className="flex min-h-24 items-center gap-3 rounded-md bg-surface-subtle px-4 py-3 text-sm font-semibold text-muted">
          <Sparkles className="h-5 w-5 shrink-0 text-brand" />
          Digite pelo menos 2 letras para buscar no catalogo.
        </div>
      ) : isLoading ? (
        <div className="flex min-h-24 items-center justify-center gap-2 text-sm font-bold text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          Buscando produtos
        </div>
      ) : error ? (
        <div className="flex min-h-24 items-center gap-3 rounded-md bg-brand-soft px-4 py-3 text-sm font-semibold text-brand">
          <SearchX className="h-5 w-5 shrink-0" />
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="flex min-h-24 items-center gap-3 rounded-md bg-surface-subtle px-4 py-3 text-sm font-semibold text-muted">
          <SearchX className="h-5 w-5 shrink-0" />
          Nenhum produto publicado encontrado. Pressione Enter para consultar no WhatsApp.
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
                  />
                ))}
              </div>
            </div>
          ) : null}

          <p className="border-t border-line px-2 pb-1 pt-2 text-[0.68rem] font-semibold leading-5 text-muted">
            Correlatos ajudam na busca, mas nao significam substituicao. Confirme com a equipe.
          </p>
        </div>
      )}
    </div>
  );
}
