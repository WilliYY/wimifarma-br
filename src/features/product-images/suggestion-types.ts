import type { ProductType } from "../products/product-types";

export type PhotoIdentity = { name: string; brand: string; ean: string };
export type PhotoAnalysis = {
  name: string | null; brand: string | null; ean: string | null; productType: ProductType;
  identityMatch: "compatible" | "uncertain" | "conflict";
  visibleView: "front" | "back" | "side" | "other"; summary: string; warnings: string[];
};
export type ImageCandidate = {
  id: string; label: string; kind: "real" | "generated";
  view: "front" | "back" | "side" | "other"; previewDataUrl: string;
  width: number; height: number; sourceUrl?: string;
};
export type PhotoSuggestions = { analysis: PhotoAnalysis; candidates: ImageCandidate[]; warnings: string[] };
