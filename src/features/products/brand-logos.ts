import { normalizeProductSearch } from "./public-search";

// Official assets identify brands already present in the public catalog.
// Brands without a checked logo appear by name, never by a product photo.
const logos: Record<string, { src: string; dark?: boolean }> = {
  nivea: { src: "/brands/nivea.webp" },
  dove: { src: "/brands/dove.webp" },
  vichy: { src: "/brands/vichy.webp" },
  "la roche posay": { src: "/brands/la-roche-posay.webp" },
  cerave: { src: "/brands/cerave.webp" },
  "l oreal paris": { src: "/brands/loreal-paris.webp" },
  "johnson s": { src: "/brands/johnsons.webp" },
  "johnson s baby": { src: "/brands/johnsons.webp" },
  pampers: { src: "/brands/pampers.webp" },
  huggies: { src: "/brands/huggies.webp" },
  "huppy baby": { src: "/brands/huppy-baby.webp" },
  intimus: { src: "/brands/intimus.webp" },
  kitkat: { src: "/brands/kitkat.webp" },
  "kit kat": { src: "/brands/kitkat.webp" },
  isdin: { src: "/brands/isdin.webp" },
  ems: { src: "/brands/ems.webp" },
  teuto: { src: "/brands/teuto.webp", dark: true },
  germed: { src: "/brands/germed.webp", dark: true },
  sandoz: { src: "/brands/sandoz.webp" },
  ache: { src: "/brands/ache.webp" },
  althaia: { src: "/brands/althaia.webp" },
  biolab: { src: "/brands/biolab.webp" },
  biosintetica: { src: "/brands/biosintetica.webp" },
  cimed: { src: "/brands/cimed.webp" },
  geolab: { src: "/brands/geolab.webp" },
  legrand: { src: "/brands/legrand.webp", dark: true },
  medley: { src: "/brands/medley.webp" },
  medquimica: { src: "/brands/medquimica.webp", dark: true },
  momenta: { src: "/brands/momenta.webp" },
  "nova quimica": { src: "/brands/nova-quimica.webp" },
  organon: { src: "/brands/organon.webp" },
  pharlab: { src: "/brands/pharlab.webp" },
  torrent: { src: "/brands/torrent.webp" },
  clear: { src: "/brands/clear.webp", dark: true },
  ducray: { src: "/brands/ducray.webp" },
  neutrogena: { src: "/brands/neutrogena.webp" },
};

export function brandLogo(name: string) {
  const key = normalizeProductSearch(name);
  return Object.hasOwn(logos, key) ? logos[key] : null;
}

// Presentation order only; the catalog determines which brands exist.
export const featuredBrandNames = ["nivea", "dove", "vichy", "la roche posay", "ems", "cerave", "l oreal paris", "isdin", "teuto", "germed", "sandoz"];
