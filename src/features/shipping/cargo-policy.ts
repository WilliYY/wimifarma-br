import { z } from "zod";

export const shippingCargoSchema = z.enum(["unspecified", "general", "medication", "liquid", "perfume", "aerosol", "industrialized_food", "perishable", "temperature_sensitive"]);
export type ShippingCargo = z.infer<typeof shippingCargoSchema>;
export const shippingCargoKindsSchema = z.array(shippingCargoSchema).max(8)
  .refine(cargos => new Set(cargos).size === cargos.length, "Informe cada tipo de mercadoria uma única vez.");
export const SHIPPING_CARGO_LABELS: Record<ShippingCargo, string> = {
  unspecified: "Não informado", general: "Mercadoria geral", medication: "Medicamento", liquid: "Líquido",
  perfume: "Perfume", aerosol: "Aerossol", industrialized_food: "Alimento industrializado",
  perishable: "Perecível", temperature_sensitive: "Sensível à temperatura",
};
type CargoStatus = "allowed" | "conditional" | "blocked" | "unknown";
type Carrier = "correios" | "jadlog" | "latam" | "azul" | "buslog" | "loggi" | "jet" | "total";
const carriers: Record<number, Carrier> = {
  1: "correios", 2: "correios", 17: "correios", 3: "jadlog", 4: "jadlog", 27: "jadlog",
  12: "latam", 15: "azul", 16: "azul", 22: "buslog", 31: "loggi", 32: "loggi", 34: "loggi", 33: "jet", 35: "total",
};
// Melhor Envio guide, updated 19/10/2026. Conflicting Jadlog text/table fails closed.
// https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332
function cargoStatus(carrier: Carrier, cargo: ShippingCargo): CargoStatus {
  switch (cargo) {
    case "medication": return ["correios", "latam", "buslog"].includes(carrier) ? "conditional" : "blocked";
    case "perfume": return ["jadlog", "buslog", "jet"].includes(carrier) ? "allowed" : carrier === "total" ? "conditional" : "blocked";
    case "aerosol": return ["jadlog", "buslog"].includes(carrier) ? "allowed" : carrier === "total" ? "conditional" : "blocked";
    case "industrialized_food": return ["loggi", "buslog"].includes(carrier) ? "blocked" : carrier === "jet" ? "conditional" : "allowed";
    case "perishable": return carrier === "buslog" ? "conditional" : carrier === "jadlog" ? "unknown" : "blocked";
    case "temperature_sensitive": return "unknown";
    case "liquid": return "conditional";
    default: return "allowed";
  }
}

export function assessCarrierCargo(serviceId: number, cargos: ShippingCargo[], carrierName?: string): { status: CargoStatus; reasons: string[] } {
  // Names are display data, never proof that an unknown service has the same contract.
  void carrierName;
  const restricted = [...new Set(cargos)].filter(cargo => cargo !== "general" && cargo !== "unspecified");
  const carrier = carriers[serviceId];
  const entries: { cargo: ShippingCargo; status: CargoStatus }[] = restricted.map(cargo => ({ cargo, status: carrier ? cargoStatus(carrier, cargo) : "unknown" }));
  if (cargos.includes("unspecified")) entries.push({ cargo: "unspecified", status: "unknown" });
  const status = (["blocked", "unknown", "conditional", "allowed"] as const).find(value => entries.some(entry => entry.status === value)) ?? "allowed";
  const reasons = entries.map(({ cargo, status }) => {
    const label = SHIPPING_CARGO_LABELS[cargo];
    if (status === "blocked") return `${label}: transporte proibido por esta transportadora no Melhor Envio.`;
    if (status === "unknown") return `${label}: aceitação ou conservação não comprovada para este serviço; requer confirmação humana.`;
    if (cargo === "medication") return `${label}: exige confirmação do contrato e das condições de transporte no Melhor Envio.`;
    if (cargo === "liquid") return `${label}: exige revisão da embalagem, conservação e eventual homologação pela transportadora.`;
    if (status === "conditional") return `${label}: exige confirmação das condições e restrições da transportadora.`;
    return `${label}: categoria aceita, sujeita à embalagem e revisão operacional.`;
  });
  return { status, reasons };
}
