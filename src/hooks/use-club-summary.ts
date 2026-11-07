"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import type { ClubSummary } from "@/features/club/contracts";

function isClubSummary(value: unknown): value is ClubSummary {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ClubSummary>;
  return typeof data.member === "boolean" && (data.joinedAt === null || typeof data.joinedAt === "string")
    && [data.balancePoints, data.pendingPoints, data.lifetimeEarnedPoints, data.lifetimeRedeemedPoints].every(Number.isSafeInteger)
    && Array.isArray(data.transactions) && data.transactions.every(transaction => typeof transaction.id === "string" && typeof transaction.type === "string" && Number.isSafeInteger(transaction.amountPoints) && typeof transaction.description === "string" && typeof transaction.createdAt === "string");
}

type ClubState = { summary: ClubSummary | null; guest: boolean; loading: boolean; joining: boolean; error: string | null };
const initialState: ClubState = { summary: null, guest: false, loading: true, joining: false, error: null };
const getInitialState = () => initialState;
const subscribeDisabled = () => () => {};

// Each provider owns its requests and balances; nothing survives its session key.
export function createClubSummaryStore(synchronizedSession = false) {
  let state = initialState;
  let readController: AbortController | undefined;
  let joinController: AbortController | undefined;
  let inFlight: Promise<void> | undefined;
  let suspended = false;
  let revalidateSession: (() => Promise<void>) | undefined;
  const listeners = new Set<() => void>();
  function update(patch: Partial<ClubState>) {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  }
  function read(invalidate = false): Promise<void> {
    if (suspended) return Promise.resolve();
    if (inFlight && !invalidate) return inFlight;
    readController?.abort();
    const controller = new AbortController();
    readController = controller;
    update({ loading: true });
    const request = (async () => {
      try {
        const response = await fetch("/api/minha-conta/club", { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 401) { update({ summary: null, guest: true, error: null }); return; }
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json();
        if (!isClubSummary(payload.data)) throw new Error("invalid");
        if (!controller.signal.aborted) update({ summary: payload.data, guest: false, error: null });
      } catch {
        if (!controller.signal.aborted) update({ summary: null, error: "Não foi possível consultar o Club. Tente novamente." });
      } finally {
        if (readController === controller) {
          inFlight = undefined;
          if (!controller.signal.aborted) update({ loading: false });
        }
      }
    })();
    inFlight = request;
    return request;
  }
  const refresh = () => suspended ? revalidateSession?.() ?? Promise.resolve() : read();
  const changed = () => { void read(true); };
  const focused = () => { void read(); };
  async function join() {
    if (state.joining || suspended) return;
    const controller = new AbortController();
    joinController = controller;
    update({ joining: true, error: null });
    try {
      const response = await fetch("/api/minha-conta/club", { method: "POST", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ join: true }) });
      if (controller.signal.aborted) return;
      if (response.status === 401) { update({ summary: null, guest: true }); return; }
      if (!response.ok) throw new Error("unavailable");
      const payload = await response.json();
      if (!isClubSummary(payload.data) || !payload.data.member) throw new Error("invalid");
      if (controller.signal.aborted) return;
      update({ summary: payload.data, guest: false });
      window.dispatchEvent(new Event("wimifarma:club-updated"));
    } catch {
      if (!controller.signal.aborted) update({ error: "Não foi possível confirmar sua adesão. Atualize o saldo antes de tentar novamente." });
    } finally {
      if (!controller.signal.aborted) update({ joining: false });
    }
  }
  return {
    getSnapshot: () => state,
    hasSubscribers: () => listeners.size > 0,
    refresh,
    join,
    setSessionRevalidator(revalidate: () => Promise<void>) { revalidateSession = revalidate; },
    suspend() {
      suspended = true;
      readController?.abort();
      joinController?.abort();
      readController = undefined;
      inFlight = undefined;
      update(initialState);
    },
    resume() {
      suspended = false;
      if (listeners.size) void read();
    },
    sessionUnavailable() {
      update({ loading: false, error: "Não foi possível verificar sua sessão. Tente novamente." });
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        window.addEventListener("wimifarma:club-updated", changed);
        if (!synchronizedSession) window.addEventListener("focus", focused);
      }
      // New consumers (including checkout) revalidate, sharing only pending reads.
      void refresh();
      return () => {
        listeners.delete(listener);
        if (listeners.size) return;
        window.removeEventListener("wimifarma:club-updated", changed);
        window.removeEventListener("focus", focused);
        readController?.abort();
        joinController?.abort();
        readController = undefined;
        inFlight = undefined;
        state = initialState;
      };
    },
  };
}

export const ClubSummaryContext = createContext<ReturnType<typeof createClubSummaryStore> | null>(null);

export function useClubSummary(enabled = true) {
  const sharedStore = useContext(ClubSummaryContext);
  const [localStore] = useState(() => sharedStore ?? createClubSummaryStore());
  const store = sharedStore ?? localStore;
  const state = useSyncExternalStore(enabled ? store.subscribe : subscribeDisabled, enabled ? store.getSnapshot : getInitialState, getInitialState);
  return { ...state, join: store.join, refresh: store.refresh };
}
