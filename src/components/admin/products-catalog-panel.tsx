"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  Archive,
  ImagePlus,
  Loader2,
  PackagePlus,
  Pill,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type ProductListItem = {
  brand: string | null;
  category: string | null;
  createdAt: string;
  ean: string | null;
  id: string;
  imageUrl: string | null;
  isPopularPharmacy: boolean;
  name: string;
  price: string;
  promotionalPrice: string | null;
  requiresPrescription: boolean;
  sku: string | null;
  slug: string;
  status: ProductStatus;
  stock: number;
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

export function ProductsCatalogPanel() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadProducts() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/produtos", { cache: "no-store" });
      const payload = (await response.json()) as { data?: ProductListItem[]; error?: unknown };

      if (!response.ok) throw new Error(errorMessage(payload.error, "Nao foi possivel carregar os produtos."));
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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.set("image", file);
    const response = await fetch("/api/admin/uploads/produtos", { body: formData, method: "POST" });
    const payload = (await response.json()) as { data?: { imageUrl: string }; error?: unknown };

    if (!response.ok || !payload.data?.imageUrl) {
      throw new Error(errorMessage(payload.error, "Nao foi possivel otimizar a imagem."));
    }

    return payload.data.imageUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      toast.error("Escolha a imagem do produto antes de salvar.");
      return;
    }

    try {
      setIsSubmitting(true);
      const imageUrl = await uploadImage(image);
      const response = await fetch("/api/produtos", {
        body: JSON.stringify({
          brand: optionalField(formData, "brand"),
          category: optionalField(formData, "category"),
          description: optionalField(formData, "description"),
          ean: optionalField(formData, "ean"),
          imageUrl,
          isPopularPharmacy: formData.get("isPopularPharmacy") === "on",
          name: fieldValue(formData, "name"),
          price: fieldValue(formData, "price"),
          promotionalPrice: optionalField(formData, "promotionalPrice"),
          requiresPrescription: formData.get("requiresPrescription") === "on",
          sku: optionalField(formData, "sku"),
          status: fieldValue(formData, "status"),
          stock: fieldValue(formData, "stock") || "0",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: unknown };

      if (!response.ok) throw new Error(errorMessage(payload.error, "Nao foi possivel cadastrar o produto."));

      form.reset();
      setImagePreview(null);
      await loadProducts();
      toast.success("Produto cadastrado. A imagem foi otimizada em WebP.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeProducts = products.filter((product) => product.status === "ACTIVE").length;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand"><PackagePlus className="h-5 w-5" /></div>
          <CardTitle>Novo produto</CardTitle>
          <CardDescription>Envie uma foto de ate 10 MB. O sistema corrige a orientacao, limita a 1600 px e salva em WebP.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-ink">Nome do produto<Input maxLength={160} name="name" placeholder="Ex.: Dipirona 500 mg" required /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">Marca<Input maxLength={120} name="brand" placeholder="Opcional" /></label>
              <label className="grid gap-2 text-sm font-semibold text-ink">Categoria<Input maxLength={120} name="category" placeholder="Medicamentos" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">Preco normal<Input min="0.01" name="price" placeholder="0,00" required step="0.01" type="number" /></label>
              <label className="grid gap-2 text-sm font-semibold text-ink">Preco promocional<Input min="0.01" name="promotionalPrice" placeholder="Opcional" step="0.01" type="number" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">Estoque<Input defaultValue={0} min="0" name="stock" required type="number" /></label>
              <label className="grid gap-2 text-sm font-semibold text-ink">Status<select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" defaultValue="DRAFT" name="status"><option value="DRAFT">Rascunho</option><option value="ACTIVE">Publicado</option><option value="ARCHIVED">Arquivado</option></select></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">SKU<Input maxLength={80} name="sku" placeholder="Opcional" /></label>
              <label className="grid gap-2 text-sm font-semibold text-ink">Codigo EAN<Input maxLength={32} name="ean" placeholder="Opcional" /></label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-ink">Descricao<Textarea maxLength={800} name="description" placeholder="Apresentacao, quantidade ou observacao importante." /></label>
            <label className="grid gap-2 text-sm font-semibold text-ink">Imagem do produto<input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full cursor-pointer rounded-md border border-dashed border-line bg-surface-subtle px-3 py-3 text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-bold file:text-white" name="image" onChange={handleImageChange} required type="file" /></label>
            {imagePreview ? <div className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle p-3"><Image alt="Previa da imagem do produto" className="h-20 w-20 rounded-md border border-line bg-white object-contain" height={80} src={imagePreview} unoptimized width={80} /><p className="text-sm font-semibold text-muted">A foto sera convertida automaticamente para WebP antes de ser salva.</p></div> : <div className="flex items-center gap-3 rounded-md border border-dashed border-line px-3 py-4 text-sm font-semibold text-muted"><ImagePlus className="h-5 w-5 text-brand" />Use uma foto clara, bem iluminada e com o produto centralizado.</div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle px-3 py-3 text-sm font-bold text-ink"><input className="h-4 w-4 accent-brand" name="isPopularPharmacy" type="checkbox" />Farmacia Popular</label>
              <label className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle px-3 py-3 text-sm font-bold text-ink"><input className="h-4 w-4 accent-brand" name="requiresPrescription" type="checkbox" />Exige receita</label>
            </div>
            <Button disabled={isSubmitting} type="submit">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}Cadastrar produto</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-3"><Card className="border-brand/15"><CardContent className="p-4"><Pill className="h-5 w-5 text-brand" /><p className="mt-3 text-sm font-bold text-muted">Cadastrados</p><p className="text-3xl font-black text-ink">{products.length}</p></CardContent></Card><Card className="border-emerald-100"><CardContent className="p-4"><UploadCloud className="h-5 w-5 text-pharma-green" /><p className="mt-3 text-sm font-bold text-muted">Publicados</p><p className="text-3xl font-black text-ink">{activeProducts}</p></CardContent></Card><Card className="border-line"><CardContent className="p-4"><Archive className="h-5 w-5 text-muted" /><p className="mt-3 text-sm font-bold text-muted">Rascunhos</p><p className="text-3xl font-black text-ink">{products.filter((product) => product.status === "DRAFT").length}</p></CardContent></Card></div>
        <Card><CardHeader><CardTitle>Produtos cadastrados</CardTitle><CardDescription>Os itens publicados estao prontos para a proxima integracao com a vitrine publica.</CardDescription></CardHeader><CardContent>{isLoading ? <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line text-sm font-semibold text-muted"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando produtos</div> : products.length === 0 ? <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">Nenhum produto cadastrado ainda.</div> : <div className="grid gap-3">{products.map((product) => { const status = statusInfo[product.status]; return <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4 shadow-sm sm:flex-row" key={product.id}>{product.imageUrl ? <Image alt="" className="h-24 w-24 rounded-md border border-line bg-white object-contain" height={96} src={product.imageUrl} width={96} /> : <div className="flex h-24 w-24 items-center justify-center rounded-md bg-surface-subtle text-muted"><ImagePlus className="h-5 w-5" /></div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-ink">{product.name}</h3><span className={cn("rounded-md px-2.5 py-1 text-xs font-bold", status.className)}>{status.label}</span>{product.isPopularPharmacy ? <Badge variant="muted">Farmacia Popular</Badge> : null}</div><p className="mt-1 text-sm font-semibold text-muted">{[product.brand, product.category].filter(Boolean).join(" - ") || "Sem categoria"}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted"><span>Estoque: <strong className="text-ink">{product.stock}</strong></span><span>Preco: <strong className="text-ink">{formatCurrency(Number(product.promotionalPrice ?? product.price))}</strong></span>{product.promotionalPrice ? <span className="line-through">{formatCurrency(Number(product.price))}</span> : null}</div></div></div>; })}</div>}</CardContent></Card>
      </div>
    </div>
  );
}
