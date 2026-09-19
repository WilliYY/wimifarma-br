"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { Expand, ImageIcon, Minus, Plus, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProductImageViewer({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const centerImage = () => {
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
      viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
    };
    // The dialog portal and image can finish sizing after the parent commits.
    const observer = new ResizeObserver(centerImage);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    centerImage();
    return () => observer.disconnect();
  }, [zoom]);
  if (!imageUrl || failed) {
    return (
      <div className="flex aspect-square max-h-[32rem] flex-col items-center justify-center gap-4 rounded-3xl border border-line bg-white text-muted">
        <ImageIcon className="h-16 w-16" aria-hidden="true" />
        <span className="text-sm font-semibold">Imagem indisponível</span>
      </div>
    );
  }

  return (
    <Dialog onOpenChange={() => setZoom(1)}>
      <div className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 text-xs font-semibold text-muted">
          <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" aria-hidden="true" />Imagem do produto</span>
          <span>1 imagem</span>
        </div>
        <DialogTrigger asChild>
          <button
            aria-label={`Ampliar imagem de ${name}`}
            className="group relative flex aspect-square max-h-[32rem] w-full cursor-zoom-in items-center justify-center overflow-hidden bg-white p-8 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:p-12"
            type="button"
          >
            <Image
              alt={name}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
              height={760}
              priority
              onError={() => setFailed(true)}
              src={imageUrl}
              unoptimized
              width={760}
            />
            <span className="absolute bottom-4 right-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-xs font-bold text-ink shadow-sm">
              <Expand className="h-4 w-4" aria-hidden="true" />
              Ampliar foto
            </span>
          </button>
        </DialogTrigger>
        <p className="border-t border-line px-5 py-3 text-center text-xs leading-5 text-muted">A embalagem pode variar conforme o lote do fabricante.</p>
      </div>

      <DialogContent className="max-w-4xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Amplie para ver os detalhes. Use a rolagem para explorar a imagem ampliada.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-2" aria-label="Controles de ampliação">
          <button aria-label="Reduzir imagem" className="flex h-11 w-11 items-center justify-center rounded-full border border-line focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))} type="button"><Minus className="h-4 w-4" aria-hidden="true" /></button>
          <span aria-live="polite" className="flex w-16 items-center justify-center text-sm font-bold tabular-nums">{zoom * 100}%</span>
          <button aria-label="Ampliar imagem" className="flex h-11 w-11 items-center justify-center rounded-full border border-line focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40" disabled={zoom >= 2} onClick={() => setZoom(Math.min(2, zoom + 0.5))} type="button"><Plus className="h-4 w-4" aria-hidden="true" /></button>
          <button aria-label="Restaurar tamanho da imagem" className="flex h-11 w-11 items-center justify-center rounded-full border border-line focus-visible:ring-2 focus-visible:ring-brand" onClick={() => setZoom(1)} type="button"><RotateCcw className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        <div className="h-[min(55dvh,32rem)] overflow-auto rounded-xl border border-line bg-white focus-visible:outline-brand" ref={viewportRef} data-lenis-prevent tabIndex={0} role="region" aria-label="Imagem ampliada do produto">
          <div className="flex items-center justify-center p-4" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}><Image alt={name} className="h-full w-full object-contain" height={1200} src={imageUrl} unoptimized width={1200} /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
