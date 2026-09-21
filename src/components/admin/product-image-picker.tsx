"use client";

import {
  ChangeEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  Check,
  Images,
  ImagePlus,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ProductImageEditor } from "@/components/admin/product-image-editor";
import { ProductPhotoSuggestions, type PhotoSource } from "@/components/admin/product-photo-suggestions";
import type { PhotoIdentity } from "@/features/product-images/suggestion-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ImageMode = "library" | "upload";

export type ProductImage = {
  backgroundRemoved: boolean;
  createdAt: string;
  height: number;
  id: string;
  originalName: string;
  sizeBytes: number;
  url: string;
  usageCount: number;
  width: number;
};

export type ProductImagePickerHandle = {
  refresh: () => Promise<void>;
  reset: () => void;
  resolveImage: (options?: { optional?: boolean }) => Promise<ProductImage | null | undefined>;
};

type ProductImagePickerProps = {
  identity?: PhotoIdentity;
  initialImageAssetId?: string | null;
  initialImageUrl?: string | null;
  disabled?: boolean;
};

function errorMessage(error: unknown, fallback: string) {
  return typeof error === "string" ? error : fallback;
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return "Arquivo existente";
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

export const ProductImagePicker = forwardRef<ProductImagePickerHandle, ProductImagePickerProps>(
  function ProductImagePicker({ initialImageAssetId, initialImageUrl, identity, disabled = false }: ProductImagePickerProps, ref) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const uploadPromise = useRef<Promise<ProductImage> | null>(null);
    const [hasChosenImage, setHasChosenImage] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [failedImages, setFailedImages] = useState<string[]>([]);
    const [images, setImages] = useState<ProductImage[]>([]);
    const [imageMode, setImageMode] = useState<ImageMode>("upload");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [editorSource, setEditorSource] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [suggestionSource, setSuggestionSource] = useState<PhotoSource | null>(null);
    const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
    const [imageSearch, setImageSearch] = useState("");
    const [removeBackground, setRemoveBackground] = useState(false);
    const [backgroundRemovalAvailable, setBackgroundRemovalAvailable] = useState(false);
    const [isLibraryLoading, setIsLibraryLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isPreparingLibraryImage, setIsPreparingLibraryImage] = useState(false);
    const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

    const loadImages = useCallback(async () => {
      try {
        setIsLibraryLoading(true);
        const response = await fetch("/api/admin/imagens-produtos", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: ProductImage[];
          error?: unknown;
          meta?: { backgroundRemovalAvailable?: boolean };
        };

        if (!response.ok) {
          throw new Error(errorMessage(payload.error, "Nao foi possivel carregar a biblioteca."));
        }

        setImages(payload.data ?? []);
        setBackgroundRemovalAvailable(Boolean(payload.meta?.backgroundRemovalAvailable));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar a biblioteca.");
      } finally {
        setIsLibraryLoading(false);
      }
    }, []);

    useEffect(() => {
      void loadImages();
    }, [loadImages]);

    useEffect(() => {
      if (!initialImageAssetId || hasChosenImage || selectedFile || selectedImage) return;

      const initialImage = images.find((image) => image.id === initialImageAssetId);
      if (initialImage) {
        setSelectedImage(initialImage);
        setImageMode("library");
      }
    }, [images, initialImageAssetId, selectedFile, selectedImage, hasChosenImage]);

    useEffect(() => {
      return () => {
        if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
      };
    }, [imagePreview]);

    useEffect(() => {
      return () => {
        if (editorSource?.startsWith("blob:")) URL.revokeObjectURL(editorSource);
      };
    }, [editorSource]);

    const clearPreview = useCallback(() => {
      setImagePreview(null);
      setEditorSource(null);
      setSelectedFile(null);
      setIsEditorOpen(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }, []);

    const reset = useCallback(() => {
      clearPreview();
      setSelectedImage(null);
      setRemoveBackground(false);
      setImageMode("upload");
      setImageSearch("");
      setHasChosenImage(true);
      setSuggestionSource(null);
    }, [clearPreview]);

    const uploadImage = useCallback(async (file: File) => {
      const formData = new FormData();
      formData.set("image", file);
      formData.set("removeBackground", String(removeBackground));

      const response = await fetch("/api/admin/uploads/produtos", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { data?: ProductImage; error?: unknown };

      if (!response.ok || !payload.data?.url) {
        throw new Error(errorMessage(payload.error, "Nao foi possivel otimizar a imagem."));
      }

      const uploaded = { ...payload.data, usageCount: 0 };
      setImages((current) => [uploaded, ...current]);
      clearPreview();
      setSelectedImage(uploaded);
      setHasChosenImage(true);
      setImageMode("library");
      setRemoveBackground(false);
      return uploaded;
    }, [removeBackground, clearPreview]);

    const processSelection = useCallback(async () => {
      if (uploadPromise.current) return uploadPromise.current;
      if (!selectedFile) return selectedImage;
      setIsProcessing(true);
      uploadPromise.current = uploadImage(selectedFile);
      try { return await uploadPromise.current; }
      finally { uploadPromise.current = null; setIsProcessing(false); }
    }, [selectedFile, selectedImage, uploadImage]);

    useImperativeHandle(ref, () => ({
      refresh: loadImages,
      reset,
      resolveImage: async (options) => {
        if (selectedFile || uploadPromise.current) return processSelection();
        if (selectedImage) return selectedImage;
        if (options?.optional) return hasChosenImage ? null : undefined;
        throw new Error("Envie uma foto ou escolha uma imagem da biblioteca.");
      },
    }), [loadImages, reset, selectedFile, selectedImage, processSelection, hasChosenImage]);

    const filteredImages = useMemo(() => {
      const query = imageSearch.trim().toLocaleLowerCase("pt-BR");
      if (!query) return images;
      return images.filter((image) =>
        image.originalName.toLocaleLowerCase("pt-BR").includes(query),
      );
    }, [imageSearch, images]);

    function prepareFile(file: File, openEditor = false) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) {
        toast.error("Use JPG, PNG, WebP ou AVIF de ate 10 MB.");
        return;
      }
      setHasChosenImage(true);
      setImageMode("upload");
      setSelectedImage(null);
      setSelectedFile(file);
      setSuggestionSource({ file });
      setImagePreview(URL.createObjectURL(file));
      setEditorSource(URL.createObjectURL(file));
      setIsEditorOpen(openEditor);
    }

    function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0] ?? null;
      event.target.value = "";
      if (file) {
        prepareFile(file);
      }
    }

    function selectLibraryImage(image: ProductImage) {
      clearPreview();
      setSelectedImage(image);
      setHasChosenImage(true);
      setSuggestionSource({ url: image.url, name: image.originalName });
    }

    async function adjustLibraryImage() {
      if (!selectedImage) return;

      try {
        setIsPreparingLibraryImage(true);
        const response = await fetch(selectedImage.url, { cache: "no-store" });
        if (!response.ok) throw new Error("Nao foi possivel abrir a imagem da biblioteca.");

        const blob = await response.blob();
        const file = new File([blob], selectedImage.originalName, {
          lastModified: Date.now(),
          type: blob.type || "image/webp",
        });
        setImageMode("upload");
        prepareFile(file, true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel ajustar a imagem.");
      } finally {
        setIsPreparingLibraryImage(false);
      }
    }

    async function deleteImage(image: ProductImage) {
      if (image.usageCount > 0 || !window.confirm(`Excluir "${image.originalName}" da biblioteca?`)) {
        return;
      }

      try {
        setDeletingImageId(image.id);
        const response = await fetch(`/api/admin/imagens-produtos/${image.id}`, {
          method: "DELETE",
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
        if (!response.ok) {
          throw new Error(errorMessage(payload.error, "Nao foi possivel excluir a imagem."));
        }

        setImages((current) => current.filter((item) => item.id !== image.id));
        if (selectedImage?.id === image.id) setSelectedImage(null);
        toast.success("Imagem excluida da biblioteca.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel excluir a imagem.");
      } finally {
        setDeletingImageId(null);
      }
    }

    return (
      <fieldset className="grid min-w-0 grid-cols-1 gap-3" disabled={disabled || isProcessing}>
        <input accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Arquivo da foto do produto" className="sr-only" onChange={handleImageChange} ref={imageInputRef} tabIndex={-1} type="file" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Imagem do produto</span>
          <div className="flex items-center gap-2"><Badge variant="muted">{images.length} na biblioteca</Badge>
          {(selectedFile || selectedImage || (!hasChosenImage && initialImageUrl)) && <Button aria-label="Retirar foto do produto" onClick={reset} size="icon" title="Retirar foto do produto (preserva a biblioteca)" type="button" variant="ghost"><X className="h-4 w-4" /></Button>}</div>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-subtle p-1">
          <Button
            className="w-full"
            onClick={() => {
              imageInputRef.current?.click();
            }}
            size="sm"
            type="button"
            variant={imageMode === "upload" ? "default" : "ghost"}
          >
            <Upload className="h-4 w-4" />
            Nova foto
          </Button>
          <Button
            className="w-full"
            onClick={() => {
              setImageMode("library");
            }}
            size="sm"
            type="button"
            variant={imageMode === "library" ? "default" : "ghost"}
          >
            <Images className="h-4 w-4" />
            Biblioteca
          </Button>
        </div>

        {imageMode === "upload" ? (
          <div className="grid min-w-0 grid-cols-1 gap-3">
            <Button className="justify-start border-dashed" onClick={() => imageInputRef.current?.click()} type="button" variant="secondary"><Upload className="h-4 w-4" />Escolher arquivo<span className="min-w-0 truncate text-xs font-normal text-muted">{selectedFile?.name ?? "JPG, PNG, WebP ou AVIF"}</span></Button>
            <label
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-md border px-3 py-3 text-sm font-bold",
                backgroundRemovalAvailable
                  ? "cursor-pointer border-brand/20 bg-brand-soft text-ink"
                  : "cursor-not-allowed border-line bg-surface-subtle text-muted",
              )}
              title={backgroundRemovalAvailable ? undefined : "Servico de remocao de fundo nao configurado no servidor"}
            >
              <input
                checked={removeBackground}
                className="h-4 w-4 accent-brand"
                disabled={!backgroundRemovalAvailable}
                onChange={(event) => setRemoveBackground(event.target.checked)}
                type="checkbox"
              />
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="min-w-0 flex-1">Remover fundo com IA</span>
              <Badge variant="muted">
                {backgroundRemovalAvailable ? "Fundo branco" : "Configurar"}
              </Badge>
            </label>
            {imagePreview || (!hasChosenImage && initialImageUrl) ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface-subtle p-3">
                <Image alt="Previa da imagem do produto" className="h-24 w-24 shrink-0 rounded-md border border-line bg-white object-contain" height={96} src={imagePreview || initialImageUrl!} unoptimized width={96} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">Pronta para otimizar</p>
                  <p className="mt-1 text-xs font-semibold text-muted">WebP com compressao inteligente</p>
                </div>
                <Button disabled={!selectedFile || isProcessing} onClick={() => setIsEditorOpen(true)} size="sm" type="button" variant="secondary">
                  <SlidersHorizontal className="h-4 w-4" />
                  Ajustar foto
                </Button>
                {selectedFile && <Button disabled={isProcessing} onClick={() => void processSelection().catch(error => toast.error(error instanceof Error ? error.message : "Nao foi possivel tratar a foto."))} size="sm" type="button"><Sparkles className="h-4 w-4" />{removeBackground ? "Tratar fundo" : "Otimizar foto"}</Button>}
              </div>
            ) : (
              <div className="flex min-h-20 items-center gap-3 rounded-md border border-dashed border-line px-3 py-4 text-sm font-semibold text-muted">
                <ImagePlus className="h-5 w-5 shrink-0 text-brand" />
                JPG, PNG, WebP ou AVIF de ate 10 MB
              </div>
            )}
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-3">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input className="pl-9" onChange={(event) => setImageSearch(event.target.value)} placeholder="Buscar pelo nome" value={imageSearch} />
            </label>
            {isLibraryLoading ? (
              <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-line text-sm font-semibold text-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando imagens
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-line px-4 text-center text-sm font-semibold text-muted">Nenhuma imagem encontrada.</div>
            ) : (
              <div className="grid max-h-[430px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                {filteredImages.map((image) => {
                  const isSelected = selectedImage?.id === image.id;
                  return (
                    <div className="relative min-w-0" key={image.id}>
                      <button
                        className={cn(
                          "grid w-full cursor-pointer overflow-hidden rounded-md border bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          isSelected ? "border-brand ring-2 ring-brand/15" : "border-line hover:border-brand/50",
                        )}
                        onClick={() => selectLibraryImage(image)}
                        type="button"
                      >
                        <span className="relative flex aspect-square items-center justify-center bg-surface-subtle p-2">
                          {failedImages.includes(image.id) ? <span className="px-2 text-center text-xs text-muted">Foto indisponivel</span> : <Image alt={image.originalName} className="h-full w-full object-contain" height={150} onError={() => setFailedImages(current => [...current, image.id])} src={image.url} unoptimized width={150} />}
                          {isSelected ? (
                            <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"><Check className="h-4 w-4" /></span>
                          ) : null}
                          {image.backgroundRemoved ? (
                            <span className="absolute bottom-2 left-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold text-brand shadow-sm">Fundo tratado</span>
                          ) : null}
                        </span>
                        <span className="min-w-0 p-2">
                          <span className="block truncate text-xs font-bold text-ink" title={image.originalName}>{image.originalName}</span>
                          <span className="mt-1 block text-[11px] font-semibold text-muted">
                            {image.width > 0 ? `${image.width} x ${image.height} - ` : ""}{formatFileSize(image.sizeBytes)}
                          </span>
                        </span>
                      </button>
                      {image.usageCount === 0 ? (
                        <button
                          aria-label={`Excluir ${image.originalName}`}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-muted shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-50"
                          disabled={deletingImageId === image.id}
                          onClick={() => void deleteImage(image)}
                          title="Excluir da biblioteca"
                          type="button"
                        >
                          {deletingImageId === image.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {selectedImage ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface-subtle p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{selectedImage.originalName}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">Selecionada para reutilizar sem alteracoes</p>
                </div>
                <Button disabled={isPreparingLibraryImage} onClick={() => void adjustLibraryImage()} size="sm" type="button" variant="secondary">
                  {isPreparingLibraryImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
                  Ajustar uma copia
                </Button>
              </div>
            ) : null}
          </div>
        )}
        {suggestionSource && identity && <ProductPhotoSuggestions disabled={disabled || isProcessing} identity={identity} onChoose={(file) => {
          setHasChosenImage(true); setSelectedImage(null); setSelectedFile(file); setImageMode("upload"); setRemoveBackground(false);
          setImagePreview(URL.createObjectURL(file)); setEditorSource(URL.createObjectURL(file));
        }} source={suggestionSource} />}
        <ProductImageEditor
          onApply={(file) => {
            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
          }}
          onOpenChange={setIsEditorOpen}
          open={isEditorOpen}
          originalName={selectedFile?.name ?? "produto.webp"}
          source={editorSource}
        />
        {isProcessing && <p className="flex items-center gap-2 text-sm font-semibold text-brand" role="status"><Loader2 className="h-4 w-4 animate-spin" />{removeBackground ? "Tratando fundo e otimizando..." : "Otimizando foto..."}</p>}
      </fieldset>
    );
  },
);
