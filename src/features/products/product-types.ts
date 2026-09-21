export const productTypes = ["medicine", "supplement", "beauty", "hygiene", "food", "device", "other", "unknown"] as const;
export type ProductType = typeof productTypes[number];

export const productTypeLabels: Record<ProductType, string> = {
  medicine: "Medicamento", supplement: "Suplemento", beauty: "Perfumaria e beleza",
  hygiene: "Higiene", food: "Alimentos e bebidas", device: "Dispositivo e acessório",
  other: "Outro produto", unknown: "Tipo a confirmar",
};

export const catalogCategorySuggestions = ["Medicamentos", "Suplementos", "Perfumaria", "Higiene pessoal", "Alimentos", "Chocolates", "Bebidas", "Cuidados infantis", "Dispositivos e acessórios"];

// Only a form hint; never establishes identity, prescription or commercial rules.
export function productTypeHint(text: string): ProductType {
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(chocolate|chocolates|kit\s*-?\s*kat|wafer|alimento|alimentos|biscoito|bala|bebida|cafe)\b/.test(value)) return "food";
  if (/\b(perfumaria|perfume|cosmetico|beleza|maquiagem)\b/.test(value)) return "beauty";
  if (/\b(higiene|sabonete|shampoo|condicionador|desodorante|fralda)\b/.test(value)) return "hygiene";
  if (/\b(suplemento|suplementos|whey)\b/.test(value)) return "supplement";
  if (/\b(medicamento|medicamentos|comprimidos|capsulas|dipirona|losartana)\b/.test(value)) return "medicine";
  return "unknown";
}
