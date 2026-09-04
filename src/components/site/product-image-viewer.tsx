"use client";

import Image from "next/image";
import { Expand, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProductImageViewer({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  if (!imageUrl) {
    return (
      <div className="flex aspect-square max-h-[36rem] items-center justify-center border border-line bg-white text-muted">
        <ImageIcon className="h-16 w-16" aria-hidden="true" />
        <span className="sr-only">Produto sem imagem cadastrada</span>
      </div>
    );
  }

  return (
    <Dialog>
      <div className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
        <div className="order-2 sm:order-1">
          <div className="flex aspect-square items-center justify-center border-2 border-brand bg-white p-2">
            <Image alt="" className="h-full w-full object-contain" height={96} src={imageUrl} unoptimized width={96} />
          </div>
        </div>
        <DialogTrigger asChild>
          <button
            aria-label={`Ampliar imagem de ${name}`}
            className="group relative order-1 flex aspect-square max-h-[36rem] w-full items-center justify-center overflow-hidden border border-line bg-white p-6 transition hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:order-2 lg:p-10"
            type="button"
          >
            <Image
              alt={name}
              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
              height={760}
              priority
              src={imageUrl}
              unoptimized
              width={760}
            />
            <span className="absolute bottom-4 right-4 inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-xs font-black text-ink shadow-sm">
              <Expand className="h-4 w-4" aria-hidden="true" />
              Ampliar
            </span>
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Imagem ampliada do produto.</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[75vh] min-h-[20rem] items-center justify-center bg-white p-4 sm:p-8">
          <Image alt={name} className="max-h-[68vh] w-full object-contain" height={1200} src={imageUrl} unoptimized width={1200} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
