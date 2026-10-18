/** Compact presentation only. Keep the registered name for identity, search and orders. */
export function productDisplayName(name: string) {
  const match = /^(?:(Aradois|Corus)\s+)?Losartana(?:\s+Pot[aá]ssica)?\s+(\d+(?:[.,]\d+)?)\s*mg\s+(?:c\/\s*)?(\d+)\s+comprimidos?(?:\s+revestidos?)?(?:\s+(Biosint[eé]tica|Germed|Medley|Nova Qu[ií]mica|EMS|Geolab|Sandoz|Teuto))?$/iu.exec(name.trim());
  if (!match) return name;
  const [, reference, dose, quantity, brand] = match;
  return `${reference ?? "Losartana"} ${dose} mg · ${quantity} comprimidos${brand ? ` · ${brand}` : ""}`;
}
