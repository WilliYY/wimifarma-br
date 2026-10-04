"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BellRing,
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MessageCircle,
  RefreshCw,
  Save,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CustomerMessagePreview } from "@/components/admin/customer-message-preview";

type Settings = {
  enabled: boolean;
  cartAlerts: boolean;
  orderAlerts: boolean;
  paymentAlerts: boolean;
};

type AlertEvent = {
  id: string;
  type: "cart" | "order" | "payment" | "test";
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "UNCERTAIN";
  text: string;
  createdAt: string;
  sentAt: string | null;
  error: string | null;
};

type PanelData = {
  config: Settings;
  connection: {
    configured: boolean;
    recipientHint: string;
    status: "connected" | "unavailable" | "unknown" | "unconfigured";
  };
  summary: { pending: number; sent: number; failed: number; uncertain: number };
  events: AlertEvent[];
};

const connectionLabels = {
  connected: "WhatsApp conectado",
  unavailable: "WhatsApp indisponível",
  unknown: "Conexão ainda não confirmada",
  unconfigured: "Conexão não configurada",
};

const eventLabels = { cart: "Carrinho", order: "Pedido", payment: "Pagamento", test: "Teste" };
const statusLabels = {
  PENDING: "Na fila",
  PROCESSING: "Em processamento",
  SENT: "Enviado ao provedor",
  FAILED: "Falha no envio",
  UNCERTAIN: "Envio sem confirmação",
};
const statusColors = {
  PENDING: "bg-brand-soft text-brand",
  PROCESSING: "bg-blue-50 text-blue-800",
  SENT: "bg-emerald-50 text-emerald-800",
  FAILED: "bg-red-50 text-red-800",
  UNCERTAIN: "bg-amber-50 text-amber-900",
};
const alertOptions = [
  { key: "cartAlerts", label: "Movimentação de carrinho", description: "Resumo após 30 segundos de estabilidade, limitado a um aviso por 10 minutos por navegador. Não comprova abandono, compra ou reserva.", icon: ShoppingCart },
  { key: "orderAlerts", label: "Novos pedidos", description: "Avisa quando o checkout registra um pedido. Pedido registrado não significa pagamento confirmado.", icon: ShoppingBag },
  { key: "paymentAlerts", label: "Atualizações de pagamento", description: "Acompanha o resultado confirmado pelo gateway. A preparação e o atendimento continuam com a equipe.", icon: CreditCard },
] as const;

async function request(signal: AbortSignal, body?: Record<string, unknown>): Promise<PanelData> {
  const response = await fetch("/api/admin/miauby", {
    signal,
    cache: "no-store",
    method: body ? "POST" : "GET",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Não foi possível atualizar a Miauby.");
  }
  return payload.data as PanelData;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function MiaubyPanel() {
  const [data, setData] = useState<PanelData | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<"settings" | "test" | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const actionController = useRef<AbortController | null>(null);
  const mutationBusy = useRef(false);

  const load = useCallback(async () => {
    if (mutationBusy.current) return;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setRefreshing(true);
    try {
      const snapshot = await request(controller.signal);
      if (controller.signal.aborted) return;
      setData(snapshot);
      setSettings((current) => current ?? snapshot.config);
      setError("");
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha ao carregar a Miauby.");
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => {
      window.clearInterval(timer);
      loadController.current?.abort();
      actionController.current?.abort();
    };
  }, [load]);

  async function run(action: "settings" | "test") {
    if (mutationBusy.current || !settings) return;
    mutationBusy.current = true;
    loadController.current?.abort();
    const controller = new AbortController();
    actionController.current = controller;
    setRefreshing(false);
    setBusy(action);
    setError("");
    setNotice("");
    try {
      const snapshot = await request(controller.signal, action === "settings" ? { action, ...settings } : { action });
      if (controller.signal.aborted) return;
      setData(snapshot);
      if (action === "settings") setSettings(snapshot.config);
      const message = action === "settings"
        ? "Configuração salva."
        : "Teste solicitado. Confira o resultado no histórico e no seu WhatsApp.";
      setNotice(message);
      toast.success(message);
    } catch (cause) {
      if (controller.signal.aborted) return;
      const message = cause instanceof Error ? cause.message : "Não foi possível concluir a operação.";
      setError(message);
      toast.error(message);
    } finally {
      mutationBusy.current = false;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  const dirty = settings && data && Object.keys(settings).some((key) => settings[key as keyof Settings] !== data.config[key as keyof Settings]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-brand-soft via-white to-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <Image alt="Miauby, assistente da Wimifarma" className="h-20 w-20 shrink-0 rounded-2xl border border-white object-contain shadow-sm sm:h-24 sm:w-24" height={96} src="/brand/miauby-avatar.webp" width={96} />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Assistente Wimifarma</p>
              <h2 className="mt-1 text-2xl font-black text-ink">Miauby</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Conversa no site e alertas da loja no seu WhatsApp, usando a conexão do bot existente.</p>
            </div>
          </div>
          <Button className="self-start sm:self-center" disabled={refreshing || Boolean(busy)} onClick={() => void load()} variant="secondary">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} />
            Atualizar
          </Button>
        </div>
        <div className="grid gap-5 border-t border-line p-5 sm:grid-cols-2 sm:p-7">
          <div className="flex gap-3">
            <Bot aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-brand" />
            <div><h3 className="font-bold text-ink">Atendimento no site</h3><p className="mt-1 text-sm leading-6 text-muted">Ajuda a encontrar produtos do catálogo publicado e explica entrega, retirada e Farmácia Popular. Confirmações comerciais e clínicas seguem com a equipe.</p></div>
          </div>
          <div className="flex gap-3">
            <BellRing aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-brand" />
            <div><h3 className="font-bold text-ink">Alertas no WhatsApp</h3><p className="mt-1 text-sm leading-6 text-muted">Acompanhe carrinhos, pedidos e pagamentos. A Miauby continua no WhatsApp com as funções já existentes do bot.</p></div>
          </div>
        </div>
      </section>

      <CustomerMessagePreview />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error} {data && "Os dados exibidos podem estar desatualizados."}</div>}
      <p className="sr-only" role="status">{notice}</p>
      {!data && !error && <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-6 text-sm text-muted" role="status"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />Carregando conexão e histórico...</div>}

      {data && settings && (
        <>
          <section aria-label="Resumo dos alertas" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "Na fila / em processamento", value: data.summary.pending, color: "text-brand" },
              { label: "Enviados ao provedor", value: data.summary.sent, color: "text-emerald-700" },
              { label: "Falhas", value: data.summary.failed, color: "text-red-700" },
              { label: "Sem confirmação", value: data.summary.uncertain, color: "text-amber-700" },
            ].map((item) => <div className="rounded-xl border border-line bg-white p-4 sm:p-5" key={item.label}><p className={`text-2xl font-black ${item.color}`}>{item.value}</p><p className="mt-2 text-xs font-semibold leading-5 text-muted">{item.label}</p></div>)}
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <form className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" onSubmit={(event) => { event.preventDefault(); void run("settings"); }}>
              <h3 className="text-lg font-black text-ink">Quais avisos receber</h3>
              <p className="mt-1 text-sm leading-6 text-muted">Estas opções controlam os alertas da loja no WhatsApp.</p>
              <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-brand-soft p-4">
                <span><span className="block text-sm font-bold text-ink">Ativar alertas da loja</span><span className="mt-1 block text-xs leading-5 text-muted">A conexão precisa estar configurada no servidor.</span></span>
                <input checked={settings.enabled} className="h-5 w-5 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" disabled={Boolean(busy)} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} type="checkbox" />
              </label>
              <fieldset className="mt-3 space-y-3" disabled={Boolean(busy)}>
                <legend className="sr-only">Tipos de alertas</legend>
                {alertOptions.map(({ key, label, description, icon: Icon }) => (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4" key={key}>
                    <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink">{label}</span><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span>
                    <input checked={settings[key]} className="mt-1 h-5 w-5 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })} type="checkbox" />
                  </label>
                ))}
              </fieldset>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button disabled={Boolean(busy) || !dirty} type="submit">{busy === "settings" ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Save aria-hidden="true" className="h-4 w-4" />}Salvar opções</Button>
                {dirty && <span className="text-xs font-semibold text-muted">Alterações ainda não salvas</span>}
              </div>
            </form>

            <section className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-black text-ink">Conexão com o bot</h3>
              <div className="mt-5 flex items-start gap-3 rounded-xl bg-surface-subtle p-4">
                {data.connection.status === "connected" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <Clock3 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
                <div className="min-w-0"><p className="text-sm font-bold text-ink">{connectionLabels[data.connection.status]}</p><p className="mt-1 break-words text-xs leading-5 text-muted">{data.connection.configured ? `Destino dos avisos: ${data.connection.recipientHint || "WhatsApp do responsável"}.` : "Configure a conexão e o destinatário no ambiente do servidor."}</p></div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">O teste envia uma mensagem para o WhatsApp do responsável configurado. Acompanhe o resultado abaixo.</p>
              <Button className="mt-4 h-auto min-h-11 w-full whitespace-normal py-3" disabled={Boolean(busy) || !data.connection.configured || data.connection.status === "unavailable"} onClick={() => void run("test")} type="button" variant="success">
                {busy === "test" ? <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" /> : <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0" />}
                Enviar teste para meu WhatsApp
              </Button>
              <p className="mt-4 text-xs leading-5 text-muted">“Enviado ao provedor” confirma a aceitação do envio. Não comprova entrega nem leitura da mensagem.</p>
            </section>
          </div>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black text-ink">Histórico recente</h3><span className="text-xs font-medium text-muted">Atualiza a cada 30 segundos nesta página</span></div>
            {notice && <p className="mt-4 rounded-lg bg-brand-soft p-3 text-sm text-ink">{notice}</p>}
            {data.events.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-line p-6 text-center text-sm leading-6 text-muted">Nenhum alerta registrado ainda. Após configurar a conexão, envie um teste para verificar o caminho até seu WhatsApp.</p> : (
              <ul className="mt-5 space-y-3">
                {data.events.map((event) => (
                  <li className="min-w-0 rounded-xl border border-line p-4" key={event.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold text-ink">{eventLabels[event.type]}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[event.status]}`}>{statusLabels[event.status]}</span></div>
                    <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-ink">{event.text}</p>
                    <p className="mt-3 text-xs leading-5 text-muted">Registrado em <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>{event.sentAt && <> · Enviado em <time dateTime={event.sentAt}>{formatDate(event.sentAt)}</time></>}</p>
                    {event.error && <p className="mt-2 break-words text-xs leading-5 text-red-800">{event.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
