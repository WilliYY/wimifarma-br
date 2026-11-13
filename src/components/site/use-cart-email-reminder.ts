"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const endpoint = "/api/carrinho/lembrete-email";
type Item = { id: string; quantity: number };
type Status = { eligible: boolean; cartKey: string | null; owner: string };

export function useCartEmailReminder(owner: string | undefined, hydrated: boolean, items: Item[]) {
  const [status, setStatus] = useState<Status | null>(null);
  const currentStatus = status?.owner === owner ? status : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const queue = useRef(Promise.resolve());
  const ownedKey = useRef<string | null>(null);
  const lastSnapshot = useRef<string | null>(null);
  const stateVersion = useRef(0);
  const storageKey = owner ? `wimifarma-cart-email-reminder:${owner}` : null;
  const payload = useMemo(() => items.map(item => ({ productId: item.id, quantity: item.quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId)), [items]);
  const snapshot = JSON.stringify(payload);

  const remember = useCallback((cartKey: string | null) => {
    ownedKey.current = cartKey;
    if (!storageKey) return;
    try {
      if (cartKey) localStorage.setItem(storageKey, cartKey);
      else localStorage.removeItem(storageKey);
    } catch { /* Current tab can still keep its own authorization. */ }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    lastSnapshot.current = null;
    function readOwnership() {
      try { ownedKey.current = localStorage.getItem(storageKey!); } catch { /* Optional storage. */ }
    }
    function refresh() {
      readOwnership();
      const version = stateVersion.current;
      void fetch(endpoint, { cache: "no-store", headers: { "x-cart-reminder-owner": owner! } }).then(async response => {
        if (!response.ok) return;
        const next = await response.json() as Omit<Status, "owner">;
        if (active && version === stateVersion.current) setStatus({ ...next, owner: owner! });
      }).catch(() => undefined);
    }
    function onStorage(event: StorageEvent) { if (event.key === storageKey) refresh(); }
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("storage", onStorage); window.removeEventListener("focus", refresh); };
  }, [owner, storageKey]);

  const send = useCallback(async (body: object) => {
    if (!owner) throw new Error("Sua sessão mudou. Atualize a página para gerenciar o lembrete.");
    const response = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", "x-cart-reminder-owner": owner }, body: JSON.stringify(body), keepalive: true,
    });
    if (!response.ok) throw new Error("Não foi possível atualizar o lembrete. Tente novamente.");
    return (await response.json() as { cartKey: string | null }).cartKey;
  }, [owner]);

  useEffect(() => {
    const cartKey = currentStatus?.cartKey;
    if (!hydrated || !cartKey || ownedKey.current !== cartKey || lastSnapshot.current === snapshot) return;
    let active = true;
    const timer = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (!active) return;
        try {
          const next = await send({ action: "sync", cartKey, items: payload.length <= 30 ? payload : [] });
          lastSnapshot.current = snapshot;
          if (!next && ownedKey.current === cartKey) {
            remember(null);
            stateVersion.current++;
            setStatus(current => current?.cartKey === cartKey ? { ...current, cartKey: null } : current);
          }
        } catch { /* Cart changes remain available when reminders are unavailable. */ }
      });
    }, payload.length ? 800 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [hydrated, currentStatus?.cartKey, payload, snapshot, remember, send]);

  const setEnabled = useCallback((checked: boolean) => {
    if (busy || !currentStatus || (checked && (!currentStatus.eligible || !payload.length))) return;
    stateVersion.current++;
    setBusy(true);
    setError("");
    queue.current = queue.current.then(async () => {
      try {
        const cartKey = checked
          ? await send({ action: "arm", consent: true, items: payload })
          : currentStatus.cartKey ? await send({ action: "disarm", cartKey: currentStatus.cartKey }) : null;
        if (checked && !cartKey) throw new Error("O lembrete não está disponível para este carrinho.");
        lastSnapshot.current = snapshot;
        remember(cartKey);
        stateVersion.current++;
        setStatus(current => current?.owner === currentStatus.owner ? { ...current, cartKey } : current);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Não foi possível atualizar o lembrete.");
      } finally { setBusy(false); }
    });
  }, [busy, currentStatus, payload, snapshot, remember, send]);

  return { eligible: currentStatus?.eligible ?? false, enabled: Boolean(currentStatus?.cartKey), busy, error, setEnabled };
}
