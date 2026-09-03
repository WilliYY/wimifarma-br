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
import {
  Archive,
  ImagePlus,
  Loader2,
  PackagePlus,
  Pencil,
  Pill,
  Search,
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
  return (
    <>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Nome do produto
        <Input defaultValue={product?.name} maxLength={160} name="name" placeholder="Ex.: Dipirona 500 mg" required />
      </label>
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
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
            <PackagePlus className="h-5 w-5" />
          </div>
          <CardTitle>Novo produto</CardTitle>
          <CardDescription>
            Fotos em WebP, com ate 2000 px e compressao automatica para arquivos pesados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <ProductFormFields
              categoryListId="new-product-categories"
              categoryOptions={categoryOptions}
              imagePickerRef={imagePickerRef}
            />
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Cadastrar produto
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
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
          <Card className="border-line">
            <CardContent className="p-4">
              <Archive className="h-5 w-5 text-muted" />
              <p className="mt-3 text-sm font-bold text-muted">Rascunhos</p>
              <p className="text-3xl font-black text-ink">{products.filter((product) => product.status === "DRAFT").length}</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Produtos cadastrados</CardTitle>
            <CardDescription>Busque, classifique e edite cada item do catalogo.</CardDescription>
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
                      return (
                        <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center" key={product.id}>
                          {product.imageUrl ? (
                            <Image alt={product.name} className="h-24 w-24 shrink-0 rounded-md border border-line bg-white object-contain" height={96} src={product.imageUrl} unoptimized width={96} />
                          ) : (
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-muted"><ImagePlus className="h-5 w-5" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-ink">{product.name}</h3>
                              <span className={cn("rounded-md px-2.5 py-1 text-xs font-bold", status.className)}>{status.label}</span>
                              {product.featuredPosition ? (
                                <Badge>Vitrine {String(product.featuredPosition).padStart(2, "0")}</Badge>
                              ) : null}
                              {product.isPopularPharmacy ? <Badge variant="muted">Farmacia Popular</Badge> : null}
                            </div>
                            <p className="mt-1 text-sm font-semibold text-muted">{[product.brand, product.category].filter(Boolean).join(" - ") || "Sem categoria"}</p>
                            {product.activeIngredients.length > 0 ? (
                              <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted">
                                Principios ativos: {product.activeIngredients.join(", ")}
                              </p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted">
                              <span>Estoque: <strong className="text-ink">{product.stock}</strong></span>
                              <span>Preco: <strong className="text-ink">{formatCurrency(Number(product.promotionalPrice ?? product.price))}</strong></span>
                              {product.promotionalPrice ? <span className="line-through">{formatCurrency(Number(product.price))}</span> : null}
                            </div>
                          </div>
                          <Button className="w-full sm:w-auto" onClick={() => setEditingProduct(product)} size="sm" type="button" variant="secondary">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
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
