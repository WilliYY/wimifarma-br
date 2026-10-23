"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type NoticeOrder = { id: string; number: string; createdAt: string };
type OrderSummary = { pending: number; latestId: string | null; latestCreatedAt: string | null; orders: NoticeOrder[] };

export function readNoticeIds(raw: string | null): string[] {
  try {
    if (!raw || raw.length > 20000) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 80))].slice(-100);
  } catch { return []; }
}

function readSummary(value: unknown): OrderSummary {
  const data = value && typeof value === "object" && "data" in value ? value.data : null;
  if (!data || typeof data !== "object" || !("pending" in data) || !Number.isSafeInteger(data.pending) || Number(data.pending) < 0
    || !("latestId" in data) || !(data.latestId === null || typeof data.latestId === "string")
    || !("latestCreatedAt" in data) || !(data.latestCreatedAt === null || typeof data.latestCreatedAt === "string" && Number.isFinite(Date.parse(data.latestCreatedAt)))
    || (data.latestId === null) !== (data.latestCreatedAt === null)
    || !("orders" in data) || !Array.isArray(data.orders) || data.orders.length > 10
    || data.orders.some(order => !order || typeof order !== "object" || typeof order.id !== "string" || !order.id || order.id.length > 80
      || typeof order.number !== "string" || !order.number || order.number.length > 80
      || typeof order.createdAt !== "string" || !Number.isFinite(Date.parse(order.createdAt)))
    || new Set(data.orders.map(order => order.id)).size !== data.orders.length
    || (data.orders[0]?.id ?? null) !== data.latestId
    || (data.orders[0]?.createdAt ?? null) !== data.latestCreatedAt) throw new Error("Invalid order summary");
  return data as OrderSummary;
}

export function AdminOrderNotice({ viewerKey }: { viewerKey: string }) {
  const router = useRouter();
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const readIdsRef = useRef<string[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [orders, setOrders] = useState<NoticeOrder[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const storageKey = `wimifarma-order-notice:v1:${encodeURIComponent(viewerKey)}`;

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let initialized = false;
    let latest: OrderSummary | null = null;
    let stored: string[] = [];
    try { stored = readNoticeIds(window.localStorage.getItem(storageKey)); } catch { /* Storage can be denied; keep this session usable. */ }
    readIdsRef.current = stored;
    setReadIds(stored);
    setOrders([]);
    setPending(null);
    setOpen(false);

    const poll = async () => {
      if (!active || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch("/api/admin/pedidos/resumo", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Order summary unavailable");
        const data = readSummary(await response.json());
        if (controller.signal.aborted) throw new Error("Order summary timed out");
        if (!active) return;
        setPending(data.pending);
        setOrders(data.orders);
        setUnavailable(false);
        const newer = data.latestId !== null && data.latestCreatedAt !== null && (latest?.latestCreatedAt == null
          || Date.parse(data.latestCreatedAt) > Date.parse(latest.latestCreatedAt)
          || Date.parse(data.latestCreatedAt) === Date.parse(latest.latestCreatedAt) && data.latestId > (latest.latestId ?? ""));
        if (initialized && newer) {
          if (data.orders.some(order => !readIdsRef.current.includes(order.id) && (latest?.latestCreatedAt == null
            || Date.parse(order.createdAt) > Date.parse(latest.latestCreatedAt)
            || Date.parse(order.createdAt) === Date.parse(latest.latestCreatedAt) && order.id > (latest.latestId ?? "")))) setOpen(true);
          router.refresh();
        }
        if (!initialized || newer) latest = data;
        initialized = true;
      } catch {
        if (active) setUnavailable(true);
      } finally {
        if (timeout !== null) clearTimeout(timeout);
        timeout = null;
        controller = null;
        inFlight = false;
      }
    };

    void poll();
    const interval = setInterval(() => { void poll(); }, 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      clearInterval(interval);
      if (timeout !== null) clearTimeout(timeout);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, storageKey]);

  function markViewed(id: string) {
    const ids = [...readIdsRef.current.filter(value => value !== id), id].slice(-100);
    readIdsRef.current = ids;
    setReadIds(ids);
    try { window.localStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* The in-memory acknowledgement still applies. */ }
  }

  const unread = orders.filter(order => !readIds.includes(order.id));

  return (
    <div className="relative flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs" onKeyDown={event => { if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); } }}>
      <button type="button" ref={trigger} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-3 py-2 font-bold text-ink hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
        Pedidos
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand" aria-label={pending === null ? "Contagem de pedidos ainda não disponível" : `${pending} pedidos novos pendentes`}>
          {pending ?? "—"}
        </span>
      </button>
      <span role="status" aria-live="polite" className={unavailable ? "text-amber-700" : "text-brand"}>
        {unavailable ? "Atualização de pedidos indisponível." : unread.length ? `${unread.length} ${unread.length === 1 ? "aviso não visualizado" : "avisos não visualizados"}.` : ""}
      </span>
      {open ? <section id={panelId} aria-label="Avisos de pedidos" className="absolute left-0 top-full z-50 mt-2 max-h-[min(32rem,70dvh)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-line bg-white p-3 text-ink shadow-xl sm:left-auto sm:right-0">
        <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">Novos pedidos</h2><button type="button" aria-label="Fechar avisos de pedidos" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-brand-soft" onClick={() => setOpen(false)}><X className="size-4" /></button></div>
        <p className="mb-3 text-xs text-muted">{pending ?? "—"} pendentes no total · {unread.length} {unread.length === 1 ? "não visualizado" : "não visualizados"} entre os últimos 10.</p>
        {unread.length ? <ul className="space-y-3">{unread.map(order => <li key={order.id} className="min-w-0 rounded-md border border-line p-3">
          <p className="break-words text-sm font-bold">Pedido {order.number} foi realizado.</p>
          <time className="mt-1 block text-xs text-muted" dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString("pt-BR")}</time>
          <div className="mt-2 flex flex-wrap gap-2"><Link href={`/admin/pedidos?pedido=${encodeURIComponent(order.id)}`} className="inline-flex min-h-10 items-center rounded-md bg-brand px-3 py-2 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">Ir para pedido</Link><button type="button" className="inline-flex min-h-10 items-center gap-1 rounded-md border border-line px-3 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => markViewed(order.id)}><Check className="size-4" aria-hidden="true" />Marcar visualizado</button></div>
        </li>)}</ul> : <p className="py-4 text-sm text-muted">Nenhum aviso não visualizado.</p>}
        <Link href="/admin/pedidos" className="mt-3 inline-flex min-h-10 items-center font-bold text-brand">Ver todos os pedidos</Link>
      </section> : null}
    </div>
  );
}
