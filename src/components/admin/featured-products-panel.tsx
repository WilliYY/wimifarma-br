"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  ImageOff,
  Loader2,
  RefreshCw,
  Save,
  ShoppingBasket,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SHOWCASE_SLOT_COUNT } from "@/features/offers/showcase";
import { formatCurrency } from "@/lib/utils";

type ShowcaseProduct = {
  brand: string | null;
  category: string | null;
  featuredPosition: number | null;
  id: string;
  imageUrl: string;
  name: string;
  price: string;
  promotionalPrice: string | null;
};

const emptySlots = () =>
  Array.from({ length: SHOWCASE_SLOT_COUNT }, (): string | null => null);

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null && "formErrors" in error) {
    const formErrors = error.formErrors as string[] | undefined;
    if (formErrors?.[0]) return formErrors[0];
  }

  return fallback;
}

function slotsFromProducts(products: ShowcaseProduct[]) {
  const slots = emptySlots();

  for (const product of products) {
    if (
      product.featuredPosition !== null &&
      product.featuredPosition >= 1 &&
      product.featuredPosition <= SHOWCASE_SLOT_COUNT
    ) {
      slots[product.featuredPosition - 1] = product.id;
    }
  }

  return slots;
}

export function FeaturedProductsPanel() {
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [slots, setSlots] = useState<Array<string | null>>(emptySlots);
  const [savedSlots, setSavedSlots] = useState<Array<string | null>>(emptySlots);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadShowcase = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/ofertas/vitrine", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: ShowcaseProduct[];
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(errorMessage(payload.error, "Nao foi possivel carregar a vitrine."));
      }

      const nextProducts = payload.data ?? [];
      const nextSlots = slotsFromProducts(nextProducts);
      setProducts(nextProducts);
      setSlots(nextSlots);
      setSavedSlots(nextSlots);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar a vitrine.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShowcase();
  }, [loadShowcase]);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const selectedCount = slots.filter(Boolean).length;
  const isDirty = slots.some((productId, index) => productId !== savedSlots[index]);

  function selectProduct(slotIndex: number, productId: string) {
    setSlots((current) => {
      const next = current.map((selectedId) =>
        productId && selectedId === productId ? null : selectedId,
      );
      next[slotIndex] = productId || null;
      return next;
    });
  }

  async function saveShowcase() {
    try {
      setIsSaving(true);
      const response = await fetch("/api/ofertas/vitrine", {
        body: JSON.stringify({ productIds: slots }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as { error?: unknown };

      if (!response.ok) {
        throw new Error(errorMessage(payload.error, "Nao foi possivel salvar a vitrine."));
      }

      setSavedSlots([...slots]);
      toast.success("Vitrine de Melhores ofertas atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a vitrine.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-brand/15">
          <CardContent className="p-4">
            <ShoppingBasket className="h-5 w-5 text-brand" />
            <p className="mt-3 text-sm font-bold text-muted">Na vitrine</p>
            <p className="text-3xl font-black text-ink">{selectedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="p-4">
            <BadgePercent className="h-5 w-5 text-pharma-green" />
            <p className="mt-3 text-sm font-bold text-muted">Produtos disponiveis</p>
            <p className="text-3xl font-black text-ink">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-line">
          <CardContent className="p-4">
            <ImageOff className="h-5 w-5 text-muted" />
            <p className="mt-3 text-sm font-bold text-muted">Posicoes livres</p>
            <p className="text-3xl font-black text-ink">{SHOWCASE_SLOT_COUNT - selectedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-2">
            <CardTitle>Melhores ofertas</CardTitle>
            <CardDescription>Escolha os produtos e a ordem em que aparecem na pagina inicial.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={!isDirty || isSaving}
              onClick={() => setSlots([...savedSlots])}
              type="button"
              variant="secondary"
            >
              <RefreshCw className="h-4 w-4" />
              Desfazer
            </Button>
            <Button disabled={!isDirty || isSaving} onClick={saveShowcase} type="button">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar vitrine
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line text-sm font-semibold text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando vitrine
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {slots.map((productId, index) => {
                const product = productId ? productsById.get(productId) : null;
                const position = String(index + 1).padStart(2, "0");

                return (
                  <div
                    className="grid min-w-0 grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 rounded-md border border-line bg-surface-subtle p-3"
                    key={index}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-xs font-black text-white">
                      {position}
                    </span>
                    {product?.imageUrl ? (
                      <Image
                        alt=""
                        className="h-14 w-14 rounded-md border border-line bg-white object-contain p-1"
                        height={56}
                        src={product.imageUrl}
                        unoptimized
                        width={56}
                      />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-line bg-white text-muted">
                        <ImageOff className="h-4 w-4" />
                      </span>
                    )}
                    <label className="grid min-w-0 gap-1.5 text-xs font-bold text-muted">
                      Produto
                      <select
                        aria-label={`Produto da posicao ${position}`}
                        className="h-11 min-w-0 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                        onChange={(event) => selectProduct(index, event.target.value)}
                        value={productId ?? ""}
                      >
                        <option value="">Posicao livre</option>
                        {products.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} - {formatCurrency(Number(option.promotionalPrice ?? option.price))}
                          </option>
                        ))}
                      </select>
                      <span className="truncate font-semibold">
                        {product
                          ? [product.brand, product.category].filter(Boolean).join(" - ") || "Sem categoria"
                          : "Sem produto selecionado"}
                      </span>
                    </label>
                    <Button
                      aria-label={`Limpar posicao ${position}`}
                      disabled={!productId}
                      onClick={() => selectProduct(index, "")}
                      size="icon"
                      title="Limpar posicao"
                      type="button"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
