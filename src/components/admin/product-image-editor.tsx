"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Crop, Loader2, RotateCcw, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropProductImage } from "@/lib/crop-product-image";

type ProductImageEditorProps = {
  onApply: (file: File) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  originalName: string;
  source: string | null;
};

const INITIAL_CROP: Point = { x: 0, y: 0 };

export function ProductImageEditor({
  onApply,
  onOpenChange,
  open,
  originalName,
  source,
}: ProductImageEditorProps) {
  const [crop, setCrop] = useState<Point>(INITIAL_CROP);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const reset = useCallback(() => {
    setCrop(INITIAL_CROP);
    setZoom(1);
    setRotation(0);
    setCroppedArea(null);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset, source]);

  async function applyAdjustment() {
    if (!source || !croppedArea) return;

    try {
      setIsApplying(true);
      const file = await cropProductImage(source, croppedArea, rotation, originalName);
      onApply(file);
      onOpenChange(false);
      toast.success("Foto ajustada. A original continua preservada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel ajustar a foto.");
    } finally {
      setIsApplying(false);
    }
  }

  function rotateBy(degrees: number) {
    setRotation((value) => ((value + degrees + 540) % 360) - 180);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar foto do produto</DialogTitle>
          <DialogDescription>
            Arraste para enquadrar. A nova copia sera quadrada, em WebP e com fundo branco.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square max-h-[54dvh] w-full overflow-hidden rounded-md bg-[#eef0f3] sm:aspect-[4/3]">
          {source ? (
            <Cropper
              aspect={1}
              crop={crop}
              image={source}
              objectFit="contain"
              onCropChange={setCrop}
              onCropComplete={(_area, areaPixels) => setCroppedArea(areaPixels)}
              onRotationChange={setRotation}
              onZoomChange={setZoom}
              rotation={rotation}
              showGrid
              zoom={zoom}
            />
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-ink">
            <span className="flex items-center justify-between gap-3">
              Zoom
              <span className="text-xs text-muted">{zoom.toFixed(1)}x</span>
            </span>
            <input
              aria-label="Zoom da foto"
              className="h-2 w-full cursor-pointer accent-brand"
              max="3"
              min="1"
              onChange={(event) => setZoom(Number(event.target.value))}
              step="0.05"
              type="range"
              value={zoom}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink">
            <span className="flex items-center justify-between gap-3">
              Rotacao
              <span className="text-xs text-muted">{rotation} graus</span>
            </span>
            <input
              aria-label="Rotacao da foto"
              className="h-2 w-full cursor-pointer accent-brand"
              max="180"
              min="-180"
              onChange={(event) => setRotation(Number(event.target.value))}
              step="1"
              type="range"
              value={rotation}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button aria-label="Girar para a esquerda" onClick={() => rotateBy(-90)} size="icon" title="Girar para a esquerda" type="button" variant="secondary">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button aria-label="Girar para a direita" onClick={() => rotateBy(90)} size="icon" title="Girar para a direita" type="button" variant="secondary">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button onClick={reset} size="sm" type="button" variant="ghost">
            Restaurar
          </Button>
          <div className="ml-auto flex w-full gap-2 sm:w-auto">
            <Button className="flex-1 sm:flex-none" disabled={isApplying} onClick={() => onOpenChange(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button className="flex-1 sm:flex-none" disabled={!croppedArea || isApplying} onClick={() => void applyAdjustment()} type="button">
              {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
              Aplicar ajuste
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
