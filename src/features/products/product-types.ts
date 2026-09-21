export const productTypes = ["medicine", "supplement", "beauty", "hygiene", "food", "device", "other", "unknown"] as const;
export type ProductType = typeof productTypes[number];

export const productTypeLabels: Record<ProductType, string> = {
  medicine: "Medicamento", supplement: "Suplemento", beauty: "Perfumaria e beleza",
  hygiene: "Higiene", food: "Alimentos e bebidas", device: "Dispositivo e acessório",
  other: "Outro produto", unknown: "Tipo a confirmar",
};

export const catalogCategorySuggestions = ["Medicamentos", "Suplementos", "Vitaminas", "Perfumaria", "Dermocosméticos", "Cuidados com a pele", "Maquiagem", "Proteção solar", "Cuidados com os cabelos", "Higiene pessoal", "Higiene bucal", "Desodorantes", "Fraldas", "Cuidados infantis", "Alimentos", "Chocolates", "Balas e gomas", "Biscoitos e snacks", "Bebidas", "Nutrição infantil", "Acessórios de beleza", "Primeiros socorros", "Dispositivos e acessórios"];

// Only a form hint; never establishes identity, prescription or commercial rules.
export function productTypeHint(text: string): ProductType {
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(medicamento|medicamentos|comprimidos|capsulas|dipirona|losartana)\b/.test(value)) return "medicine";
  if (/\b(suplementos?|vitaminas?|whey|nutricao infantil|formula infantil)\b/.test(value)) return "supplement";
  if (/\b(chocolates?|kit\s*-?\s*kat|wafer|alimentos?|biscoitos?|snacks?|balas?|gomas?|bebidas?|cafe)\b/.test(value)) return "food";
  if (/\b(perfumaria|perfumes?|dermocosmeticos?|cosmeticos?|beleza|maquiagem|pele|protecao solar|protetor solar)\b/.test(value)) return "beauty";
  if (/\b(higiene|sabonetes?|shampoos?|condicionadores?|desodorantes?|fraldas?|cabelos|bucal)\b/.test(value)) return "hygiene";
  if (/\b(dispositivos?|termometros?|medidores?|primeiros socorros)\b/.test(value)) return "device";
  return "unknown";
}
