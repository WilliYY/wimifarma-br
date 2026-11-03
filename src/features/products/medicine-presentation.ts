type MedicinePresentationInput = { name: string; activeIngredients?: readonly string[] };
const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
type Component = { ingredient: string; dose: string; aliases: readonly string[] };

// Manufacturer composition, not positional association with catalog ingredient arrays.
// https://www.ache.com.br/produto/isentos-de-prescricao/dorilax-dt/
// https://www.buscopan.com.br/bula-buscoduo
// https://www.ache.com.br/produto/sob-prescricao/alenia-6-200-mcg/
// CIMED product page and SEFA/PR GTIN table, checked on 2026-11-02.
// See docs/relacionados-e-cimegripe-2026-11-02.md for exact source URLs.
const cimegripePresentation = { identity: /^cimegripe 400\s*mg\s*\+\s*4\s*mg\s*\+\s*4\s*mg 20 capsulas?$/u, components: [
    { ingredient: "Paracetamol", dose: "400 mg", aliases: ["paracetamol"] },
    { ingredient: "Maleato de clorfeniramina", dose: "4 mg", aliases: ["maleato de clorfeniramina"] },
    { ingredient: "Cloridrato de fenilefrina", dose: "4 mg", aliases: ["cloridrato de fenilefrina"] },
  ] };

const presentations: readonly { identity: RegExp; components: readonly Component[]; inhalation?: boolean }[] = [
  cimegripePresentation,
  { identity: /^dorilax dt 450\s*mg\s*\+\s*50\s*mg\s*\+\s*35\s*mg (?:12|100) comprimidos?$/u, components: [
    { ingredient: "Paracetamol", dose: "450 mg", aliases: ["paracetamol"] },
    { ingredient: "Cafeína anidra", dose: "50 mg", aliases: ["cafeina anidra"] },
    { ingredient: "Citrato de orfenadrina", dose: "35 mg", aliases: ["citrato de orfenadrina"] },
  ] },
  { identity: /^buscoduo 10\s*mg\s*\+\s*500\s*mg 20 comprimidos? revestidos?$/u, components: [
    { ingredient: "Butilbrometo de escopolamina", dose: "10 mg", aliases: ["butilbrometo de escopolamina"] },
    { ingredient: "Paracetamol", dose: "500 mg", aliases: ["paracetamol"] },
  ] },
  { identity: /^alenia 6\s*mcg\s*\+\s*200\s*mcg 60 capsulas?(?: duras?)?(?:[ ·,-]+po para inalacao)?$/u, inhalation: true, components: [
    { ingredient: "Fumarato de formoterol di-hidratado", dose: "6 mcg", aliases: ["fumarato de formoterol di-hidratado", "fumarato de formoterol diidratado"] },
    { ingredient: "Budesonida", dose: "200 mcg", aliases: ["budesonida"] },
  ] },
];

/** Public DTO correction only. Exact GTIN and known title are required; conflicting data stays for review. */
export function normalizeVerifiedMedicineProduct<T extends { name?: string; ean?: string | null; brand?: string | null; activeIngredients?: string[] }>(product: T): T {
  // A partial projection cannot establish that omitted identity fields are empty.
  if (!Object.hasOwn(product, "brand") || !Array.isArray(product.activeIngredients)) return product;
  if (typeof product.name !== "string" || product.ean !== "7896523200576" || product.brand && !/^cimed(?: industria(?: de medicamentos)?)?(?: s\.?\s*a\.?| ltda\.?)?$/u.test(normalize(product.brand))) return product;
  const name = normalize(product.name);
  if (!/^cimegrip(?:e)?\s*20\s*(?:cp|capsulas?)$/u.test(name) && !cimegripePresentation.identity.test(name)) return product;
  const components = cimegripePresentation.components;
  const ingredients = product.activeIngredients ?? [];
  if (ingredients.length && (ingredients.length !== components.length || !components.every(component => ingredients.filter(ingredient => component.aliases.includes(normalize(ingredient))).length === 1))) return product;
  return { ...product, name: "Cimegripe 400 mg + 4 mg + 4 mg 20 cápsulas", activeIngredients: components.map(component => component.ingredient) };
}

/** Enrichment requires the complete verified presentation and the exact ingredient set. */
export function verifiedMedicinePresentation(product: MedicinePresentationInput) {
  const ingredients = product.activeIngredients?.map(normalize) ?? [];
  return presentations.find(presentation => presentation.identity.test(normalize(product.name)) &&
    ingredients.length === presentation.components.length &&
    presentation.components.every(component => ingredients.filter(ingredient => component.aliases.includes(ingredient)).length === 1)) ?? null;
}

export function productIngredientLabel(product: MedicinePresentationInput) {
  const presentation = verifiedMedicinePresentation(product);
  return presentation ? presentation.components.map(component => `${component.ingredient} ${component.dose}`).join(" + ")
    : (product.activeIngredients ?? []).join(" + ");
}

/** Imports must declare component/dose pairs; separate numeric and ingredient lists are ambiguous. */
export function medicineCompositionImportIssue(product: MedicinePresentationInput & { description: string }) {
  const known = presentations.find(presentation => presentation.identity.test(normalize(product.name)));
  if (known && !verifiedMedicinePresentation(product)) return "Verified medicine presentation requires its exact active ingredients.";
  if (known?.inhalation && !/p[oó] para inala[cç][aã]o/iu.test(product.name)) return "Inhalation medicine names must explicitly identify powder for inhalation.";
  const ingredients = product.activeIngredients ?? [];
  // Consume concentration denominators with their numerator. Package mass alone
  // does not identify a second active component (e.g. 10 mg/g, tube of 30 g).
  const doses = [...product.name.matchAll(/\d+(?:[.,]\d+)?\s*(?:mcg|mg|g)\b(?:\s*\/\s*(?:\d+(?:[.,]\d+)?\s*)?(?:ml|l|g|kg)\b)?/giu)];
  const associationDoses = new Set<number>();
  for (let index = 1; index < doses.length; index += 1) {
    const previous = doses[index - 1];
    const between = product.name.slice(previous.index! + previous[0].length, doses[index].index);
    if (/[+/]/u.test(between)) {
      associationDoses.add(index - 1);
      associationDoses.add(index);
    }
  }
  // Overlapping lookahead also sees chains such as 450 + 50 + 35 mg.
  // Do not expand a shared unit into component doses: incomplete pairs still
  // need explicit ingredient/concentration labels before an import can pass.
  const strengthPairs = product.name.matchAll(/(?=\b(\d+(?:[.,]\d+)?)\s*(mcg|mg|g)?\s*([+/])\s*(\d+(?:[.,]\d+)?)\s*(mcg|mg|g|ml|l|kg)?\b)/giu);
  const sharedOrIncompleteStrength = [...strengthPairs].some(match => {
    const firstUnit = match[2]?.toLowerCase();
    const secondUnit = match[5]?.toLowerCase();
    const massUnit = (unit: string | undefined) => unit !== undefined && ["mcg", "mg", "g"].includes(unit);
    return (massUnit(firstUnit) || massUnit(secondUnit)) &&
      !(match[3] === "/" && massUnit(firstUnit) && secondUnit !== undefined && ["ml", "l", "g", "kg"].includes(secondUnit));
  });
  const grouped = ingredients.some(ingredient => /[+;/]/u.test(ingredient));
  if (!known && associationDoses.size === 0 && !sharedOrIncompleteStrength && ingredients.length < 2 && !grouped) return null;
  if (ingredients.length < 2 || grouped || new Set(ingredients.map(normalize)).size !== ingredients.length ||
    (associationDoses.size > 0 && associationDoses.size !== ingredients.length)) return "Combination medicines require separate active ingredients for every component.";
  // Only verified identities have a renderer that pairs a numeric title with
  // its ingredients. Other combinations must identify each pair in the title.
  const text = normalize(known ? `${product.name}. ${product.description}` : product.name);
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const paired = (alias: string, dose: string) => new RegExp(`\\b${escape(normalize(alias))}\\s*:?\\s*${dose}\\b`, "u").test(text);
  const conflicting = known?.components.some(component => component.aliases.some(alias => {
    const matches = text.matchAll(new RegExp(`\\b${escape(normalize(alias))}\\s*:?\\s*(\\d+(?:[.,]\\d+)?)\\s*(mcg|mg|g)\\b`, "gu"));
    const [dose, unit] = component.dose.split(" ");
    return [...matches].some(match => Number(match[1].replace(",", ".")) !== Number(dose) || match[2] !== unit);
  }));
  if (conflicting) return "Combination medicine concentration conflicts with its verified ingredient.";
  const complete = known ? known.components.every(component => component.aliases.some(alias => paired(alias, escape(component.dose).replace(/ /g, "\\s*")) ))
    : ingredients.every(ingredient => paired(ingredient, "\\d+(?:[.,]\\d+)?\\s*(?:mcg|mg|g)"));
  return complete ? null : known ? "Combination medicines require explicit verified ingredient/concentration pairs in the name or description."
    : "Unknown combination medicines require explicit ingredient/concentration pairs in the product name.";
}
