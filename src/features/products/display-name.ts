/** Compact presentation only. Keep the registered name for identity, search and orders. */
export function productTitleBrand(name: string, brand?: string | null) {
  let label = brand?.trim().replace(/\s+/g, " ");
  if (!label) return null;
  let previousLabel;
  do {
    previousLabel = label;
    label = label
      .replace(/\s+(?:s\.?\s*[/ .]?\s*a\.?|ltda\.?)$/iu, "")
      .replace(/\s+ind[uú]stria\s+e\s+com[eé]rcio\s+de\s+produtos\s+farmac[eê]uticos$/iu, "")
      .replace(/\s+ind[uú]stria\s+de\s+cosm[eé]ticos\s+e\s+medicamentos$/iu, "")
      .replace(/\s+importadora\s+e\s+distribuidora\s+de\s+medicamentos$/iu, "")
      .replace(/\s+do\s+brasil$/iu, "")
      .replace(/\s+(?:laborat[oó]rios?(?:\s+farmac[eê]uticos?)?|ind[uú]stria(?:\s+farmac[eê]utica)?|farmac[eê]utica)$/iu, "")
      .replace(/^laborat[oó]rio\s+(.+)\s+brasileiro$/iu, "$1")
      .trim();
  } while (label !== previousLabel);
  if (/^biolab sanus$/iu.test(label)) label = "BIOLAB";
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const key = normalize(label);
  return !key || ` ${normalize(name)} `.includes(` ${key} `) ? null : label;
}

export function productDisplayName(name: string) {
  const match = /^(?:(Aradois|Corus)\s+)?Losartana(?:\s+Pot[aá]ssica)?\s+(\d+(?:[.,]\d+)?)\s*mg\s+(?:c\/\s*)?(\d+)\s+comprimidos?(?:\s+revestidos?)?(?:\s+(Biosint[eé]tica|Germed|Medley|Nova Qu[ií]mica|EMS|Geolab|Sandoz|Teuto))?$/iu.exec(name.trim());
  if (!match) return name;
  const [, reference, dose, quantity, brand] = match;
  return `${reference ?? "Losartana"} ${dose} mg · ${quantity} comprimidos${brand ? ` · ${brand}` : ""}`;
}
