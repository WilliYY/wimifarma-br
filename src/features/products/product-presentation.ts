import { getPickupEstimate, pickupTimeLabel } from "@/features/orders/pickup-estimate";
import { getSupplierPreparationEstimate } from "@/features/supplier-catalog/preparation";
import { isMedicineProduct } from "./product-description";

type PresentationInput = Parameters<typeof isMedicineProduct>[0] & { name: string };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Declared contents in the product name, never gross parcel weight or shipping dimensions. */
export function productPackagePresentation(product: PresentationInput) {
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
