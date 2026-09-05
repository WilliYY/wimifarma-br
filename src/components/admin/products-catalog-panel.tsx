"use client";

import {
  FormEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  LayoutGrid,
  Loader2,
  PackagePlus,
  Pencil,
  Pill,
  Plus,
  Search,
  Sparkles,
  Star,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ProductImagePicker,
  type ProductImage,
  type ProductImagePickerHandle,
} from "@/components/admin/product-image-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  filterAndSortProducts,
  getProductCategories,
  type ProductCatalogSort,
} from "@/features/products/catalog";
import {
  isShowcasePosition,
  productIdsFromShowcase,
  SHOWCASE_SLOT_COUNT,
  updateShowcaseProduct,
} from "@/features/offers/showcase";
import type {
  ProductSuggestion,
  ProductSuggestionSource,
} from "@/features/products/ai-suggestions";
import { parseProductTerms } from "@/features/products/public-search";
import { cn, formatCurrency } from "@/lib/utils";

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type ProductListItem = {
  activeIngredients: string[];
  brand: string | null;
  category: string | null;
  createdAt: string;
  description: string | null;
  ean: string | null;
  featuredPosition: number | null;
  id: string;
  imageAssetId: string | null;
  imageUrl: string | null;
  isPopularPharmacy: boolean;
  name: string;
  price: string;
  promotionalPrice: string | null;
  requiresPrescription: boolean;
  searchTerms: string[];
  sku: string | null;
  slug: string;
  status: ProductStatus;
  stock: number;
  updatedAt: string;
};

const statusInfo: Record<ProductStatus, { className: string; label: string }> = {
  ACTIVE: { className: "bg-emerald-50 text-pharma-green", label: "Publicado" },
  ARCHIVED: { className: "bg-surface-subtle text-muted", label: "Arquivado" },
  DRAFT: { className: "bg-amber-50 text-amber-700", label: "Rascunho" },
};

function fieldValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalField(formData: FormData, key: string) {
  const value = fieldValue(formData, key);
  return value || undefined;
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null && "fieldErrors" in error) {
    const fieldErrors = error.fieldErrors as Record<string, string[] | undefined>;
    const firstError = Object.values(fieldErrors).flat().find(Boolean);
    if (firstError) return firstError;
  }

  return fallback;
}

function productPayload(
  formData: FormData,
  imageAsset?: ProductImage | null,
  clearEmptyFields = false,
) {
  const optionalValue = (key: string) =>
    clearEmptyFields ? fieldValue(formData, key) || null : optionalField(formData, key);

  return {
    activeIngredients: parseProductTerms(fieldValue(formData, "activeIngredients")),
    brand: optionalValue("brand"),
    category: optionalValue("category"),
    description: optionalValue("description"),
    ean: optionalValue("ean"),
    imageAssetId: imageAsset?.id,
    imageUrl: imageAsset?.url,
    isPopularPharmacy: formData.get("isPopularPharmacy") === "on",
    name: fieldValue(formData, "name"),
    price: fieldValue(formData, "price"),
    promotionalPrice: optionalValue("promotionalPrice"),
    requiresPrescription: formData.get("requiresPrescription") === "on",
    searchTerms: parseProductTerms(fieldValue(formData, "searchTerms")),
    sku: optionalValue("sku"),
    status: fieldValue(formData, "status"),
    stock: fieldValue(formData, "stock") || "0",
  };
}

function ProductFormFields({
  categoryListId,
  categoryOptions,
  imagePickerRef,
  product,
}: {
  categoryListId: string;
  categoryOptions: string[];
  imagePickerRef: RefObject<ProductImagePickerHandle | null>;
  product?: ProductListItem;
}) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<
    (ProductSuggestion & { sources: ProductSuggestionSource[] }) | null
  >(null);

  function formValue(name: string) {
    const form = nameInputRef.current?.form;
    const field = form?.elements.namedItem(name);
    return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
      ? field.value.trim()
      : "";
  }

  function applySuggestion(
    data: ProductSuggestion,
    { overwrite }: { overwrite: boolean },
  ) {
    const form = nameInputRef.current?.form;
    if (!form) return 0;

    const values = {
      activeIngredients: data.activeIngredients.join(", "),
      category: data.category ?? "",
      description: data.description ?? "",
      searchTerms: data.searchTerms.join(", "),
    };
    let appliedFields = 0;

    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name);
      if (!value || !(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
        continue;
      }
      if (!overwrite && field.value.trim()) continue;

      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      appliedFields += 1;
    }

    return appliedFields;
  }

  async function requestSuggestions() {
    const name = formValue("name");
    if (name.length < 3) {
      toast.error("Informe pelo menos 3 caracteres do nome do produto.");
      nameInputRef.current?.focus();
      return;
    }

    try {
      setIsSuggesting(true);
      setSuggestion(null);
      const response = await fetch("/api/produtos/sugestoes", {
        body: JSON.stringify({
          brand: formValue("brand"),
          ean: formValue("ean"),
          knownCategories: categoryOptions.slice(0, 40),
          name,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ProductSuggestion & { sources: ProductSuggestionSource[] };
        error?: unknown;
      };

      if (!response.ok || !payload.data) {
        throw new Error(errorMessage(payload.error, "Nao foi possivel pesquisar este produto."));
      }

      setSuggestion(payload.data);
      if (payload.data.confidence === "high") {
        const appliedFields = applySuggestion(payload.data, { overwrite: false });
        toast.success(
          appliedFields > 0
            ? "Dados confirmados foram preenchidos nos campos vazios."
            : "Sugestao pronta para revisao.",
        );
      } else {
        toast.warning("A identificacao precisa de revisao antes de preencher os campos.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel pesquisar este produto.");
    } finally {
      setIsSuggesting(false);
    }
  }

  const confidenceInfo = suggestion
    ? {
        high: { className: "bg-emerald-50 text-emerald-700", label: "Alta confianca" },
        low: { className: "bg-rose-50 text-rose-700", label: "Baixa confianca" },
        medium: { className: "bg-amber-50 text-amber-700", label: "Revisar" },
      }[suggestion.confidence]
    : null;

  return (
    <>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Nome do produto
        <Input defaultValue={product?.name} maxLength={160} name="name" placeholder="Ex.: Dipirona 500 mg" ref={nameInputRef} required />
      </label>
      <div className="overflow-hidden rounded-md border border-brand/20 bg-surface-subtle">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-ink">Assistente de cadastro</p>
              <p className="text-xs font-medium leading-5 text-muted">Pesquisa fontes publicas e preserva seus campos preenchidos.</p>
            </div>
          </div>
          <Button disabled={isSuggesting} onClick={() => void requestSuggestions()} size="sm" type="button" variant="secondary">
            {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isSuggesting ? "Pesquisando" : "Sugerir dados"}
          </Button>
        </div>

        {suggestion && confidenceInfo ? (
          <div className="grid gap-3 border-t border-line bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={cn("rounded-md px-2.5 py-1 text-xs font-black", confidenceInfo.className)}>
                {confidenceInfo.label}
              </span>
              <Button onClick={() => {
                const appliedFields = applySuggestion(suggestion, { overwrite: true });
                toast.success(appliedFields > 0 ? "Sugestoes aplicadas. Revise antes de salvar." : "Nao ha dados confirmados para aplicar.");
              }} size="sm" type="button" variant="secondary">
                <CheckCircle2 className="h-4 w-4" />
                Aplicar sugestoes
              </Button>
            </div>
            <div className="grid gap-2 text-xs leading-5 text-muted sm:grid-cols-2">
              <p><strong className="text-ink">Categoria:</strong> {suggestion.category ?? "Nao confirmada"}</p>
              <p><strong className="text-ink">Principios:</strong> {suggestion.activeIngredients.join(", ") || "Nao confirmados"}</p>
              <p className="sm:col-span-2"><strong className="text-ink">Termos:</strong> {suggestion.searchTerms.join(", ") || "Nenhum termo confirmado"}</p>
              {suggestion.description ? <p className="sm:col-span-2"><strong className="text-ink">Descricao:</strong> {suggestion.description}</p> : null}
            </div>
            {suggestion.warnings.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
                {suggestion.warnings.join(" ")}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-muted">
              <span>Fontes:</span>
              {suggestion.sources.length > 0 ? suggestion.sources.map((source) => (
                <a className="inline-flex max-w-56 items-center gap-1 text-brand hover:underline" href={source.url} key={source.url} rel="noreferrer" target="_blank">
                  <span className="truncate">{source.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )) : <span>Nenhuma fonte retornada</span>}
            </div>
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Marca
          <Input defaultValue={product?.brand ?? ""} maxLength={120} name="brand" placeholder="Opcional" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Categoria
          <Input defaultValue={product?.category ?? ""} list={categoryListId} maxLength={120} name="category" placeholder="Medicamentos" />
          <datalist id={categoryListId}>
            {categoryOptions.map((category) => <option key={category} value={category} />)}
          </datalist>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Principios ativos
          <Input
            defaultValue={product?.activeIngredients.join(", ") ?? ""}
            maxLength={1200}
            name="activeIngredients"
            placeholder="Ex.: paracetamol, fenilefrina"
          />
          <span className="text-xs font-medium leading-5 text-muted">
            Separe por virgula. Eles ajudam a encontrar correlatos.
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Termos de busca e indicacao
          <Input
            defaultValue={product?.searchTerms.join(", ") ?? ""}
            maxLength={1000}
            name="searchTerms"
            placeholder="Ex.: gripe, resfriado, congestao"
          />
          <span className="text-xs font-medium leading-5 text-muted">
            Use termos objetivos do cadastro, sem orientacao medica.
          </span>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Preco normal
          <Input defaultValue={product?.price} min="0.01" name="price" placeholder="0,00" required step="0.01" type="number" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Preco promocional
          <Input defaultValue={product?.promotionalPrice ?? ""} min="0.01" name="promotionalPrice" placeholder="Opcional" step="0.01" type="number" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Estoque
          <Input defaultValue={product?.stock ?? 0} min="0" name="stock" required type="number" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Status
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" defaultValue={product?.status ?? "DRAFT"} name="status">
            <option value="DRAFT">Rascunho</option>
            <option value="ACTIVE">Publicado</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          SKU
          <Input defaultValue={product?.sku ?? ""} maxLength={80} name="sku" placeholder="Opcional" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Codigo EAN
          <Input defaultValue={product?.ean ?? ""} maxLength={32} name="ean" placeholder="Opcional" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Descricao
        <Textarea defaultValue={product?.description ?? ""} maxLength={800} name="description" placeholder="Apresentacao, quantidade ou observacao importante." />
      </label>

      <ProductImagePicker initialImageAssetId={product?.imageAssetId} ref={imagePickerRef} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle px-3 py-3 text-sm font-bold text-ink">
          <input className="h-4 w-4 accent-brand" defaultChecked={product?.isPopularPharmacy} name="isPopularPharmacy" type="checkbox" />
          Farmacia Popular
        </label>
        <label className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle px-3 py-3 text-sm font-bold text-ink">
          <input className="h-4 w-4 accent-brand" defaultChecked={product?.requiresPrescription} name="requiresPrescription" type="checkbox" />
          Exige receita
        </label>
      </div>
    </>
  );
}

export function ProductsCatalogPanel() {
  const imagePickerRef = useRef<ProductImagePickerHandle>(null);
  const editImagePickerRef = useRef<ProductImagePickerHandle>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [featuredProductId, setFeaturedProductId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProductStatus>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<ProductCatalogSort>("newest");

  async function loadProducts() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/produtos", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: ProductListItem[];
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(errorMessage(payload.error, "Nao foi possivel carregar os produtos."));
      }
      setProducts(payload.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar os produtos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setIsSubmitting(true);
      const imageAsset = await imagePickerRef.current?.resolveImage();
      if (!imageAsset) throw new Error("Selecione a imagem do produto.");

      const response = await fetch("/api/produtos", {
        body: JSON.stringify(productPayload(formData, imageAsset)),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: unknown };

      if (!response.ok) {
        throw new Error(errorMessage(payload.error, "Nao foi possivel cadastrar o produto."));
      }

      form.reset();
      imagePickerRef.current?.reset();
      await loadProducts();
      await imagePickerRef.current?.refresh();
      setIsCreateOpen(false);
      toast.success("Produto cadastrado com imagem otimizada em WebP.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct) return;

    const formData = new FormData(event.currentTarget);

    try {
      setIsUpdating(true);
      const imageAsset = await editImagePickerRef.current?.resolveImage({ optional: true });
      const response = await fetch(`/api/produtos/${editingProduct.id}`, {
        body: JSON.stringify({
          ...productPayload(formData, imageAsset, true),
          expectedUpdatedAt: editingProduct.updatedAt,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: unknown };

      if (!response.ok) {
        if (response.status === 409) {
          setEditingProduct(null);
          await loadProducts();
        }
        throw new Error(errorMessage(payload.error, "Nao foi possivel atualizar o produto."));
      }

      setEditingProduct(null);
      await loadProducts();
      await imagePickerRef.current?.refresh();
      toast.success("Produto atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar o produto.");
    } finally {
      setIsUpdating(false);
    }
  }

  const activeProducts = products.filter((product) => product.status === "ACTIVE").length;
  const categoryOptions = useMemo(() => getProductCategories(products), [products]);
  const visibleProducts = useMemo(
    () => filterAndSortProducts(products, {
      category: categoryFilter,
      query,
      sort,
      status: statusFilter,
    }),
    [categoryFilter, products, query, sort, statusFilter],
  );
  const hasActiveFilters = Boolean(query || categoryFilter || statusFilter !== "ALL" || sort !== "newest");

  function clearFilters() {
    setQuery("");
    setCategoryFilter("");
    setStatusFilter("ALL");
    setSort("newest");
  }

  async function toggleFeatured(product: ProductListItem) {
    const shouldFeature = !isShowcasePosition(product.featuredPosition);

    if (shouldFeature && (product.status !== "ACTIVE" || !product.imageUrl)) {
      toast.error("Publique o produto e adicione uma foto antes de coloca-lo em destaque.");
      return;
    }

    try {
      setFeaturedProductId(product.id);
      const showcaseResponse = await fetch("/api/ofertas/vitrine", { cache: "no-store" });
      const showcasePayload = (await showcaseResponse.json()) as {
        data?: Array<{ featuredPosition: number | null; id: string }>;
        error?: unknown;
      };

      if (!showcaseResponse.ok) {
        throw new Error(errorMessage(showcasePayload.error, "Nao foi possivel carregar a vitrine."));
      }

      const currentProductIds = productIdsFromShowcase(showcasePayload.data ?? []);
      const nextProductIds = updateShowcaseProduct(
        currentProductIds,
        product.id,
        shouldFeature,
      );

      if (!nextProductIds) {
        throw new Error(`As ${SHOWCASE_SLOT_COUNT} posicoes estao ocupadas. Organize a vitrine para liberar um espaco.`);
      }

      const updateResponse = await fetch("/api/ofertas/vitrine", {
        body: JSON.stringify({ productIds: nextProductIds }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const updatePayload = (await updateResponse.json()) as { error?: unknown };

      if (!updateResponse.ok) {
        throw new Error(errorMessage(updatePayload.error, "Nao foi possivel atualizar o destaque."));
      }

      await loadProducts();
      toast.success(shouldFeature ? "Produto adicionado a Melhores ofertas." : "Produto removido dos destaques.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar o destaque.");
    } finally {
      setFeaturedProductId(null);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-5 rounded-lg border border-line bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            <Pill className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-brand">Gestao de produtos</p>
            <h2 className="mt-1 text-xl font-black text-ink sm:text-2xl">Produtos / Catálogo</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-muted">
              Cadastre, publique, organize e escolha os itens que aparecem em Melhores ofertas.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="secondary">
            <Link href="/admin/ofertas">
              <LayoutGrid className="h-4 w-4" />
              Organizar vitrine
            </Link>
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} type="button">
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        </div>
      </section>

      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-brand/15">
            <CardContent className="p-4">
              <Pill className="h-5 w-5 text-brand" />
              <p className="mt-3 text-sm font-bold text-muted">Cadastrados</p>
              <p className="text-3xl font-black text-ink">{products.length}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <UploadCloud className="h-5 w-5 text-pharma-green" />
              <p className="mt-3 text-sm font-bold text-muted">Publicados</p>
              <p className="text-3xl font-black text-ink">{activeProducts}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <Star className="h-5 w-5 text-amber-600" />
              <p className="mt-3 text-sm font-bold text-muted">Em destaque</p>
              <p className="text-3xl font-black text-ink">{products.filter((product) => isShowcasePosition(product.featuredPosition)).length}</p>
            </CardContent>
          </Card>
          <Card className="border-line">
            <CardContent className="p-4">
              <Archive className="h-5 w-5 text-muted" />
              <p className="mt-3 text-sm font-bold text-muted">Rascunhos</p>
              <p className="text-3xl font-black text-ink">{products.filter((product) => product.status === "DRAFT").length}</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="gap-1">
            <CardTitle>Catalogo de produtos</CardTitle>
            <CardDescription>Busque, classifique, edite ou destaque cada item.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line text-sm font-semibold text-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando produtos
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">Nenhum produto cadastrado ainda.</div>
            ) : (
              <div className="grid gap-5">
                <div className="grid gap-3 rounded-md border border-line bg-surface-subtle p-3">
                  <label className="grid gap-1.5 text-xs font-bold text-muted">
                    Buscar produto
                    <span className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                      <Input className="bg-white pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Nome, marca, SKU ou EAN" value={query} />
                    </span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1.5 text-xs font-bold text-muted">
                      Categoria
                      <select className="h-11 min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                        <option value="">Todas</option>
                        {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-muted">
                      Status
                      <select className="h-11 min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" onChange={(event) => setStatusFilter(event.target.value as "ALL" | ProductStatus)} value={statusFilter}>
                        <option value="ALL">Todos</option>
                        <option value="ACTIVE">Publicados</option>
                        <option value="DRAFT">Rascunhos</option>
                        <option value="ARCHIVED">Arquivados</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-muted">
                      Classificar por
                      <select className="h-11 min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" onChange={(event) => setSort(event.target.value as ProductCatalogSort)} value={sort}>
                        <option value="newest">Mais recentes</option>
                        <option value="name">Nome A-Z</option>
                        <option value="stock">Menor estoque</option>
                        <option value="price">Menor preco</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted">{visibleProducts.length} de {products.length} produtos</p>
                    {hasActiveFilters ? (
                      <Button onClick={clearFilters} size="sm" type="button" variant="ghost">
                        <X className="h-4 w-4" />
                        Limpar filtros
                      </Button>
                    ) : null}
                  </div>
                </div>

                {visibleProducts.length === 0 ? (
                  <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">Nenhum produto encontrado com esses filtros.</div>
                ) : (
                  <div className="grid gap-3">
                    {visibleProducts.map((product) => {
                      const status = statusInfo[product.status];
                      const isFeatured = isShowcasePosition(product.featuredPosition);
                      return (
                        <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center" key={product.id}>
                          <button
                            aria-label={`Editar ${product.name}`}
                            className="flex min-w-0 flex-1 cursor-pointer flex-col gap-4 rounded-md p-2 text-left transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 sm:flex-row sm:items-center"
                            onClick={() => setEditingProduct(product)}
                            type="button"
                          >
                            {product.imageUrl ? (
                              <Image alt={product.name} className="h-24 w-24 shrink-0 rounded-md border border-line bg-white object-contain" height={96} src={product.imageUrl} unoptimized width={96} />
                            ) : (
                              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-muted"><ImagePlus className="h-5 w-5" /></span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-ink">{product.name}</span>
                                <span className={cn("rounded-md px-2.5 py-1 text-xs font-bold", status.className)}>{status.label}</span>
                                {isFeatured ? (
                                  <Badge>Vitrine {String(product.featuredPosition).padStart(2, "0")}</Badge>
                                ) : null}
                                {product.isPopularPharmacy ? <Badge variant="muted">Farmacia Popular</Badge> : null}
                              </span>
                              <span className="mt-1 block text-sm font-semibold text-muted">{[product.brand, product.category].filter(Boolean).join(" - ") || "Sem categoria"}</span>
                              {product.activeIngredients.length > 0 ? (
                                <span className="mt-1 block line-clamp-1 text-xs font-semibold text-muted">
                                  Principios ativos: {product.activeIngredients.join(", ")}
                                </span>
                              ) : null}
                              <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted">
                                <span>Estoque: <strong className="text-ink">{product.stock}</strong></span>
                                <span>Preco: <strong className="text-ink">{formatCurrency(Number(product.promotionalPrice ?? product.price))}</strong></span>
                                {product.promotionalPrice ? <span className="line-through">{formatCurrency(Number(product.price))}</span> : null}
                              </span>
                            </span>
                          </button>
                          <div className="grid w-full gap-2 sm:w-auto sm:min-w-40">
                            <Button
                              aria-label={isFeatured ? `Remover ${product.name} dos destaques` : `Destacar ${product.name}`}
                              disabled={featuredProductId !== null || (!isFeatured && (product.status !== "ACTIVE" || !product.imageUrl))}
                              onClick={() => void toggleFeatured(product)}
                              size="sm"
                              title={!isFeatured && (product.status !== "ACTIVE" || !product.imageUrl) ? "Publique o produto e adicione uma foto para destacar" : undefined}
                              type="button"
                              variant={isFeatured ? "default" : "secondary"}
                            >
                              {featuredProductId === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Star className={cn("h-4 w-4", isFeatured && "fill-current")} />
                              )}
                              {isFeatured ? "Remover destaque" : "Destacar"}
                            </Button>
                            <Button onClick={() => setEditingProduct(product)} size="sm" type="button" variant="secondary">
                              <Pencil className="h-4 w-4" />
                              Editar produto
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open && isSubmitting) return;
          setIsCreateOpen(open);
          if (!open) imagePickerRef.current?.reset();
        }}
        open={isCreateOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
              <PackagePlus className="h-5 w-5" />
            </div>
            <DialogTitle>Cadastrar produto</DialogTitle>
            <DialogDescription>
              A imagem sera otimizada em WebP com ate 2000 px antes de ser salva.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <ProductFormFields
              categoryListId="new-product-categories"
              categoryOptions={categoryOptions}
              imagePickerRef={imagePickerRef}
            />
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button disabled={isSubmitting} onClick={() => setIsCreateOpen(false)} type="button" variant="secondary">
                Cancelar
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Cadastrar produto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !isUpdating) setEditingProduct(null);
        }}
        open={Boolean(editingProduct)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>Atualize os dados, a classificacao ou a imagem deste item.</DialogDescription>
          </DialogHeader>
          {editingProduct ? (
            <form className="grid gap-4" key={`${editingProduct.id}-${editingProduct.updatedAt}`} onSubmit={handleUpdate}>
              <ProductFormFields
                categoryListId="edit-product-categories"
                categoryOptions={categoryOptions}
                imagePickerRef={editImagePickerRef}
                product={editingProduct}
              />
              <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                <Button disabled={isUpdating} onClick={() => setEditingProduct(null)} type="button" variant="secondary">Cancelar</Button>
                <Button disabled={isUpdating} type="submit">
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  Salvar alteracoes
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
