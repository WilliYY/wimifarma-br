import { catalogFilterHref } from "@/features/products/catalog-navigation";

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
  continuousPreview?: boolean;
};

// The two original six-frame GIFs use lossless animated WebP previews; other clips use silent MP4.
// Portrait media and complete product artwork fit inside the same 3:4 frames without cropping.
export const homeMediaItems: HomeMediaItem[] = [
  {
    id: "wimi-b-complex", kind: "gif", continuousPreview: true, title: "Wimi B Complex", caption: "Vitaminas e suplementos",
    src: "/media/home/wimi-b-complex-loop-v2.webp", poster: "/media/home/wimi-b-complex.webp", background: "#970309",
    href: catalogFilterHref("/catalogo", { grupo: "vitamins" }), action: "Ver vitaminas e suplementos",
  },
  {
    id: "wimilab-creme-maos", kind: "gif", continuousPreview: true, title: "WimiLab · Creme para mãos", caption: "Seu momento de cuidado",
    src: "/media/home/wimilab-creme-maos-loop-v2.webp", poster: "/media/home/wimilab-creme-maos.webp", background: "#faf5f5",
    href: catalogFilterHref("/catalogo", { grupo: "beauty" }), action: "Ver perfumaria e cuidados pessoais",
  },
  {
    id: "wimifarma-institucional", kind: "video", title: "Conte com a Wimifarma", caption: "Cuidado de perto, todos os dias",
    src: "/media/home/wimifarma-institucional-contact-v4.mp4", poster: "/media/home/wimifarma-institucional-contact-v4.webp", background: "#eef3f1",
    href: catalogFilterHref("/catalogo", { grupo: "medicines" }), action: "Ver medicamentos",
  },
  {
    id: "dove-sabonete", kind: "video", title: "Dove Original", caption: "Sabonete · 90 g",
    src: "/media/home/dove-sabonete.mp4", poster: "/media/home/dove-sabonete.webp",
    href: catalogFilterHref("/catalogo", { grupo: "beauty", assunto: "bath" }), action: "Ver sabonetes e banho",
  },
  {
    id: "nivea-latinha", kind: "video", title: "NIVEA Creme", caption: "A clássica latinha azul · 56 g",
    src: "/media/home/nivea-latinha.mp4", poster: "/media/home/nivea-latinha.webp",
    href: catalogFilterHref("/catalogo", { grupo: "beauty" }), action: "Ver perfumaria e cuidados pessoais",
  },
  {
    id: "gel-limpeza", kind: "video", title: "Principia GL-01", caption: "Gel de limpeza · 350 g",
    src: "/media/home/gel-limpeza.mp4", poster: "/media/home/gel-limpeza.webp",
    href: catalogFilterHref("/catalogo", { grupo: "dermo" }), action: "Ver cuidados com a pele",
  },
  {
    id: "principia-serum", kind: "video", title: "Principia NC-10", caption: "Sérum · 30 ml",
    src: "/media/home/principia-serum.mp4", poster: "/media/home/principia-serum.webp",
    href: catalogFilterHref("/catalogo", { grupo: "dermo", assunto: "face" }), action: "Ver cuidados com o rosto",
  },
  {
    id: "vichy-mineral89", kind: "video", title: "Vichy Minéral 89", caption: "Cuidados com o rosto",
    src: "/media/home/vichy-mineral89.mp4", poster: "/media/home/vichy-mineral89.webp", background: "#effbff",
    href: catalogFilterHref("/catalogo", { grupo: "dermo", assunto: "face" }), action: "Ver cuidados com o rosto",
  },
  {
    id: "ritual-beleza", kind: "video", title: "Seu ritual de beleza", caption: "Perfumaria e autocuidado",
    src: "/media/home/ritual-beleza.mp4", poster: "/media/home/ritual-beleza.webp", background: "#f3e7df",
    href: catalogFilterHref("/catalogo", { grupo: "beauty" }), action: "Ver perfumaria e cuidados pessoais",
  },
];
