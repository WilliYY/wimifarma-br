"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { ONLINE_WINDOW_SECONDS, VISIT_HEARTBEAT_MS } from "@/features/analytics/online-presence";

type Snapshot = { online: number | null; measuredAt: string };

export function OnlineVisitorsCard({ initialCount, measuredAt }: { initialCount: number | null; measuredAt: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ online: initialCount, measuredAt });
  const [unavailable, setUnavailable] = useState(initialCount === null);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let controller: AbortController | undefined;
    async function refresh() {
      if (disposed || inFlight || document.visibilityState !== "visible" || !navigator.onLine) return;
      inFlight = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10_000);
      try {
        const response = await fetch("/api/admin/visitas/online", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (!response.ok) throw new Error("unavailable");
        const { data } = await response.json();
        if (!data || !Number.isSafeInteger(data.online) || data.online < 0 || typeof data.measuredAt !== "string" || !Number.isFinite(Date.parse(data.measuredAt))) throw new Error("invalid response");
        if (!disposed) {
          setSnapshot({ online: data.online, measuredAt: data.measuredAt });
          setUnavailable(false);
        }
      } catch {
        if (!disposed) setUnavailable(true);
      } finally {
        clearTimeout(timeout);
        inFlight = false;
      }
    }
    const update = () => { void refresh(); };
    const offline = () => setUnavailable(true);
    const timer = setInterval(update, VISIT_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("online", update);
    window.addEventListener("offline", offline);
    update();
    return () => {
      disposed = true;
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", offline);
    };
  }, []);

  const updatedAt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(snapshot.measuredAt));

  return (
    <section aria-label="Visitantes online" className="rounded-xl border border-teal-200 bg-teal-50 p-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-teal-800">
          <Radio aria-hidden="true" className="size-4" />
        </span>
        <h2 className="text-sm font-bold leading-tight text-teal-950">Visitantes online agora</h2>
      </div>
      <p aria-live="polite" aria-atomic="true" className="mt-1.5 text-2xl font-black leading-tight tabular-nums text-teal-950">
        {snapshot.online === null ? "—" : snapshot.online.toLocaleString("pt-BR")}
        <span className="ml-1.5 text-xs font-semibold">
          {snapshot.online === 1 ? "navegador ativo" : "navegadores ativos"}
        </span>
      </p>
      <p className="mt-1 text-xs leading-snug text-teal-900">
        Atividade no site visível nos últimos {ONLINE_WINDOW_SECONDS / 60} minutos.
        Abas do mesmo navegador contam uma vez.
      </p>
      <div className="mt-2 space-y-0.5 border-t border-teal-200 pt-1.5 text-xs leading-snug text-teal-900">
        <p className={unavailable ? "font-bold text-amber-900" : undefined}>
          {unavailable ? "Atualização indisponível" : "Atualiza a cada 30 s"}
        </p>
        <p>
          {snapshot.online === null ? "Aguardando consulta." : (
            <>
              {unavailable ? "Última consulta válida" : "Consultado"} às{" "}
              <time dateTime={snapshot.measuredAt}>{updatedAt}</time> (Brasília).
            </>
          )}
        </p>
      </div>
      <details className="mt-1.5 text-xs leading-snug text-teal-900">
        <summary className="cursor-pointer font-semibold">Como é contado</summary>
        <p className="mt-1">
          A estimativa inclui a equipe no site público. Outros navegadores, perfis e abas anônimas podem contar separadamente.
        </p>
      </details>
    </section>
  );
}
