"use client";

import Link from "next/link";
import { getProviders, getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, Crown, Eye, EyeOff, Loader2, LockKeyhole, Mail, Package, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { BrandSignature } from "@/components/site/brand-signature";

function Field({ autoComplete, icon, label, name, placeholder, type = "text" }: {
  autoComplete?: string; icon: ReactNode; label: string; name: string; placeholder: string; type?: string;
}) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return <label className="grid min-w-0 gap-2">
    <span className="text-sm font-bold text-ink">{label}</span>
    <span className="group relative block">
      <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand">{icon}</span>
      <Input autoComplete={autoComplete} className={`h-13 rounded-xl border-slate-300 bg-white pl-11 text-base shadow-none transition focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/10 ${password ? "pr-12" : "pr-4"}`} name={name} placeholder={placeholder} required type={password && visible ? "text" : type} />
      {password && <button aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLocaleLowerCase("pt-BR")}`} aria-pressed={visible} className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand" onClick={() => setVisible(value => !value)} type="button">{visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}</button>}
    </span>
  </label>;
}

const submitClass = "group inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-brand px-5 text-base font-bold text-white shadow-[0_6px_16px_rgba(200,16,46,0.16)] transition hover:bg-brand-dark active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none";

export function CustomerAuthPage({ callbackUrl = "/minha-conta" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isEntering, setIsEntering] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = isEntering || isRegistering || googleLoading;

  async function handleGoogleSignIn() {
    if (busy) return;
    setGoogleLoading(true); setError(null);
    try {
      const providers = await getProviders();
      if (!providers?.google) { setError("O acesso com Google está indisponível. Use seu e-mail e senha."); return; }
      await signIn("google", { callbackUrl });
    } catch { setError("Não foi possível abrir o acesso com Google. Tente novamente."); }
    finally { setGoogleLoading(false); }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const login = String(values.get("login") ?? "").trim();
    const password = String(values.get("password") ?? "");
    if (!login || !password) { setError("Informe seu e-mail ou usuário e sua senha."); return; }
    setIsEntering(true); setError(null);
    try {
      const result = await signIn("credentials", { email: login, password, redirect: false });
      if (!result || result.error) { setError("Não foi possível entrar com estes dados. Confira e tente novamente."); return; }
      const session = await getSession();
      const isAdmin = ["ADMIN", "MANAGER", "STAFF"].includes(session?.user?.role ?? "");
      toast.success(isAdmin ? "Acesso administrativo liberado." : "Bem-vindo à Wimifarma.");
      router.push(isAdmin ? "/admin/dashboard" : callbackUrl); router.refresh();
    } catch { setError("Não foi possível conectar. Seus dados foram mantidos para tentar novamente."); }
    finally { setIsEntering(false); }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") ?? "").trim();
    const email = String(values.get("email") ?? "").trim();
    const phone = String(values.get("phone") ?? "").trim();
    const password = String(values.get("new-password") ?? "");
    const confirmPassword = String(values.get("confirm-password") ?? "");
    if (password !== confirmPassword) { setError("As senhas precisam ser iguais."); return; }
    setIsRegistering(true); setError(null);
    let created = false;
    try {
      const response = await fetch("/api/minha-conta/register", { body: JSON.stringify({ confirmPassword, email, name, password, phone }), headers: { "Content-Type": "application/json" }, method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(payload.message ?? "Não foi possível criar sua conta. Confira os campos."); return; }
      created = true;
      toast.success("Conta criada.");
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result && !result.error) { router.push(callbackUrl); router.refresh(); return; }
      setMode("login"); setError("Sua conta foi criada. Entre com seu e-mail e senha.");
    } catch { setError(created ? "Sua conta foi criada. Entre com seu e-mail e senha." : "Não foi possível confirmar o cadastro. Tente entrar antes de repetir o envio."); if (created) setMode("login"); }
    finally { setIsRegistering(false); }
  }

  return <section className="min-h-screen bg-surface-subtle px-4 pb-16 pt-40 text-ink sm:px-6 lg:px-8 lg:pt-56">
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-[0_18px_60px_rgba(17,24,39,0.07)] lg:grid-cols-[0.85fr_1.15fr]">
      <aside className="relative flex flex-col justify-between gap-8 overflow-hidden bg-[#fff5f6] p-6 sm:p-9 lg:p-10">
        <div><BrandSignature className="w-40" /><p className="mt-7 text-xs font-bold uppercase tracking-[0.15em] text-brand">Sua conta Wimifarma</p><h1 className="mt-3 max-w-xs text-3xl font-black leading-tight tracking-tight sm:text-4xl">Tudo que cuida de você, mais perto.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-muted">Entre e tenha suas compras e benefícios sempre à mão.</p></div>
        <div className="hidden space-y-5 lg:block">{[{ icon: Package, title: "Seus pedidos", text: "Acompanhe cada compra em um só lugar." }, { icon: Crown, title: "Club Wimifarma", text: "Participe de graça e acompanhe seus WimiCoins." }, { icon: Check, title: "Mais praticidade", text: "Seus dados salvos para a próxima compra." }].map(item => <div className="flex gap-3" key={item.title}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand"><item.icon aria-hidden="true" className="h-4 w-4" /></span><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted">{item.text}</p></div></div>)}</div>
        <Link className="hidden min-h-11 items-center gap-2 text-xs font-bold text-brand underline-offset-4 hover:underline lg:inline-flex" href="/catalogo">Conhecer os produtos <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      </aside>
      <div className="min-w-0 p-6 sm:p-9 lg:min-h-[670px] lg:p-10">
        <div aria-label="Escolha como acessar sua conta" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-subtle p-1" role="group">{[{ id: "login" as const, title: "Entrar" }, { id: "register" as const, title: "Criar conta" }].map(item => <button aria-pressed={mode === item.id} className={`min-h-12 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 ${mode === item.id ? "bg-white text-brand shadow-sm" : "text-muted hover:bg-white/60 hover:text-ink"}`} disabled={busy} key={item.id} onClick={() => { setMode(item.id); setError(null); }} type="button">{item.title}</button>)}</div>
        <div className="mt-7"><h2 className="text-2xl font-black tracking-tight">{mode === "login" ? "Que bom ter você aqui." : "Vamos criar sua conta?"}</h2><p className="mt-2 text-sm leading-6 text-muted">{mode === "login" ? "Use seu e-mail ou usuário para continuar." : "É rápido. Preencha seus dados para começar."}</p></div>
        <button className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold transition hover:border-brand/40 hover:bg-brand-soft/30 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50" disabled={busy} onClick={() => void handleGoogleSignIn()} type="button">{googleLoading ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <span aria-hidden="true" className="text-lg font-black text-[#4285f4]">G</span>}Continuar com Google</button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />ou com seus dados<span className="h-px flex-1 bg-line" /></div>
        {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800" role="alert">{error}</p>}
        <form aria-label="Entrar na conta" className="space-y-4" hidden={mode !== "login"} onSubmit={handleLoginSubmit}>
          <fieldset className="space-y-4" disabled={busy}><Field autoComplete="username" icon={<Mail className="h-4 w-4" />} label="E-mail ou usuário" name="login" placeholder="Digite seu e-mail ou usuário" /><Field autoComplete="current-password" icon={<LockKeyhole className="h-4 w-4" />} label="Senha" name="password" placeholder="Digite sua senha" type="password" /><button className={`${submitClass} mt-2`} disabled={busy} type="submit">{isEntering ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}{isEntering ? "Entrando…" : "Entrar na minha conta"}<ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></button></fieldset>
        </form>
        <form aria-label="Criar conta" className="space-y-4" hidden={mode !== "register"} onSubmit={handleRegisterSubmit}>
          <fieldset className="space-y-4" disabled={busy}><Field autoComplete="name" icon={<UserRound className="h-4 w-4" />} label="Nome" name="name" placeholder="Como podemos chamar você?" /><div className="grid gap-4 sm:grid-cols-2"><Field autoComplete="email" icon={<Mail className="h-4 w-4" />} label="E-mail" name="email" placeholder="Seu e-mail" type="email" /><Field autoComplete="tel" icon={<Phone className="h-4 w-4" />} label="Telefone" name="phone" placeholder="(44) 99999-9999" type="tel" /></div><div className="grid gap-4 sm:grid-cols-2"><Field autoComplete="new-password" icon={<LockKeyhole className="h-4 w-4" />} label="Senha" name="new-password" placeholder="Crie sua senha" type="password" /><Field autoComplete="new-password" icon={<LockKeyhole className="h-4 w-4" />} label="Confirmar senha" name="confirm-password" placeholder="Repita sua senha" type="password" /></div><button className={`${submitClass} mt-2`} disabled={busy} type="submit">{isRegistering ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}{isRegistering ? "Criando sua conta…" : "Criar minha conta"}<ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></button></fieldset>
        </form>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs leading-5 text-muted"><LockKeyhole aria-hidden="true" className="h-3 w-3 shrink-0" />Seus dados ficam protegidos na sua conta.</p><p className="mt-2 text-center text-xs text-muted"><Link className="font-semibold underline underline-offset-4 hover:text-brand" href="/privacidade">Política de privacidade</Link></p>
      </div>
    </div>
  </section>;
}
