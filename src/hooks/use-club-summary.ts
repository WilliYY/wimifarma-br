"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClubSummary } from "@/features/club/contracts";

function isClubSummary(value: unknown): value is ClubSummary {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ClubSummary>;
  return typeof data.member === "boolean" && (data.joinedAt === null || typeof data.joinedAt === "string")
    && [data.balancePoints, data.pendingPoints, data.lifetimeEarnedPoints, data.lifetimeRedeemedPoints].every(Number.isSafeInteger)
    && Array.isArray(data.transactions) && data.transactions.every(transaction => typeof transaction.id === "string" && typeof transaction.type === "string" && Number.isSafeInteger(transaction.amountPoints) && typeof transaction.description === "string" && typeof transaction.createdAt === "string");
}

export function useClubSummary(enabled = true) {
  const [summary, setSummary] = useState<ClubSummary | null>(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const read = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/minha-conta/club", { cache: "no-store", signal });
      if (signal?.aborted) return;
      if (response.status === 401) { setSummary(null); setGuest(true); setError(null); return; }
      if (!response.ok) throw new Error("unavailable");
      const payload = await response.json();
      if (!isClubSummary(payload.data)) throw new Error("invalid");
      if (signal?.aborted) return;
      setSummary(payload.data); setGuest(false); setError(null);
    } catch {
      if (!signal?.aborted) { setSummary(null); setError("Não foi possível consultar o Club. Tente novamente."); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const refresh = () => { void read(controller.signal); };
    refresh();
    window.addEventListener("wimifarma:club-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("wimifarma:club-updated", refresh); window.removeEventListener("focus", refresh); };
  }, [enabled, read]);
  async function join() {
    if (joining) return;
    setJoining(true); setError(null);
    try {
      const response = await fetch("/api/minha-conta/club", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ join: true }) });
      if (response.status === 401) { setSummary(null); setGuest(true); return; }
      if (!response.ok) throw new Error("unavailable");
      const payload = await response.json();
      if (!isClubSummary(payload.data) || !payload.data.member) throw new Error("invalid");
      setSummary(payload.data);
      window.dispatchEvent(new Event("wimifarma:club-updated"));
    } catch { setError("Não foi possível confirmar sua adesão. Atualize o saldo antes de tentar novamente."); }
    finally { setJoining(false); }
  }
  return { summary: enabled ? summary : null, guest, loading, joining, error, join, refresh: () => read() };
}
