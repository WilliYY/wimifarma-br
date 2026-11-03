const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Editorial identity only; never grants a sanitary classification or purchase rule.
 * Confirmed lines: https://www.centrum.com.br/produtos/multivitaminicos/
 * Essencial: https://www.centrum.com.br/produtos/multivitaminicos/centrum-essencial/
 */
export function isVerifiedVitaminSupplementName(text: string) {
  const value = normalize(text);
  return /^(?:(?:vitaminas(?: e suplementos)?|suplementos?(?: alimentares)?|multivitaminicos?|polivitaminicos?)\s+)?centrum (?:essencial|adulto|homem|mulher|select (?:homem|mulher))(?:\s+(?:c\/?\s*)?\d+\s*(?:comprimidos?(?: revestidos?)?|comp\.?|cp))?$/u.test(value);
}

export function hasCosmeticProductForm(text: string) {
  return /\b(?:cremes?|serum|hidratantes?|locao|sabonetes?|shampoos?|condicionadores?|protetor solar|cosmeticos?)\b/u.test(normalize(text));
}

export function hasVitaminIdentity(text: string) {
  return !hasCosmeticProductForm(text) && (/\b(?:vitaminas?|multivitaminicos?|polivitaminicos?)\b/u.test(normalize(text)) || isVerifiedVitaminSupplementName(text));
}
