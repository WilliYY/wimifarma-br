"use client";

import Image from "next/image";
import { createContext, useContext, useState, type ReactNode } from "react";
import { productImageAlt } from "@/features/products/image-placeholder";

const PreviewContext = createContext({ requested: false, active: false });

/** Preserve the article root used by product grids and draggable rails. */
export function ProductCardSurface({ children, className, alternateImageUrl, variant }: {
  children: ReactNode;
  className: string;
  alternateImageUrl?: string;
  variant?: "medicine-rail";
}) {
  const [requested, setRequested] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <PreviewContext.Provider value={{ requested, active }}>
      <article className={className} data-product-variant={variant}
        onPointerEnter={alternateImageUrl ? event => {
          if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
          setRequested(true);
          setActive(true);
        } : undefined}
        onPointerLeave={alternateImageUrl ? () => setActive(false) : undefined}
        onPointerCancel={alternateImageUrl ? () => setActive(false) : undefined}
      >{children}</article>
    </PreviewContext.Provider>
  );
}

export function ProductCardImage({ imageUrl, alternateImageUrl, name, size }: {
  imageUrl: string;
  alternateImageUrl?: string;
  name: string;
  size: number;
}) {
  const { requested, active } = useContext(PreviewContext);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showAlternate = active && loaded && !failed;
  return (
    <span style={{ position: "relative", display: "block", width: "100%", height: "100%" }}>
      <Image alt={productImageAlt(name, imageUrl)} className="h-full w-full object-contain"
        height={size} src={imageUrl} width={size} style={{ opacity: showAlternate ? 0 : 1 }} />
      {requested && alternateImageUrl && !failed ? (
        <Image alt="" aria-hidden="true" className="h-full w-full object-contain" height={size} width={size}
          src={alternateImageUrl} loading="eager" onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
          style={{ position: "absolute", inset: 0, opacity: showAlternate ? 1 : 0, pointerEvents: "none" }} />
      ) : null}
    </span>
  );
}
