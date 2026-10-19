"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bell, Check, Mail, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { productDisplayName } from "@/features/products/display-name";

type Interest = { id: string; status: string; whatsapp: boolean; emailEnabled: boolean };
type Details = { contact: { phone: string | null; email: string | null }; interest: Interest | null; available: boolean };

export function RestockButton({ product, compact = false }: { product: { id: string; name: string; slug: string }; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState(false);
  const [email, setEmail] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true); setDetails(null); setError(null); setGuest(false); setSaved(false);
    setWhatsapp(false); setEmail(false); setConsent(false);
    async function load() {
      try {
        const response = await fetch(`/api/minha-conta/avisos-estoque?productId=${encodeURIComponent(product.id)}`, { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 401) { setGuest(true); return; }
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Não foi possível consultar este aviso.");
        if (!payload.contact || !Object.hasOwn(payload, "interest")) throw new Error("Não foi possível consultar este aviso.");
        if (controller.signal.aborted) return;
        setDetails(payload);
        if (payload.interest?.status === "WAITING") {
          setWhatsapp(payload.interest.whatsapp); setEmail(payload.interest.emailEnabled); setSaved(true);
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Tente novamente em instantes.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => { controller.abort(); pending.current?.abort(); };
  }, [open, product.id, revision]);

  async function subscribe(event: FormEvent) {
    event.preventDefault();
    if (saving || loading || !consent || (!whatsapp && !email)) return;
    const controller = new AbortController(); pending.current = controller;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/minha-conta/avisos-estoque", {
        method: "POST", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, whatsapp, email, consent: true }),
      });
      if (controller.signal.aborted) return;
      if (response.status === 401) { setDetails(null); setGuest(true); return; }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível salvar seu aviso.");
      if (!controller.signal.aborted) { setSaved(true); window.dispatchEvent(new Event("wimifarma:restock-updated")); }
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível salvar. Confira seus avisos antes de tentar novamente.");
    } finally { if (!controller.signal.aborted) setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { pending.current?.abort(); setSaving(false); setDetails(null); } }}>
    <DialogTrigger asChild><button className={`inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand/25 bg-brand-soft px-4 font-bold text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand ${compact ? "text-xs" : "text-sm"}`} type="button"><Bell aria-hidden="true" className="h-4 w-4 shrink-0" />Avise-me quando chegar</button></DialogTrigger>
    <DialogContent className="max-w-md rounded-2xl p-6 sm:p-7">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Bell aria-hidden="true" className="h-6 w-6" /></span>
      <DialogTitle className="pr-5 text-xl font-black">Quer saber quando voltar?</DialogTitle>
      <DialogDescription className="leading-6">{productDisplayName(product.name)}</DialogDescription>
      {loading ? <p className="text-sm text-muted" role="status">Consultando seus avisos…</p> : guest ? <div className="space-y-4"><p className="text-sm leading-6 text-muted">Entre na sua conta para escolher onde receber o aviso e poder cancelá-lo depois.</p><Link className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white" href={`/login?callbackUrl=${encodeURIComponent(`/produto/${product.slug}`)}`}>Entrar ou criar conta</Link></div> : details?.available ? <div><p className="text-sm leading-6 text-pharma-green" role="status">Este produto já tem disponibilidade para consulta.</p><a className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-brand underline" href={`/produto/${product.slug}`}>Atualizar página do produto</a></div> : saved ? <div className="space-y-4"><p className="flex items-center gap-2 text-sm font-bold text-pharma-green" role="status"><Check aria-hidden="true" className="h-5 w-5" />Seu interesse está registrado</p><p className="text-sm leading-6 text-muted">A equipe poderá avisar por {whatsapp && email ? "WhatsApp e e-mail" : whatsapp ? "WhatsApp" : "e-mail"} quando houver disponibilidade. O aviso vale por 30 dias e não reserva estoque.</p><Link className="inline-flex min-h-11 items-center text-sm font-bold text-brand underline" href="/minha-conta#avisos">Ver ou cancelar meus avisos</Link></div> : details ? <form className="space-y-4" onSubmit={subscribe}>
        <fieldset className="space-y-2" disabled={saving}>
          <legend className="mb-3 text-sm font-bold">Onde prefere receber?</legend>
          {[{ key: "whatsapp", label: "WhatsApp", icon: MessageCircle, contact: details.contact.phone, checked: whatsapp, change: setWhatsapp }, { key: "email", label: "E-mail", icon: Mail, contact: details.contact.email, checked: email, change: setEmail }].map(channel => <label className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${channel.checked ? "border-brand/40 bg-brand-soft/50" : "border-line"}`} key={channel.key}>
            <input checked={channel.checked} className="h-4 w-4 shrink-0 accent-brand" disabled={!channel.contact} onChange={event => channel.change(event.target.checked)} type="checkbox" />
            <channel.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 text-sm"><span className="block font-bold">{channel.label}</span><span className="block break-all text-xs leading-5 text-muted">{channel.contact || "Adicione em Meus dados"}</span></span>
          </label>)}
        </fieldset>
        {(!details.contact.phone || !details.contact.email) && <Link className="inline-block text-xs font-bold text-brand underline" href="/minha-conta#perfil">Atualizar meus dados de contato</Link>}
        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-muted"><input checked={consent} className="mt-1 h-4 w-4 shrink-0 accent-brand" disabled={saving} onChange={event => setConsent(event.target.checked)} required type="checkbox" /><span>Autorizo a Wimifarma a usar os contatos escolhidos somente para este aviso, por até 30 dias. Posso cancelar na minha conta. <Link className="font-bold underline" href="/privacidade" target="_blank" rel="noreferrer">Privacidade</Link></span></label>
        <button className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={saving || !consent || (!whatsapp && !email)} type="submit">{saving ? "Salvando…" : "Quero receber o aviso"}</button>
        <p className="text-xs leading-5 text-muted">O envio é feito pela equipe. Este aviso não garante preço, prazo ou reserva.</p>
      </form> : null}
      {error && <div><p className="text-sm text-red-700" role="alert">{error}</p>{!details && <button className="mt-2 min-h-11 text-sm font-bold text-brand underline" onClick={() => setRevision(value => value + 1)} type="button">Tentar novamente</button>}</div>}
    </DialogContent>
  </Dialog>;
}
