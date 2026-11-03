import { getPickupEstimate, pickupTimeLabel } from "@/features/orders/pickup-estimate";
import { getSupplierPreparationEstimate } from "@/features/supplier-catalog/preparation";
import { isMedicineProduct } from "./product-description";

type PresentationInput = Parameters<typeof isMedicineProduct>[0] & { name: string };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function multipackPresentation(product: PresentationInput) {
  if (isMedicineProduct(product)) return null;
  const name = normalize(product.name).replace(/(kg|ml|g|l)(?=l\d+p\d+)/g, "$1 ").replace(/([a-z])(?=\d)/g, "$1 ").replace(/(\d)(?=[a-z])/g, "$1 ");
  // Kits retain their existing composition wording; promotion counts never describe medicine doses.
  if (/\bkit\b/.test(name)) return null;
  const promotion = name.match(/\bleve\s*(\d+)\s*(?:unidades?\s*)?pague\s*\d+(?:\s*unidades?)?\b|\bl\s*(\d+)\s*p\s*\d+(?:\s*unidades?)?\b/);
  // Both "Leve" and "Pague" counts belong to the promotion. Other counts must agree independently.
  const independentName = promotion ? name.replace(promotion[0], " ") : name;
  const counted = independentName.match(/(?<![\d.,])\b(\d+)\s*(barras?|frascos?|absorventes?|unidades?|unid|un)\b/);
  const multiplied = independentName.match(/\b(\d+)\s*x\s*\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b/);
  const count = Number(promotion?.[1] ?? promotion?.[2] ?? counted?.[1] ?? multiplied?.[1]);
  if (!Number.isSafeInteger(count) || count <= 1 || count > 1000) return null;
  const declaredCounts = [...independentName.matchAll(/(?<![\d.,])\b(\d+)\s*(?:barras?|frascos?|absorventes?|unidades?|unid|un)\b/g)].map(match => Number(match[1]));
  const multiplierCounts = [...independentName.matchAll(/\b(\d+)\s*x\s*\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b/g)].map(match => Number(match[1]));
  if (/\+|\b\d+\s*(?:pacotes|caixas)\b/.test(name) || [...declaredCounts, ...multiplierCounts].some(quantity => quantity !== count)) {
    return { content: null, presentation: "Embalagem — confira a composição na embalagem" };
  }
  const item = counted?.[2];
  const itemLabel = item?.startsWith("barra") || /\bsabonetes?\b/.test(name) ? "barras"
    : item?.startsWith("frasco") ? "frascos"
    : item?.startsWith("absorvente") || /\babsorventes?\b/.test(name) ? "absorventes" : "unidades";
  const packageLabel = /\bcaixa\b/.test(name) ? "caixa" : "pacote";
  // Only a single declared measure can be multiplied. Mixed contents need a composition review.
  const measures = [...name.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/g)];
  const composition = `${count} ${itemLabel}`;
  let content = composition;
  if (measures.length === 1 && !/\b(?:total|liquidos?)\b|\+/.test(name) && (itemLabel === "barras" || itemLabel === "frascos" || multiplied)) {
    const [, amount, unit] = measures[0];
    const size = Number(amount.replace(",", "."));
    const units: Record<string, string> = { kg: "kg", ml: "mL", g: "g", l: "L" };
    const total = Number((size * count).toFixed(3)).toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 3 });
    content = `${composition} de ${amount.replace(".", ",")} ${units[unit]} · ${total} ${units[unit]} ${unit === "g" || unit === "kg" ? "líquidos" : "no total"}`;
  }
  return { content, presentation: `1 ${packageLabel} com ${composition}` };
}

/** Declared contents in the product name, never gross parcel weight or shipping dimensions. */
export function productPackagePresentation(product: PresentationInput) {
  const multipack = multipackPresentation(product);
  if (multipack) return multipack;
  const name = normalize(product.name);
  const quantity = name.match(/\b(\d+)\s*(?:x(?=\s*\d)|un(?:id(?:ades?)?)?\b|sabonetes?\b)/);
  const kit = /\bkit\b/.test(name) && quantity && Number(quantity[1]) > 1;
  const content = name.replace(/(\d+)\s*x\s*(?=\d)/g, "$1 x ").match(/\b(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/);
  const units: Record<string, string> = { kg: "kg", ml: "mL", g: "g", l: "L" };
  const medicinePresentation = name.match(/\b(\d+)\s*(comprimidos?|comp\.?|cp\b|capsulas?)/);
  return {
    content: content ? `${content[1].replace(".", ",")} ${units[content[2]]}${kit ? " por unidade" : ""}` : null,
    presentation: kit ? `Kit com ${quantity[1]} unidades`
      : /\bkit\b/.test(name) ? "Kit — confira a composição na embalagem"
      : /\brefil\b/.test(name) ? "Refil"
      : medicinePresentation ? `${medicinePresentation[1]} ${medicinePresentation[2].startsWith("caps") ? "cápsulas" : "comprimidos"}`
      : quantity ? `${quantity[1]} unidades` : "1 unidade",
  };
}

/** The price always buys one commercial package, never one inner item. */
export function productSaleUnitLabel(product: PresentationInput) {
  const multipack = multipackPresentation(product);
  return multipack?.presentation.startsWith("1 ") ? multipack.presentation : null;
}

export function productCareInformation(product: PresentationInput) {
  return isMedicineProduct(product)
    ? { medicine: true, title: "Cuidado em cada escolha", description: "Leia a embalagem e a bula. Em caso de dúvida, fale com o farmacêutico. Não use medicamentos sem orientação adequada." }
    : { medicine: false, title: "Cuidados com o produto", description: "Confira o modo de uso, a validade e os cuidados de conservação na embalagem. Use somente nas áreas indicadas pelo fabricante." };
}

export function productPickupInformation(inventorySource: "PHARMACY" | "DISTRIBUTOR" | undefined, now: Date) {
  if (inventorySource === "DISTRIBUTOR") {
    const estimate = getSupplierPreparationEstimate(now);
    return { title: "Retirada na farmácia", description: `Preparação prevista até ${estimate.readyDateLabel}, às 18h30, após o recebimento dos itens.` };
  }
  if (inventorySource !== "PHARMACY") return { title: "Retirada na farmácia", description: "Confira a previsão de preparação na finalização." };
  const estimate = getPickupEstimate(now);
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(estimate.readyAt);
  return { title: estimate.readyToday ? "Retirada hoje em Ivaté" : "Próxima retirada em Ivaté", description: `Previsão a partir de ${estimate.readyToday ? "hoje" : date}, às ${pickupTimeLabel(estimate.readyAt)}. Aguarde o aviso de que está pronto.` };
}
