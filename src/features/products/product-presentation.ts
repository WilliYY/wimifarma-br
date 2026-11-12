import { getPickupEstimate, pickupTimeLabel } from "@/features/orders/pickup-estimate";
import { getSupplierPreparationEstimate } from "@/features/supplier-catalog/preparation";
import { isMedicineProduct } from "./product-description";

type PresentationInput = Parameters<typeof isMedicineProduct>[0] & { name: string };
type PackagePresentation = { content: string | null; presentation: string; strength?: string };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const packageQuantity = /\b(\d+)\s*(?:[x×](?=\s*\d)|un(?:id(?:ades?)?)?\b|sabonetes?\b)/;
const packageMeasure = /\b(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/;
const units: Record<string, string> = { kg: "kg", ml: "mL", g: "g", l: "L" };

function explicitKitComponents(name: string) {
  const components = name.trim().replace(/^kit\s+/i, "").split("+").map(component => component.trim());
  const complete = components.every(component =>
    /\p{L}.*\d\s*(?:kg|ml|g|l)$/iu.test(component) &&
    [...normalize(component).matchAll(new RegExp(packageMeasure, "g"))].length === 1,
  );
  return complete ? components.join(" + ") : null;
}

function kitPresentation(product: PresentationInput, name: string, content: string | null) {
  if (!/\bkit\b/.test(name)) return null;
  const fallback = "Kit — confira a composição na embalagem";
  if (/^kit\s+/.test(name.trim()) && name.includes("+") && !isMedicineProduct(product)) {
    const components = explicitKitComponents(product.name);
    return {
      details: { content: components, presentation: components ? "1 kit" : fallback },
      saleUnit: "1 kit",
    };
  }
  const quantities = [...name.matchAll(new RegExp(packageQuantity, "g"))];
  if (quantities.length > 1 || /\b\d+\s*(?:pacotes?|caixas?)\b/.test(name)) {
    return { details: { content: null, presentation: fallback }, saleUnit: "1 kit" };
  }
  const [quantity] = quantities;
  if (quantity && Number(quantity[1]) > 1) {
    const composition = `Kit com ${quantity[1]} unidades`;
    return {
      details: { content: content ? `${content} por unidade` : null, presentation: composition },
      saleUnit: `1 kit com ${quantity[1]} unidades`,
    };
  }
  return { details: { content, presentation: fallback }, saleUnit: "1 kit" };
}

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
    const total = Number((size * count).toFixed(3)).toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 3 });
    content = `${composition} de ${amount.replace(".", ",")} ${units[unit]} · ${total} ${units[unit]} ${unit === "g" || unit === "kg" ? "líquidos" : "no total"}`;
  }
  return { content, presentation: `1 ${packageLabel} com ${composition}` };
}

/** Presentation in the product name, independent of shipping dimensions and weight. */
export function productPackagePresentation(product: PresentationInput): PackagePresentation {
  const multipack = multipackPresentation(product);
  if (multipack) return multipack;
  const name = normalize(product.name);
  const quantity = name.match(packageQuantity);
  const measure = name.replace(/(\d+)\s*[x×]\s*(?=\d)/g, "$1 x ").match(packageMeasure);
  const content = measure ? `${measure[1].replace(".", ",")} ${units[measure[2]]}` : null;
  const kit = kitPresentation(product, name, content);
  if (kit) return kit.details;
  const medicinePresentation = name.match(/\b(\d+)\s*(comprimidos?|comp|cp|capsulas?)\b/);
  const form = medicinePresentation?.[2].startsWith("caps") ? "cápsulas" : "comprimidos";
  if (medicinePresentation && measure?.[2] === "g" && isMedicineProduct(product)) {
    const beforeCount = name.slice(0, medicinePresentation.index);
    const declaredStrength = beforeCount.match(/\b(\d+(?:[.,]\d+)?)\s*g\s+(?:com\s+)?$/);
    if (declaredStrength) {
      const strength = /[+/]|\d\s*[x×]/.test(beforeCount) || declaredStrength[1] !== measure[1]
        ? {} : { strength: `${declaredStrength[1].replace(".", ",")} g` };
      return { content: null, ...strength, presentation: `${medicinePresentation[1]} ${form}` };
    }
  }
  return {
    content,
    presentation: /\brefil\b/.test(name) ? "Refil"
      : medicinePresentation ? `${medicinePresentation[1]} ${form}`
      : quantity ? `${quantity[1]} unidades` : "1 unidade",
  };
}

/** The price always buys one commercial package, never one inner item. */
export function productSaleUnitLabel(product: PresentationInput) {
  const multipack = multipackPresentation(product);
  if (multipack) return multipack.presentation.startsWith("1 ") ? multipack.presentation : null;
  return kitPresentation(product, normalize(product.name), null)?.saleUnit ?? null;
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
