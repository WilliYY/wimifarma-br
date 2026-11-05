import { catalogFilterHref } from "@/features/products/catalog-navigation";
import { productSearchHref } from "@/features/products/public-search";

export type HomeMediaItem = {
  id: string;
  kind: "video" | "gif";
  title: string;
  caption: string;
  src: string;
  poster: string;
  href: string;
  action: string;
  background?: string;
};

// GIFs supplied by the store are delivered as silent MP4 loops to reduce decoding and transfer costs.
// Add new clips here; the gallery keeps the same 3:4 frame without cropping the original artwork.
export const homeMediaItems: HomeMediaItem[] = [
  {
    id: "wimi-b-complex", kind: "video", title: "Wimi B Complex", caption: "Vitaminas e suplementos",
    src: "/media/home/wimi-b-complex.mp4", poster: "/media/home/wimi-b-complex.webp", background: "#970309",
    href: catalogFilterHref("/catalogo", { grupo: "vitamins", ordem: "preco-asc" }), action: "Ver vitaminas e suplementos",
  },
  {
    id: "wimilab-creme-maos", kind: "video", title: "WimiLab · Creme para mãos", caption: "Seu momento de cuidado",
    src: "/media/home/wimilab-creme-maos.mp4", poster: "/media/home/wimilab-creme-maos.webp", background: "#faf5f5",
    href: "/catalogo?grupo=beauty", action: "Ver cuidados para as mãos",
  },
  {
    id: "dove-sabonete", kind: "video", title: "Dove Original", caption: "Sabonete · 90 g",
    src: "/media/home/dove-sabonete.mp4", poster: "/media/home/dove-sabonete.webp",
    href: productSearchHref("sabonete Dove 90g"), action: "Buscar sabonetes Dove",
  },
  {
    id: "nivea-latinha", kind: "video", title: "NIVEA Creme", caption: "A clássica latinha azul · 56 g",
    src: "/media/home/nivea-latinha.mp4", poster: "/media/home/nivea-latinha.webp",
    href: productSearchHref("Nivea Creme 56g"), action: "Buscar NIVEA Creme",
  },
  {
    id: "gel-limpeza", kind: "video", title: "Principia GL-01", caption: "Gel de limpeza · 350 g",
    src: "/media/home/gel-limpeza.mp4", poster: "/media/home/gel-limpeza.webp",
    href: productSearchHref("Principia GL01"), action: "Buscar gel de limpeza Principia",
  },
  {
    id: "principia-serum", kind: "video", title: "Principia NC-10", caption: "Sérum · 30 ml",
    src: "/media/home/principia-serum.mp4", poster: "/media/home/principia-serum.webp",
    href: productSearchHref("Principia NC10"), action: "Buscar sérum Principia",
  },
];
