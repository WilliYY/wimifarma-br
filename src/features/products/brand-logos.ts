import { normalizeProductSearch } from "./public-search";

// Official assets identify brands already present in the public catalog.
// New brands are still shown by name when no checked logo is available.
const logos: Record<string, { src: string; dark?: boolean }> = {
  nivea: { src: "/brands/nivea.webp" },
  dove: { src: "/brands/dove.webp" },
  vichy: { src: "/brands/vichy.webp" },
  "la roche posay": { src: "/brands/la-roche-posay.webp" },
  cerave: { src: "/brands/cerave.webp" },
  "l oreal paris": { src: "/brands/loreal-paris.webp" },
  isdin: { src: "/brands/isdin.webp" },
  ems: { src: "/brands/ems.webp" },
  teuto: { src: "/brands/teuto.webp", dark: true },
  germed: { src: "/brands/germed.webp", dark: true },
  sandoz: { src: "/brands/sandoz.webp" },
};

export function brandLogo(name: string) {
  const key = normalizeProductSearch(name);
  return Object.hasOwn(logos, key) ? logos[key] : null;
}

// Presentation order only; the catalog determines which brands exist.
export const featuredBrandNames = ["nivea", "dove", "vichy", "la roche posay", "ems", "cerave", "l oreal paris", "isdin", "teuto", "germed", "sandoz"];
