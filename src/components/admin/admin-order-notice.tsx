"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

type OrderSummary = { pending: number; latestId: string | null; latestCreatedAt: string | null };

function readSummary(value: unknown): OrderSummary {
  const data = value && typeof value === "object" && "data" in value ? value.data : null;
  if (!data || typeof data !== "object" || !("pending" in data) || !Number.isSafeInteger(data.pending) || Number(data.pending) < 0
    || !("latestId" in data) || !(data.latestId === null || typeof data.latestId === "string")
    || !("latestCreatedAt" in data) || !(data.latestCreatedAt === null || typeof data.latestCreatedAt === "string" && Number.isFinite(Date.parse(data.latestCreatedAt)))
    || (data.latestId === null) !== (data.latestCreatedAt === null)) throw new Error("Invalid order summary");
  return data as OrderSummary;
}

export function AdminOrderNotice() {
  const router = useRouter();
  const [pending, setPending] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let initialized = false;
    let latest: OrderSummary | null = null;

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
        setUnavailable(false);
        const newer = data.latestId !== null && data.latestCreatedAt !== null && (latest?.latestCreatedAt == null
          || Date.parse(data.latestCreatedAt) > Date.parse(latest.latestCreatedAt)
          || Date.parse(data.latestCreatedAt) === Date.parse(latest.latestCreatedAt) && data.latestId > (latest.latestId ?? ""));
        if (initialized && newer) {
          setHasNew(true);
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
  }, [router]);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <Link href="/admin/pedidos" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-3 py-2 font-bold text-ink hover:bg-brand-soft">
        <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
        Pedidos
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand" aria-label={pending === null ? "Contagem de pedidos ainda não disponível" : `${pending} pedidos novos pendentes`}>
          {pending ?? "—"}
        </span>
      </Link>
      <span role="status" aria-live="polite" className={unavailable ? "text-amber-700" : "text-brand"}>
        {unavailable ? "Atualização de pedidos indisponível." : hasNew ? "Novo pedido recebido." : ""}
      </span>
    </div>
  );
}
