"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { allowedCheckoutStep, CHECKOUT_DRAFT_KEY, checkoutSteps, readCheckoutDraft, type CheckoutDraft, type CheckoutStep } from "@/features/orders/checkout-draft";

export function useCheckoutSession(initial: CheckoutDraft, owner: string) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<CheckoutStep>(0);
  const [ready, setReady] = useState(false);
  const latest = useRef(initial);
  const completed = useRef(false);

  useEffect(() => {
    let restored = initial;
    try {
      const saved = readCheckoutDraft(sessionStorage.getItem(CHECKOUT_DRAFT_KEY), owner);
      if (saved) restored = saved;
      else sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    } catch { /* Storage can be disabled; checkout still works in memory. */ }
    latest.current = restored;
    setDraft(restored);
    const pathname = window.location.pathname;
    function readStep() {
      const requested = checkoutSteps.indexOf(window.location.hash.slice(1) as typeof checkoutSteps[number]);
      const safe = allowedCheckoutStep(requested, latest.current);
      const url = new URL(window.location.href);
      url.hash = checkoutSteps[safe];
      window.history.replaceState(window.history.state, "", url);
      setStep(safe);
    }
    readStep();
    setReady(true);
    const onPopState = () => { if (window.location.pathname === pathname) readStep(); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // The identity is fixed for this mounted checkout. Initial props are only defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  useEffect(() => {
    latest.current = draft;
    if (!ready || completed.current) return;
    try { sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ owner, savedAt: Date.now(), data: draft })); }
    catch { /* Keep the current form usable without persistence. */ }
  }, [draft, owner, ready]);

  const goToStep = useCallback((requested: number) => {
    const next = allowedCheckoutStep(requested, latest.current);
    if (next === step) return;
    const url = new URL(window.location.href);
    url.hash = checkoutSteps[next];
    window.history.pushState({ ...window.history.state, wimifarmaCheckout: { previousStep: step } }, "", url);
    setStep(next);
  }, [step]);

  const back = useCallback(() => {
    if (step < 1) return;
    if (window.history.state?.wimifarmaCheckout?.previousStep === step - 1) window.history.back();
    else {
      const previous = (step - 1) as CheckoutStep;
      const url = new URL(window.location.href);
      url.hash = checkoutSteps[previous];
      window.history.replaceState({ ...window.history.state, wimifarmaCheckout: null }, "", url);
      setStep(previous);
    }
  }, [step]);

  const clearDraft = useCallback(() => {
    completed.current = true;
    try { sessionStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* No stored draft to clear. */ }
  }, []);

  return { draft, setDraft, step, goToStep, back, ready, clearDraft };
}
