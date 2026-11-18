import type { ShippingOption } from "./schema";

export const shippingProviderDisplay = {
  "melhor-envio": { name: "Melhor Envio", url: "https://melhorenvio.com.br/painel" },
  superfrete: { name: "SuperFrete", url: "https://web.superfrete.com/" },
  correios: { name: "Correios — contrato Wimifarma", url: "https://prepostagem.correios.com.br/" },
} satisfies Record<ShippingOption["provider"], { name: string; url: string }>;
