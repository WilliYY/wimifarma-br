"use client";

import {
  FormEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
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
import { CashbackProductFields } from "@/components/admin/cashback-product-fields";
import { WimiCoinsProductFields } from "@/components/admin/wimicoins-product-fields";
import { SupplierProductOffers } from "@/components/admin/supplier-product-offers";
import { ProductQuickControls } from "@/components/admin/product-quick-controls";
import { ProductBulkEditor } from "@/components/admin/product-bulk-editor";
import { ProductImagePlaceholder } from "@/components/site/product-image-placeholder";
import { BULK_PRODUCT_LIMIT, visibleBulkSelection } from "@/features/products/catalog-bulk";
import { catalogKindLabels, classificationLabels, medicineClassLabels, readClassification } from "@/features/products/catalog-operations";
import { productDisplayName } from "@/features/products/display-name";
import { ProductShippingFields, type ProductShippingFieldsHandle } from "@/components/admin/product-shipping-fields";
import { ProductMarketingTools } from "@/components/admin/product-marketing-tools";
import { ProductDeleteButton, ProductTrashDialog } from "@/components/admin/product-trash";
import {
  ProductImagePicker,
  type ProductImage,
  type ProductImagePickerHandle,
} from "@/components/admin/product-image-picker";
import { catalogCategorySuggestions, productTypeHint, productTypeLabels } from "@/features/products/product-types";
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
import { isValidGtin, productIdentityKey } from "@/features/products/identity";
import { buildProductMetaDescription } from "@/features/products/product-detail";
import { cn, formatCurrency } from "@/lib/utils";

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type ProductListItem = {
  catalogClassification?: unknown;
  supplierMarkupBps?: number;
  supplierPricing?: { supplier: string; unitCostCents: number; unitPriceCents: number; purchaseLimit: number; demandAllowed?: boolean; validUntil: string } | null;
  inventorySource?: "PHARMACY" | "DISTRIBUTOR";
  wimicoinsEnabled?: boolean;
  wimicoinsRateBps?: number;
  shippingProfile?: unknown;
  cashbackEnabled: boolean;
  cashbackRateBps: number;
  activeIngredients: string[];
  brand: string | null;
  category: string | null;
  createdAt: string;
  description: string | null;
  ean: string | null;
  featuredPosition: number | null;
  id: string;
  imageAssetId: string | null;
  imageAsset?: { width: number; height: number; originalName: string } | null;
  imageUrl: string | null;
  imageUrls?: string[];
  isPopularPharmacy: boolean;
  name: string;
  price: string;
  promotionalPrice: string | null;
  requiresPrescription: boolean;
  prescriptionType?: "UNREVIEWED" | "ORDINARY" | "CONTROLLED" | "ANTIMICROBIAL";
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
    ...(formData.has("supplierMarkupPercent") ? { supplierMarkupBps: Math.round(Number(fieldValue(formData, "supplierMarkupPercent")) * 100) } : {}),
    ...(formData.has("inventorySource") ? { inventorySource: fieldValue(formData, "inventorySource") } : {}),
    ...(formData.has("shippingDraft") ? { shippingProfile: JSON.parse(fieldValue(formData, "shippingDraft")) as unknown } : {}),
    ...(formData.has("cashbackPercent") ? {
      cashbackEnabled: formData.get("cashbackEnabled") === "on",
      cashbackRateBps: Math.round(Number(formData.get("cashbackPercent")) * 100),
    } : {}),
    ...(formData.has("wimicoinsPercent") ? {
      wimicoinsEnabled: formData.get("wimicoinsEnabled") === "on",
      wimicoinsRateBps: Math.round(Number(formData.get("wimicoinsPercent")) * 100),
    } : {}),
    activeIngredients: parseProductTerms(fieldValue(formData, "activeIngredients")),
    brand: optionalValue("brand"),
    category: optionalValue("category"),
    description: optionalValue("description"),
    ean: optionalValue("ean"),
    imageAssetId: imageAsset === null && clearEmptyFields ? null : imageAsset?.id,
    imageUrl: imageAsset === null && clearEmptyFields ? null : imageAsset?.url,
    featured: formData.get("featured") === "on" && fieldValue(formData, "status") === "ACTIVE" && imageAsset !== null,
    isPopularPharmacy: formData.get("isPopularPharmacy") === "on",
    name: fieldValue(formData, "name"),
    price: fieldValue(formData, "price"),
    promotionalPrice: optionalValue("promotionalPrice"),
    requiresPrescription: formData.get("requiresPrescription") === "on",
    ...(formData.has("prescriptionType") ? { prescriptionType: fieldValue(formData, "prescriptionType") } : {}),
    searchTerms: parseProductTerms(fieldValue(formData, "searchTerms")),
    sku: optionalValue("sku"),
    status: fieldValue(formData, "status"),
    stock: fieldValue(formData, "stock") || "0",
  };
}

function ProductFormSection({ number, title, description, children, className, id, integrated = false }: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  id?: string;
  integrated?: boolean;
}) {
  return (
    <section aria-label={title} id={id} className={cn("grid min-w-0 scroll-mt-4 gap-5 bg-white p-4 sm:p-6", integrated ? "border-b border-line last:border-b-0" : "rounded-xl border border-line", className)}>
      <div className="flex items-start gap-3 border-b border-line pb-4">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-black text-brand">{number}</span>
        <div className="min-w-0">
          <h3 className="text-base font-black text-ink">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ProductFormFields({
  canManageCashback,
  canManageShipping,
  categoryListId,
  categoryOptions,
  imagePickerRef,
  product,
  disabled = false,
}: {
  canManageCashback: boolean;
  canManageShipping: boolean;
  categoryListId: string;
  categoryOptions: string[];
  imagePickerRef: RefObject<ProductImagePickerHandle | null>;
  product?: ProductListItem;
  disabled?: boolean;
}) {
  const sectionId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const shippingFieldsRef = useRef<ProductShippingFieldsHandle>(null);
  const pendingResearch = useRef<AbortController | null>(null);
  const researchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResearchKey = useRef(product ? productIdentityKey({ name: product.name, brand: product.brand ?? "", ean: product.ean ?? "" }) : "");
  const [automatic, setAutomatic] = useState(true);
  const [inventorySource, setInventorySource] = useState(product?.inventorySource ?? "PHARMACY");
  const privateSupplierPhoto = inventorySource === "DISTRIBUTOR" && Boolean(product?.requiresPrescription);
  const [seo, setSeo] = useState({ name: product?.name ?? "", brand: product?.brand ?? "", description: product?.description ?? "" });
  const [photoIdentity, setPhotoIdentity] = useState({ name: product?.name ?? "", brand: product?.brand ?? "", ean: product?.ean ?? "" });
  const [categoryHint, setCategoryHint] = useState(product?.category ?? "");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<
    (ProductSuggestion & { sources: ProductSuggestionSource[] }) | null
  >(null);

  useEffect(() => () => {
    pendingResearch.current?.abort();
    if (researchTimer.current) clearTimeout(researchTimer.current);
  }, []);

  function formValue(name: string) {
    const form = nameInputRef.current?.form;
    const field = form?.elements.namedItem(name);
    return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
      ? field.value.trim()
      : "";
  }

  function currentIdentity() {
    return { name: formValue("name"), brand: formValue("brand"), ean: formValue("ean") };
  }

  function refreshSeo() {
    setSeo({ name: formValue("name"), brand: formValue("brand"), description: formValue("description") });
    setPhotoIdentity(currentIdentity());
    setCategoryHint(formValue("category"));
  }

  function identityChanged() {
    pendingResearch.current?.abort();
    if (researchTimer.current) clearTimeout(researchTimer.current);
    setIsSuggesting(false);
    setSuggestion(null);
    refreshSeo();
  }

  function scheduleResearch() {
    if (!automatic) return;
    const identity = currentIdentity();
    if ((identity.name.length < 8 && !isValidGtin(identity.ean)) || (identity.ean && !isValidGtin(identity.ean))) return;
    if (researchTimer.current) clearTimeout(researchTimer.current);
    researchTimer.current = setTimeout(() => void requestSuggestions(false), 800);
  }

  function changeAutomatic(enabled: boolean) {
    setAutomatic(enabled);
    if (enabled) return;
    if (researchTimer.current) clearTimeout(researchTimer.current);
    pendingResearch.current?.abort();
    lastResearchKey.current = "";
    setIsSuggesting(false);
  }

  function applySuggestion(
    data: ProductSuggestion,
    { overwrite }: { overwrite: boolean },
  ) {
    const form = nameInputRef.current?.form;
    if (!form) return 0;

    const values = {
      name: data.name ?? "",
      brand: data.brand ?? "",
      ean: data.ean ?? "",
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
    if (canManageShipping && data.shipping) {
      appliedFields += shippingFieldsRef.current?.applySuggestion(data.shipping, productIdentityKey(currentIdentity())) ?? 0;
    }
    refreshSeo();
    return appliedFields;
  }

  async function requestSuggestions(manual = true) {
    if (researchTimer.current) clearTimeout(researchTimer.current);
    const identity = currentIdentity();
    const key = productIdentityKey(identity);
    if (!manual && lastResearchKey.current === key) return;
    if (identity.name.length < 3 && !isValidGtin(identity.ean)) {
      toast.error("Informe o nome ou um EAN valido do produto.");
      nameInputRef.current?.focus();
      return;
    }
    if (identity.ean && !isValidGtin(identity.ean)) {
      toast.error("EAN/GTIN invalido. Confira os numeros da embalagem.");
      return;
    }
    pendingResearch.current?.abort();
    const controller = new AbortController();
    pendingResearch.current = controller;
    lastResearchKey.current = key;

    try {
      setIsSuggesting(true);
      setSuggestion(null);
      const response = await fetch("/api/produtos/sugestoes", {
        body: JSON.stringify({
          ...identity,
          knownCategories: categoryOptions.slice(0, 40),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: ProductSuggestion & { sources: ProductSuggestionSource[] };
        error?: unknown;
      };
      if (controller.signal.aborted || productIdentityKey(currentIdentity()) !== key) return;

      if (!response.ok || !payload.data) {
        throw new Error(errorMessage(payload.error, "Nao foi possivel pesquisar este produto."));
      }

      setSuggestion(payload.data);
      if (payload.data.confidence === "high") {
        const appliedFields = applySuggestion(payload.data, { overwrite: false });
        lastResearchKey.current = productIdentityKey(currentIdentity());
        toast.success(
          appliedFields > 0
            ? "Dados pesquisados preenchidos. Confira antes de publicar."
            : "Sugestao pronta para revisao.",
        );
      } else {
        toast.warning("A identificacao precisa de revisao antes de preencher os campos.");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      toast.error(error instanceof Error ? error.message : "Nao foi possivel pesquisar este produto.");
    } finally {
      if (pendingResearch.current === controller) setIsSuggesting(false);
    }
  }

  const confidenceInfo = suggestion
    ? {
        high: { className: "bg-emerald-50 text-emerald-700", label: "Alta confianca" },
        low: { className: "bg-rose-50 text-rose-700", label: "Baixa confianca" },
        medium: { className: "bg-amber-50 text-amber-700", label: "Revisar" },
      }[suggestion.confidence]
    : null;
  const typeHint = suggestion?.productType && suggestion.productType !== "unknown" ? suggestion.productType : productTypeHint(`${categoryHint} ${seo.name}`);
  const nonMedicine = ["food", "beauty", "hygiene", "device", "other"].includes(typeHint);

  return (
    <fieldset className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-surface-subtle p-3 sm:p-5" disabled={disabled}>
      <div className="mb-5 overflow-hidden rounded-xl border border-brand/20 bg-brand-soft/40">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-ink">Assistente único de cadastro</p>
              <p className="mt-1 text-xs leading-5 text-muted">Nome, descrição, SEO, categoria, peso e medidas em uma pesquisa. Informe o nome ou EAN abaixo e confira as fontes antes de salvar.</p>
              <label className="mt-1 flex cursor-pointer items-start gap-2 text-xs font-semibold text-muted"><input checked={automatic} className="mt-0.5 h-4 w-4 shrink-0 accent-brand" onChange={event => changeAutomatic(event.target.checked)} type="checkbox" />Preencher campos vazios automaticamente com IA</label>
            </div>
          </div>
          <Button className="min-h-11 shrink-0 whitespace-normal" disabled={isSuggesting} onClick={() => void requestSuggestions()} size="sm" type="button" variant="secondary">
            {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isSuggesting ? "Conferindo fontes..." : "Pesquisar cadastro completo"}
          </Button>
        </div>

        {suggestion && confidenceInfo ? (
          <div className="grid gap-3 border-t border-line bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={cn("rounded-md px-2.5 py-1 text-xs font-black", confidenceInfo.className)}>
                {confidenceInfo.label}
              </span>
              <Button disabled={suggestion.identityMatch === "conflict" || suggestion.sources.length === 0 || !suggestion.name} onClick={() => {
                if (!window.confirm("Substituir os campos pelos dados pesquisados? Confira embalagem e fontes antes de publicar.")) return;
                const appliedFields = applySuggestion(suggestion, { overwrite: true });
                toast.success(appliedFields > 0 ? "Sugestoes aplicadas. Revise antes de salvar." : "Nao ha dados confirmados para aplicar.");
              }} size="sm" type="button" variant="secondary">
                <CheckCircle2 className="h-4 w-4" />
                Aplicar sugestões ao cadastro
              </Button>
            </div>
            <div className="grid gap-2 text-xs leading-5 text-muted sm:grid-cols-2">
              <p><strong className="text-ink">Categoria:</strong> {suggestion.category ?? "Nao confirmada"}</p>
              <p><strong className="text-ink">Tipo:</strong> {productTypeLabels[typeHint]}</p>
              {!nonMedicine && <p className="sm:col-span-2"><strong className="text-ink">Principios:</strong> {suggestion.activeIngredients.join(", ") || "Nao confirmados"}</p>}
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
      <nav aria-label="Seções do cadastro" className="mb-4 flex flex-wrap gap-2">
        {[["identity", "Identificação"], ["description", "Descrição e SEO"], ["shipping", "Peso e medidas"], ["commercial", "Preços e estoque"], ["photos", "Fotos"]].map(([key, label]) => <button className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-muted transition-colors hover:border-brand/30 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" key={key} onClick={() => document.getElementById(`${sectionId}-${key}`)?.scrollIntoView({ block: "start" })} type="button">{label}</button>)}
      </nav>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div aria-label="Informações do produto" className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white">
          <ProductFormSection id={`${sectionId}-identity`} integrated number="01" title="Identificação" description="Nome, marca e apresentação exata orientam toda a pesquisa.">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
              Nome do produto
              <Input defaultValue={product?.name} maxLength={160} name="name" onBlur={scheduleResearch} onChange={identityChanged} placeholder="Nome, marca, versão e quantidade" ref={nameInputRef} required />
            </label>
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                Marca
                <Input defaultValue={product?.brand ?? ""} maxLength={120} name="brand" onBlur={scheduleResearch} onChange={identityChanged} placeholder="Opcional" />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                Categoria
                <Input defaultValue={product?.category ?? ""} list={categoryListId} maxLength={120} name="category" onChange={refreshSeo} placeholder="Ex.: Chocolates, Perfumaria, Medicamentos" />
                <datalist id={categoryListId}>
                  {[...new Set([...categoryOptions, ...catalogCategorySuggestions])].map((category) => <option key={category} value={category} />)}
                </datalist>
              </label>
            </div>
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                SKU
                <Input defaultValue={product?.sku ?? ""} maxLength={80} name="sku" placeholder="Opcional" />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                Codigo EAN
                <Input defaultValue={product?.ean ?? ""} inputMode="numeric" maxLength={32} name="ean" onBlur={scheduleResearch} onChange={identityChanged} placeholder="Codigo da embalagem" />
              </label>
            </div>
          </ProductFormSection>
          <ProductFormSection id={`${sectionId}-description`} integrated number="02" title="Descrição e SEO" description="Informações objetivas ajudam o cliente a encontrar o produto.">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
              Descricao
              <Textarea defaultValue={product?.description ?? ""} maxLength={800} name="description" onChange={refreshSeo} placeholder="Apresentacao, quantidade ou observacao importante." />
            </label>
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                Principios ativos (somente medicamentos)
                <Input
                  defaultValue={product?.activeIngredients.join(", ") ?? ""}
                  maxLength={1200}
                  name="activeIngredients"
                  placeholder={nonMedicine ? "Não se aplica a este tipo de produto" : "Ex.: paracetamol, fenilefrina"}
                />
                <span className="text-xs font-medium leading-5 text-muted">
                  {nonMedicine ? "Deixe vazio para alimentos, perfumaria e higiene. Ingredientes comuns não são princípios ativos." : "Separe por virgula. Preencha somente quando aplicavel; ajuda a encontrar correlatos."}
                </span>
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                Termos de busca
                <Input
                  defaultValue={product?.searchTerms.join(", ") ?? ""}
                  maxLength={1000}
                  name="searchTerms"
                  placeholder={typeHint === "food" ? "Ex.: chocolate, wafer, ao leite, marca" : "Nome, marca, tipo e características"}
                />
                <span className="text-xs font-medium leading-5 text-muted">
                  Use termos objetivos do cadastro, sem orientacao medica.
                </span>
              </label>
            </div>
            <div aria-label="Prévia na busca" className="rounded-xl border border-line bg-surface-subtle p-4">
              {seo.name && <div className="min-w-0 border-l-2 border-pharma-green pl-3"><p className="text-xs font-semibold text-muted">Prévia na busca</p><p className="mt-1 break-words text-sm font-bold text-ink">{seo.name} | Wimifarma</p><p className="mt-1 break-words text-xs leading-5 text-muted">{buildProductMetaDescription(seo)}</p></div>}
              {!seo.name && <p className="text-xs leading-5 text-muted">Informe o nome do produto para visualizar a prévia de busca.</p>}
            </div>
          </ProductFormSection>
          <div id={`${sectionId}-shipping`} className="min-w-0 scroll-mt-4"><ProductShippingFields integrated ref={shippingFieldsRef} initialProfile={product?.shippingProfile} identityKey={productIdentityKey(photoIdentity)} suggestion={suggestion?.shipping} researched={Boolean(suggestion)} canEdit={canManageShipping} medicine={typeHint === "medicine"} productIdentity={{ name: photoIdentity.name, category: categoryHint, requiresPrescription: product?.requiresPrescription ?? typeHint === "medicine", prescriptionType: product?.prescriptionType, isPopularPharmacy: product?.isPopularPharmacy ?? false }} /></div>
        </div>
        <div className="grid min-w-0 gap-5">
          <ProductFormSection id={`${sectionId}-commercial`} number="04" title="Preços, estoque e publicação" description="Defina os valores, o estoque e como o produto aparece na loja.">
            {canManageCashback && <label className="grid gap-2 text-sm font-semibold text-ink">Origem da venda<select name="inventorySource" value={inventorySource} onChange={event => setInventorySource(event.target.value as "PHARMACY" | "DISTRIBUTOR")} className="h-11 rounded-md border border-line bg-white px-3"><option value="PHARMACY">Estoque da farmácia</option><option value="DISTRIBUTOR">Produto de distribuidor</option></select><span className="text-xs font-normal leading-5 text-muted">O estoque físico fica separado. No distribuidor, a venda usa a oferta válida mais barata do mesmo EAN.</span></label>}
            {canManageCashback && inventorySource === "DISTRIBUTOR" && <label className="grid gap-2 text-sm font-bold">Acréscimo sobre o custo (%)<Input defaultValue={(product?.supplierMarkupBps ?? 6000) / 100} min="0" max="100" step="0.01" type="number" name="supplierMarkupPercent" required /><span className="text-xs font-normal leading-5 text-muted">Aplicado automaticamente ao custo válido. Não representa margem líquida.</span></label>}
            {canManageCashback && product?.inventorySource === "DISTRIBUTOR" && <SupplierProductOffers productId={product.id} ean={product.ean ?? ""} />}
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                {inventorySource === "DISTRIBUTOR" ? "Preço atual (automático)" : "Preço normal"}
                <Input defaultValue={product?.price} min="0.01" name="price" placeholder="0,00" readOnly={inventorySource === "DISTRIBUTOR"} required step="0.01" type="number" />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                Preco promocional
                <Input defaultValue={product?.promotionalPrice ?? ""} min="0.01" name="promotionalPrice" placeholder="Opcional" step="0.01" type="number" />
              </label>
            </div>
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                Estoque físico da farmácia
                <Input defaultValue={product?.stock ?? 0} min="0" name="stock" required type="number" />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
                Status
                <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" defaultValue={product?.status ?? "ACTIVE"} name="status">
                  <option value="DRAFT">Rascunho</option>
                  <option value="ACTIVE">Publicado</option>
                  <option value="ARCHIVED">Arquivado</option>
                </select>
              </label>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand/20 bg-brand-soft/40 px-3 py-3 text-sm font-bold text-ink"><input className="h-4 w-4 shrink-0 accent-brand" defaultChecked={isShowcasePosition(product?.featuredPosition ?? null)} name="featured" type="checkbox" /><Star className="h-4 w-4 text-brand" />Destacar em Melhores ofertas</label>

            {canManageCashback ? <CashbackProductFields enabled={product?.cashbackEnabled} rateBps={product?.cashbackRateBps} /> : null}
            {canManageCashback ? <WimiCoinsProductFields enabled={product?.wimicoinsEnabled} rateBps={product?.wimicoinsRateBps} /> : null}

            <label className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle px-3 py-3 text-sm font-bold text-ink">
              <input className="h-4 w-4 shrink-0 accent-brand" defaultChecked={product?.isPopularPharmacy} name="isPopularPharmacy" type="checkbox" />
              Farmacia Popular
            </label>
            {canManageShipping ? <>
              <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="requiresPrescription" defaultChecked={product?.requiresPrescription} />Exige receita</label>
              <label className="grid gap-2 text-sm font-bold">Classificação de receita (ADMIN)
                <select name="prescriptionType" className="min-h-11 rounded-md border border-line px-3" key={productIdentityKey(photoIdentity)} defaultValue={product && productIdentityKey({ name: product.name, brand: product.brand ?? "", ean: product.ean ?? "" }) === productIdentityKey(photoIdentity) ? product.prescriptionType ?? "UNREVIEWED" : "UNREVIEWED"}>
                  <option value="UNREVIEWED">Pendente de classificação</option><option value="ORDINARY">Receita comum</option><option value="ANTIMICROBIAL">Antimicrobiano · receita para pré-análise</option><option value="CONTROLLED">Controle especial · atendimento assistido</option>
                </select>
              </label>
            </> : <input name="requiresPrescription" type="hidden" value={product?.requiresPrescription ? "on" : "off"} />}
          </ProductFormSection>
          <ProductFormSection className="[&_button]:h-auto [&_button]:min-h-11 [&_button]:whitespace-normal [&_button]:py-2.5" id={`${sectionId}-photos`} number="05" title="Fotos do produto" description="Envie uma foto, use a biblioteca e confira o resultado antes de salvar.">
            <ProductImagePicker identity={photoIdentity} initialImageAssetId={product?.imageAssetId} initialImageUrl={product?.imageUrl} initialImageUrls={product?.imageUrls} key={`${product?.id ?? "new"}-${privateSupplierPhoto}`} privateSupplier={privateSupplierPhoto} ref={imagePickerRef} />
          </ProductFormSection>
        </div>
      </div>
    </fieldset>
  );
}

export function ProductsCatalogPanel({ canManageCashback = false, canManageShipping = false }: { canManageCashback?: boolean; canManageShipping?: boolean }) {
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
  const [classificationFilter, setClassificationFilter] = useState("");
  const [sort, setSort] = useState<ProductCatalogSort>("newest");
  const [origin, setOrigin] = useState<"PHARMACY" | "DISTRIBUTOR">("PHARMACY");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
        body: JSON.stringify({ ...productPayload(formData, imageAsset), imageUrls: imagePickerRef.current?.resolveImageUrls() ?? [] }),
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
          imageUrls: editImagePickerRef.current?.resolveImageUrls() ?? [],
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
    () => filterAndSortProducts(products.filter(product => {
      if ((product.inventorySource ?? "PHARMACY") !== origin) return false;
      if (!classificationFilter) return true;
      const item = readClassification(product.catalogClassification);
      if (classificationFilter === "ETHICAL") return item.kind === "MEDICINE" && item.ethical;
      if (classificationFilter === "OTC") return item.kind === "MEDICINE" && item.otc;
      if (classificationFilter.startsWith("CLASS:")) return item.kind === "MEDICINE" && item.medicineClass === classificationFilter.slice(6);
      return item.kind === classificationFilter;
    }), {
      category: categoryFilter,
      query,
      sort,
      status: statusFilter,
    }),
    [categoryFilter, classificationFilter, products, query, sort, statusFilter, origin],
  );
  const visibleSelectedIds = visibleBulkSelection(selectedIds, visibleProducts);
  const selectedProducts = visibleProducts.filter(product => visibleSelectedIds.includes(product.id));
  const selectableProducts = visibleProducts.slice(0, BULK_PRODUCT_LIMIT);
  const allVisibleSelected = selectableProducts.length > 0 && selectableProducts.every(product => visibleSelectedIds.includes(product.id));
  useEffect(() => {
    setSelectedIds(current => {
      const next = visibleBulkSelection(current, visibleProducts);
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next;
    });
  }, [visibleProducts]);
  function toggleSelection(id: string) {
    setSelectedIds(current => {
      const selected = visibleBulkSelection(current, visibleProducts);
      if (selected.includes(id)) return selected.filter(value => value !== id);
      if (selected.length >= BULK_PRODUCT_LIMIT) { toast.error("Selecione até 50 produtos por lote."); return selected; }
      return [...selected, id];
    });
  }
  const hasActiveFilters = Boolean(query || categoryFilter || classificationFilter || statusFilter !== "ALL" || sort !== "newest");

  function clearFilters() {
    setQuery("");
    setCategoryFilter("");
    setClassificationFilter("");
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
      <section className="flex flex-col gap-4 rounded-xl border border-line border-t-2 border-t-brand bg-white p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            <Pill className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-brand">Gestão de produtos</p>
            <h2 className="mt-1 text-xl font-black text-ink sm:text-2xl">Produtos / Catálogo</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-muted">
              Produtos, preços e disponibilidade em um só lugar.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ProductTrashDialog onChanged={loadProducts} />
          <Button asChild variant="secondary">
            <Link href="/admin/ofertas">
              <LayoutGrid className="h-4 w-4" />
              Organizar vitrine
            </Link>
          </Button>
          <Button className="min-h-11" onClick={() => setIsCreateOpen(true)} type="button">
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        </div>
      </section>

      <div className="grid gap-5">
        <dl aria-label="Resumo do catálogo" className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-white py-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-line">
          {[
            { label: "Cadastrados", value: products.length, icon: Pill, tone: "text-brand" },
            { label: "Publicados", value: activeProducts, icon: UploadCloud, tone: "text-pharma-green" },
            { label: "Em destaque", value: products.filter((product) => isShowcasePosition(product.featuredPosition)).length, icon: Star, tone: "text-amber-600" },
            { label: "Rascunhos", value: products.filter((product) => product.status === "DRAFT").length, icon: Archive, tone: "text-muted" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div className="min-w-0 px-4 sm:px-5" key={label}>
              <dt className="flex items-center gap-2 text-xs font-semibold text-muted"><Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", tone)} />{label}</dt>
              <dd className="mt-1 pl-6 text-2xl font-black tabular-nums text-ink">{isLoading ? "—" : value}</dd>
            </div>
          ))}
        </dl>
        <Card className="overflow-hidden rounded-xl">
          <CardHeader className="gap-1 border-b border-line px-4 py-4 sm:px-5">
            <CardTitle>Seus produtos</CardTitle>
            <CardDescription>Busque, classifique, edite ou destaque cada item.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div aria-label="Origem dos produtos" role="tablist" className="mb-4 flex gap-1 rounded-xl bg-surface-subtle p-1">
              {([ ["PHARMACY", "Loja física"], ["DISTRIBUTOR", "Distribuidoras"] ] as const).map(([value, label]) => <button role="tab" aria-selected={origin === value} aria-controls="catalog-origin-products" id={`catalog-origin-${value}`} className={cn("min-h-11 flex-1 rounded-lg px-3 text-sm font-bold transition-colors", origin === value ? "bg-white text-brand shadow-sm" : "text-muted hover:text-ink")} key={value} onClick={() => { setOrigin(value); setSelectedIds([]); }} type="button">{label}<span className="ml-2 text-xs tabular-nums opacity-70">{products.filter(product => (product.inventorySource ?? "PHARMACY") === value).length}</span></button>)}
            </div>
            <p className="mb-4 text-xs leading-5 text-muted">{origin === "PHARMACY" ? "Cadastros da loja com estoque físico próprio. Novos produtos continuam com origem definida no cadastro." : "Cadastros de distribuidoras, com preço e disponibilidade vinculados a ofertas válidas. Estoque próprio continua separado."}</p>
            <div role="tabpanel" id="catalog-origin-products" aria-labelledby={`catalog-origin-${origin}`}>
            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line text-sm font-semibold text-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando produtos
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">Nenhum produto cadastrado ainda.</div>
            ) : (
              <div className="grid gap-5">
                <div className="flex flex-wrap gap-2" aria-label="Tipos de produto">
                  {[["", "Todos"], ["MEDICINE", "Medicamentos"], ["CLASS:GENERIC", "Genéricos"], ["CLASS:SIMILAR", "Similares"], ["CLASS:REFERENCE", "Referência"], ["ETHICAL", "Éticos"], ["OTC", "MIP / OTC"], ["PERFUMERY", "Perfumaria"], ["UNCLASSIFIED", "A classificar"]].map(([value, label]) => <button key={value} type="button" aria-pressed={classificationFilter === value} onClick={() => setClassificationFilter(value)} className={cn("min-h-10 rounded-full border px-4 text-xs font-bold transition-colors", classificationFilter === value ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:border-brand/30 hover:text-brand")}>{label}</button>)}
                </div>
                <div className="grid gap-3 rounded-xl bg-surface-subtle p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                  <label className="grid gap-1.5 text-xs font-bold text-muted">
                    Buscar produto
                    <span className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                      <Input className="bg-white pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Nome, marca, SKU ou EAN" value={query} />
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <label className="grid gap-1.5 text-xs font-bold text-muted">Tipo<select className="h-11 min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink" value={classificationFilter} onChange={event => setClassificationFilter(event.target.value)}><option value="">Todos os tipos</option>{Object.entries(catalogKindLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}{Object.entries(medicineClassLabels).filter(([key]) => key !== "UNCLASSIFIED").map(([key,label]) => <option key={key} value={`CLASS:${key}`}>{label}</option>)}<option value="ETHICAL">Ético</option><option value="OTC">MIP / OTC</option></select></label>
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
                    <label className="col-span-2 grid gap-1.5 text-xs font-bold text-muted sm:col-span-1">
                      Classificar por
                      <select className="h-11 min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" onChange={(event) => setSort(event.target.value as ProductCatalogSort)} value={sort}>
                        <option value="newest">Mais recentes</option>
                        <option value="name">Nome A-Z</option>
                        <option value="stock">Menor estoque</option>
                        <option value="price">Menor preço</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 xl:col-span-2">
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
                  <div className="overflow-hidden rounded-xl border border-line">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-subtle px-3 py-2">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-muted"><input aria-label="Selecionar produtos visíveis, até 50" className="h-4 w-4 accent-brand" type="checkbox" checked={allVisibleSelected} ref={element => { if (element) element.indeterminate = visibleSelectedIds.length > 0 && !allVisibleSelected; }} onChange={event => setSelectedIds(event.target.checked ? selectableProducts.map(product => product.id) : [])} />{visibleSelectedIds.length ? `${visibleSelectedIds.length} selecionados` : "Selecionar visíveis"}{visibleProducts.length > BULK_PRODUCT_LIMIT && " · limite 50"}</label>
                      <div className="flex flex-wrap items-center gap-2">{visibleSelectedIds.length > 0 && <Button onClick={() => setSelectedIds([])} size="sm" type="button" variant="ghost">Limpar seleção</Button>}<ProductBulkEditor canManageFinancial={canManageCashback} products={selectedProducts} onSaved={async () => { setSelectedIds([]); await loadProducts(); }} /></div>
                    </div>
                    {visibleProducts.map((product) => {
                      const status = statusInfo[product.status];
                      const isFeatured = isShowcasePosition(product.featuredPosition);
                      const distributor = product.inventorySource === "DISTRIBUTOR";
                      const pricing = product.supplierPricing && Date.parse(product.supplierPricing.validUntil) > Date.now() ? product.supplierPricing : null;
                      const salePrice = distributor ? pricing ? pricing.unitPriceCents / 100 : null : Number(product.promotionalPrice ?? product.price);
                      return (
                        <article className={cn("min-w-0 border-b border-line bg-white px-3 py-2 last:border-b-0", visibleSelectedIds.includes(product.id) && "bg-brand-soft/30")} key={product.id}>
                          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                          <label className="flex min-h-11 w-6 shrink-0 cursor-pointer items-center justify-center"><input aria-label={`Selecionar ${product.name}`} type="checkbox" className="h-4 w-4 accent-brand" checked={visibleSelectedIds.includes(product.id)} disabled={!visibleSelectedIds.includes(product.id) && visibleSelectedIds.length >= BULK_PRODUCT_LIMIT} onChange={() => toggleSelection(product.id)} /></label>
                          <button
                            aria-label={`Editar ${product.name}`}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg text-left transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 sm:gap-3"
                            onClick={() => setEditingProduct(product)}
                            type="button"
                          >
                            {product.imageUrl ? (
                              <Image alt={product.name} className="h-12 w-12 shrink-0 rounded-lg border border-line bg-white object-contain" height={48} src={product.imageUrl} unoptimized width={48} />
                            ) : (
                              <ProductImagePlaceholder {...product} className="h-12 w-12 shrink-0 rounded-lg border border-line bg-white p-0.5" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-sm font-bold leading-5 text-ink">{productDisplayName(product.name)}</span>
                              <span className="mt-0.5 block truncate text-[11px] text-muted">{[product.brand, product.category, product.ean && `EAN ${product.ean}`].filter(Boolean).join(" · ") || "Sem categoria"}</span>
                              <span className="mt-0.5 hidden truncate text-[10px] text-muted sm:block">{classificationLabels(product.catalogClassification).join(" · ")}{product.isPopularPharmacy ? " · Farmácia Popular" : ""}{isFeatured ? ` · Vitrine ${product.featuredPosition}` : ""}</span>
                            </span>
                          </button>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black tabular-nums text-ink">{salePrice === null ? "Indisponível" : formatCurrency(salePrice)}</p>
                            <p className="mt-0.5 text-[10px] text-muted">{distributor ? pricing ? `${pricing.supplier} · ${pricing.demandAllowed ? "quantidade a conferir" : `${pricing.purchaseLimit} disp.`}` : "Sem oferta válida" : `${product.stock} na loja`}</p>
                            <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold", status.className)}>{status.label}</span>
                          </div>
                          </div>
                          <details className="group mt-1 pl-8">
                          <summary aria-label={`Ações de ${product.name}`} className="min-h-8 cursor-pointer text-xs font-semibold leading-8 text-brand marker:text-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Ações e ajuste rápido{canManageCashback && distributor ? ` · acréscimo ${(product.supplierMarkupBps ?? 6000) / 100}%${pricing ? ` · custo ${formatCurrency(pricing.unitCostCents / 100)}` : ""}` : ""}</summary>
                          <div className="grid gap-2 pb-2 pt-1">
                          <ProductQuickControls product={product} canEdit={canManageCashback} onSaved={loadProducts} />
                          <div aria-label={`Ferramentas de ${product.name}`} className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 [&>button]:h-auto [&>button]:min-h-10 [&>button]:whitespace-normal [&>button]:px-2 [&>button]:text-xs" role="group">
                            <ProductMarketingTools product={product} />
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
                            <ProductDeleteButton product={product} onChanged={loadProducts} />
                          </div>
                          </div>
                          </details>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            </div>
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
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:p-0">
          <DialogHeader className="shrink-0 gap-1 border-b border-line px-4 py-4 pr-14 sm:px-6 sm:pr-14">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><PackagePlus className="h-5 w-5" /></span>
              <DialogTitle>Cadastrar produto</DialogTitle>
            </div>
            <DialogDescription>
              Dados, fotos e publicação. Confira antes de salvar.
            </DialogDescription>
          </DialogHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <ProductFormFields
              canManageCashback={canManageCashback}
              canManageShipping={canManageShipping}
              categoryListId="new-product-categories"
              categoryOptions={categoryOptions}
              imagePickerRef={imagePickerRef}
              disabled={isSubmitting}
            />
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <Button disabled={isSubmitting} onClick={() => setIsCreateOpen(false)} type="button" variant="secondary">
                Cancelar
              </Button>
              <Button className="min-h-11 sm:min-w-52" disabled={isSubmitting} type="submit">
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
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:p-0">
          <DialogHeader className="shrink-0 gap-1 border-b border-line px-4 py-4 pr-14 sm:px-6 sm:pr-14">
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>Atualize os dados, a classificacao ou a imagem deste item.</DialogDescription>
          </DialogHeader>
          {editingProduct ? (
            <form className="flex min-h-0 flex-1 flex-col" key={`${editingProduct.id}-${editingProduct.updatedAt}`} onSubmit={handleUpdate}>
              <ProductFormFields
                canManageCashback={canManageCashback}
                canManageShipping={canManageShipping}
                categoryListId="edit-product-categories"
                categoryOptions={categoryOptions}
                imagePickerRef={editImagePickerRef}
                disabled={isUpdating}
                product={editingProduct}
              />
              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <Button disabled={isUpdating} onClick={() => setEditingProduct(null)} type="button" variant="secondary">Cancelar</Button>
                <Button className="min-h-11 sm:min-w-52" disabled={isUpdating} type="submit">
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
