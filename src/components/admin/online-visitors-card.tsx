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

  const updatedAt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(snapshot.measuredAt));
  return (
    <section aria-label="Visitantes online" className="rounded-xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-teal-900"><Radio aria-hidden="true" className="h-5 w-5" />Visitantes online agora</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${unavailable ? "bg-amber-100 text-amber-900" : "bg-white text-teal-900"}`}>{unavailable ? "Atualização indisponível" : "Atualiza a cada 30 s"}</span>
      </div>
      <p aria-live="polite" aria-atomic="true" className="mt-4 text-4xl font-black tabular-nums text-teal-950">{snapshot.online === null ? "—" : snapshot.online.toLocaleString("pt-BR")}<span className="ml-2 text-sm font-semibold">{snapshot.online === 1 ? "navegador ativo" : "navegadores ativos"}</span></p>
      <p className="mt-2 text-sm leading-6 text-teal-900">Presença nos últimos {ONLINE_WINDOW_SECONDS / 60} minutos, com o site visível. Abas do mesmo navegador contam uma vez.</p>
      <p className="mt-2 text-xs leading-5 text-teal-900">Estimativa: outro navegador, perfil ou modo anônimo pode contar separadamente no mesmo aparelho. Inclui acessos da equipe ao site público.</p>
      <p className="mt-3 text-xs font-semibold text-teal-900">{snapshot.online === null ? "Aguardando consulta." : `${unavailable ? "Última consulta válida" : "Consultado"} às ${updatedAt} (Brasília).`}</p>
    </section>
  );
}
