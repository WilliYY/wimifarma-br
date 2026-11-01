import { publicShippingEstimateRequestSchema, publicShippingEstimateSchema, type PublicShippingEstimateRequest, type PublicShippingEstimate } from "./public-estimate-contract";

export type PublicEstimateState = { options: PublicShippingEstimate["options"]; busy: boolean; message: string; mode?: PublicShippingEstimate["mode"] };

export function createPublicShippingEstimate() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let generation = 0;

  function cancel() {
    generation += 1;
    clearTimeout(timer);
    timer = undefined;
    controller?.abort();
    controller = undefined;
  }

  function schedule(request: PublicShippingEstimateRequest, onState: (state: PublicEstimateState) => void, delay = 450) {
    cancel();
    if (!publicShippingEstimateRequestSchema.safeParse(request).success) {
      onState({ options: [], busy: false, message: "Confira o CEP e a quantidade dos itens antes de consultar o frete." });
      return;
    }
    const currentGeneration = generation;
    const currentController = new AbortController();
    controller = currentController;
    onState({ options: [], busy: true, message: "" });
    const isCurrent = () => generation === currentGeneration && !currentController.signal.aborted;
    timer = setTimeout(async () => {
      timer = undefined;
      try {
        const response = await fetch("/api/fretes/estimativa", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request), signal: currentController.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!isCurrent()) return;
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Não foi possível consultar o frete agora.");
        const parsed = publicShippingEstimateSchema.safeParse(payload?.data);
        if (!parsed.success) throw new Error("Não foi possível consultar o frete agora.");
        const options = [...parsed.data.options].sort((a, b) => a.priceCents - b.priceCents || a.deliveryDays - b.deliveryDays || a.serviceId - b.serviceId);
        onState({ options, busy: false, mode: parsed.data.mode, message: options.length ? "" : "Nenhuma tarifa disponível para este produto e CEP. Consulte a farmácia ou escolha retirada." });
      } catch (error) {
        if (isCurrent()) onState({ options: [], busy: false, message: error instanceof Error ? error.message : "Consulta indisponível." });
      }
    }, delay);
  }

  return { schedule, cancel };
}
