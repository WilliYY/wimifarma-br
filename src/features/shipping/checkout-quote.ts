import { quoteRequestSchema, shippingSelectionSchema, type ShippingSelection } from "./schema";

type QuoteRequest = { postalCode: string; items: { productId: string; quantity: number; expectedUnitPriceCents: number }[] };
export type CheckoutQuoteState = { options: ShippingSelection[]; busy: boolean; message: string };

export function createCheckoutQuote() {
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

  function schedule(request: QuoteRequest, onState: (state: CheckoutQuoteState) => void, delay = 450) {
    cancel();
    if (!quoteRequestSchema.safeParse(request).success) {
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
        const response = await fetch("/api/fretes/cotacao", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request), signal: currentController.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!isCurrent()) return;
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Não foi possível consultar o frete agora.");
        const parsed = shippingSelectionSchema.array().safeParse(payload?.data);
        if (!parsed.success) throw new Error("Não foi possível consultar o frete agora.");
        const options = [...parsed.data].sort((a, b) => a.priceCents - b.priceCents || a.deliveryDays - b.deliveryDays || a.serviceId - b.serviceId);
        onState({ options, busy: false, message: options.length ? "" : "Nenhuma transportadora disponível para este carrinho e CEP. Consulte a farmácia ou escolha retirada." });
      } catch (error) {
        if (isCurrent()) onState({ options: [], busy: false, message: error instanceof Error ? error.message : "Consulta indisponível." });
      }
    }, delay);
  }

  return { schedule, cancel };
}
