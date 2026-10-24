import type { RelatedProductCardItem } from "@/components/site/public-product-card";
import { readClassification, classificationIsConsistent } from "./catalog-operations";

export const HOME_COLLECTION_SIZE = 15;
export type HomeCollections = { care: RelatedProductCardItem[]; otc: RelatedProductCardItem[]; affordable: RelatedProductCardItem[] };

export function brasiliaDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function commercialPrice(product: { price: string; promotionalPrice: string | null }) {
  return Number(product.promotionalPrice ?? product.price);
}

export function dailyRank(day: string, id: string) {
  let hash = 2166136261;
  for (const char of `${day}:${id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Editorial grouping only: it never grants eligibility or therapeutic equivalence. */
export function homeProductFamily(product: RelatedProductCardItem): string {
  const name = normalized(product.name);
  if (readClassification(product.catalogClassification).kind === "MEDICINE") {
    const ingredients = [...new Set(product.activeIngredients.map(normalized))].sort().join("+");
    return `medicine:${ingredients || name.split(" ").slice(0, 2).join(" ")}`;
  }
  const spf = name.match(/\bfps\s*(\d+)/);
  if (/\b(bronzeador|intensificador de bronzeado)\b/.test(name) || (spf && Number(spf[1]) < 30 && /\b(sun|protetor solar|protecao solar|anthelios|fotoprotetor)\b/.test(name))) return "other:solar";
  const families: [string, RegExp][] = [
    ["oral", /\b(creme dental|escova dental|fio dental|enxaguante|higiene bucal)\b/],
    ["deodorant", /\b(desodorante|antitranspirante)\b/],
    ["hair", /\b(shampoo|condicionador|capilar|cabelos|leave in)\b/],
    ["baby", /\b(fraldas?|lencos umedecidos|toalhinhas|assaduras|pampers|huggies)\b/],
    ["first-aid", /\b(soro|curativos?|algodao|gaze|esparadrapo|micropore|termometro|alcool)\b/],
    ["soap", /\b(sabonetes?)\b/],
    ["lip", /\b(labial|hidratante lab|lip)\b/],
    ["sun", /\b(protetor solar|protecao solar|anthelios|fotoprotetor|sun)\b/],
    ["skin", /\b(hidratante|hidratacao|locao|micelar|serum|esfoliante|creme)\b/],
  ];
  return families.find(([, pattern]) => pattern.test(name))?.[0] ?? `other:${normalized(product.category ?? "produto")}`;
}

function diverseDailySelection(products: RelatedProductCardItem[], count: number, day: string) {
  const families = new Map<string, RelatedProductCardItem[]>();
  const dayNumber = Math.floor(Date.parse(day) / 86_400_000);
  const rotate = (rows: RelatedProductCardItem[]) => {
    const ordered = [...rows].sort((a, b) => dailyRank("home-variants", a.id) - dailyRank("home-variants", b.id) || a.id.localeCompare(b.id));
    const offset = ordered.length ? dayNumber % ordered.length : 0;
    return [...ordered.slice(offset), ...ordered.slice(0, offset)];
  };
  for (const product of products) {
    const family = homeProductFamily(product);
    const bucket = families.get(family);
    if (bucket) bucket.push(product); else families.set(family, [product]);
  }
  const queues = [...families].sort(([a], [b]) => Number(a.startsWith("other:")) - Number(b.startsWith("other:")) || dailyRank(day, a) - dailyRank(day, b) || a.localeCompare(b)).map(([, rows]) => {
    const byPrice = [...rows].sort((a, b) => commercialPrice(a) - commercialPrice(b) || a.id.localeCompare(b.id));
    // Rotate accessible entry options first; remaining variants fill later rounds.
    const entry = byPrice.filter(product => commercialPrice(product) <= commercialPrice(byPrice[0]) * 1.5).slice(0, 3);
    const entryIds = new Set(entry.map(product => product.id));
    return [...rotate(entry), ...rotate(byPrice.filter(product => !entryIds.has(product.id)))];
  });
  const selected: RelatedProductCardItem[] = [];
  for (let round = 0; selected.length < count; round++) {
    const next = queues.flatMap(queue => queue[round] ? [queue[round]] : []);
    if (!next.length) break;
    selected.push(...next.slice(0, count - selected.length));
  }
  return selected;
}

function cabinetCarePriority(product: RelatedProductCardItem) {
  const name = product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(soro|algodao|gaze|curativos?|esparadrapo|micropore|termometro|alcool|antisseptico|antiseptico|hastes)\b/.test(name)) return 0;
  if (/\b(protetor|hidratante|labial|assaduras?|barreira|sabonete|lencos?)\b/.test(name)) return 1;
  return readClassification(product.catalogClassification).kind === "HYGIENE" ? 2 : 3;
}

export function buildHomeCollections(products: RelatedProductCardItem[], verifiedPhotos: ReadonlySet<string>, date: Date): HomeCollections {
  const eligible = [...new Map(products.filter(product => product.imageUrl && verifiedPhotos.has(product.imageUrl) &&
    !product.imageUrl.startsWith("/brand/") && !product.requiresPrescription &&
    (!product.prescriptionType || product.prescriptionType === "UNREVIEWED") && !product.isPopularPharmacy &&
    product.stock > 0 && Number.isFinite(commercialPrice(product)) && commercialPrice(product) > 0).map(product => [product.id, product])).values()];
  const day = brasiliaDay(date);
  const byPrice = [...eligible].sort((a, b) => commercialPrice(a) - commercialPrice(b) || dailyRank(day, a.id) - dailyRank(day, b.id) || a.id.localeCompare(b.id));
  // Reserve a rotating entry-price selection without emptying a small catalog.
  const reserveCount = Math.min(5, Math.floor(eligible.length / 2));
  const entryCeiling = reserveCount ? commercialPrice(byPrice[reserveCount - 1]) * 3 : 0;
  const entryPool = byPrice.slice(0, Math.max(reserveCount, Math.min(45, Math.ceil(eligible.length / 4)))).filter(product => commercialPrice(product) <= entryCeiling);
  const priorityPrices = diverseDailySelection(entryPool, reserveCount, day);
  const selectedIds = new Set(priorityPrices.map(product => product.id));
  const otcPool = eligible.filter(product => {
    const classification = readClassification(product.catalogClassification);
    return classification.kind === "MEDICINE" && classification.otc && classificationIsConsistent(classification, product);
  });
  const carePool = eligible.filter(product => {
    const classification = readClassification(product.catalogClassification);
    if (classification.kind === "MEDICINE") return false;
    const category = (product.category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return ["PERFUMERY", "HYGIENE"].includes(classification.kind) || /\b(perfumaria|higiene|beleza|dermo|dermocosmeticos|cosmeticos|cuidados pessoais)\b/.test(category);
  });
  // Farmacinha retains the existing collection key; only confirmed MIPs enter as medicines.
  // Name matching prioritizes already-classified care products, never classifies medicines.
  const cabinetCare = diverseDailySelection(carePool.filter(product => {
    const classification = readClassification(product.catalogClassification);
    return ["HYGIENE", "PERFUMERY"].includes(classification.kind) && classificationIsConsistent(classification, product) && cabinetCarePriority(product) < 3;
  }), carePool.length, day)
    .sort((a, b) => cabinetCarePriority(a) - cabinetCarePriority(b));
  const otc = [...diverseDailySelection(otcPool, otcPool.length, day), ...cabinetCare].filter(product => !selectedIds.has(product.id)).slice(0, HOME_COLLECTION_SIZE);
  otc.forEach(product => selectedIds.add(product.id));
  // Only MIPs not already selected may join the mixed care collection.
  const mixedOtc = diverseDailySelection(otcPool.filter(product => !selectedIds.has(product.id)), 5, day);
  const careItems = diverseDailySelection(carePool.filter(product => !selectedIds.has(product.id)), HOME_COLLECTION_SIZE - mixedOtc.length, day);
  const care = careItems.length ? [...careItems.slice(0, 5), ...diverseDailySelection([...careItems.slice(5), ...mixedOtc], HOME_COLLECTION_SIZE - Math.min(5, careItems.length), day)] : [];
  care.forEach(product => selectedIds.add(product.id));
  const cheapest = [...priorityPrices, ...byPrice.filter(product => !selectedIds.has(product.id))].slice(0, HOME_COLLECTION_SIZE);
  const affordable = [...priorityPrices, ...diverseDailySelection(cheapest.slice(priorityPrices.length), HOME_COLLECTION_SIZE - priorityPrices.length, day)];
  return { care, otc, affordable };
}
