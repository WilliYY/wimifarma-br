"use client";

import { useEffect, useRef, useState } from "react";
import { createRepurchasePlan, type RepurchaseItem } from "@/features/orders/repurchase";
import { requestCartProducts } from "@/features/products/cart-review";
import { useCart } from "./cart-provider";

export function useOrderRepurchase() {
  const { items, addProduct, hydrated } = useCart();
  const cart = useRef(items);
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof createRepurchasePlan> | null>(null);

  useEffect(() => { cart.current = items; }, [items]);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  async function repurchase(source: RepurchaseItem[]) {
    if (request.current || !hydrated) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    setResult(null);
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const ids = [...new Set(source.flatMap(item => item.productId ? [item.productId] : []))];
      if (ids.length > 30) throw new Error("Recompre os produtos deste pedido individualmente: a consulta aceita até 30 produtos por vez.");
      const products = ids.length ? await requestCartProducts(ids, fetch, controller.signal) : [];
      if (controller.signal.aborted) throw new Error("A consulta demorou mais que o esperado. Tente novamente.");
      const plan = createRepurchasePlan(source, products, cart.current);
      for (const addition of plan.additions) addProduct(addition.product, addition.quantity);
      setResult(plan);
    } catch (reason) {
      if (request.current === controller) setError(reason instanceof Error ? reason.message : "Não foi possível consultar os produtos. Tente novamente.");
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setPending(false); }
    }
  }

  return { repurchase, pending, error, result, ready: hydrated };
}
