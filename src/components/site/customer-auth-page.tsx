"use client";

import Link from "next/link";
import { getProviders, getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, Crown, Eye, EyeOff, Loader2, LockKeyhole, Mail, Package, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { BrandSignature } from "@/components/site/brand-signature";

function Field({ autoComplete, icon, label, name, placeholder, type = "text" }: {
  autoComplete?: string; icon: ReactNode; label: string; name: string; placeholder: string; type?: string;
}) {
  const inputId = useId();
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return <div className="grid min-w-0 gap-2">
    <label className="text-sm font-semibold text-ink" htmlFor={inputId}>{label}</label>
    <span className="group relative block">
      <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand">{icon}</span>
      <Input autoComplete={autoComplete} className={`h-12 rounded-xl border-slate-300 bg-white pl-11 text-base shadow-none transition hover:border-slate-400 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/10 motion-reduce:transition-none ${password ? "pr-12" : "pr-4"}`} id={inputId} name={name} placeholder={placeholder} required type={password && visible ? "text" : type} />
      {password && <button aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLocaleLowerCase("pt-BR")}`} aria-pressed={visible} className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand" onClick={() => setVisible(value => !value)} type="button">{visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}</button>}
    </span>
  </div>;
}

// Asset original do configurador oficial: https://developers.google.com/identity/branding-guidelines
function GoogleMark() {
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" fill="#EA4335" />
    <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" fill="#4285F4" />
    <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" fill="#FBBC05" />
    <path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" fill="#34A853" />
    <path d="M0 0h48v48H0z" fill="none" />
  </svg>;
}

const submitClass = "group inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-brand px-5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-strong active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none";

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

  return (
    <section aria-labelledby="account-access-title" className="min-h-screen bg-surface-subtle px-4 pb-16 pt-40 text-ink sm:px-6 lg:px-8 lg:pt-56">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-[0_16px_48px_rgba(17,24,39,0.06)] lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="hidden flex-col justify-between gap-10 bg-brand-strong p-9 text-white lg:flex">
          <div>
            <BrandSignature />
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Sua conta Wimifarma</p>
            <p className="mt-4 max-w-xs text-4xl font-bold leading-[1.12] tracking-tight">Seu cuidado,<br />sempre por perto.</p>
            <p className="mt-4 max-w-xs text-base leading-6 text-white/85">Pedidos, benefícios e praticidade para o seu dia a dia.</p>
          </div>
          <div className="space-y-5 border-y border-white/20 py-7">
            {[
              { icon: Package, title: "Seus pedidos", text: "Acompanhe cada compra em um só lugar." },
              { icon: Crown, title: "Club Wimifarma", text: "Participe de graça e acompanhe seus WimiCoins." },
              { icon: Check, title: "Mais praticidade", text: "Seus dados salvos para a próxima compra." },
            ].map(item => (
              <div className="flex items-start gap-3" key={item.title}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"><item.icon aria-hidden="true" className="h-[18px] w-[18px]" /></span>
                <div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-sm leading-5 text-white/80">{item.text}</p></div>
              </div>
            ))}
          </div>
          <Link className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" href="/catalogo">Conhecer os produtos <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </aside>
        <div className="min-w-0 px-5 py-6 sm:p-8 lg:flex lg:min-h-[610px] lg:flex-col lg:justify-center lg:px-10">
          <div className="mb-6 lg:hidden"><BrandSignature /></div>
          <div aria-label="Escolha como acessar sua conta" className="grid grid-cols-2 gap-1 rounded-full bg-surface-subtle p-1" role="group">
            {[{ id: "login" as const, title: "Entrar" }, { id: "register" as const, title: "Criar conta" }].map(item => (
              <button aria-pressed={mode === item.id} className={`min-h-10 rounded-full px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 motion-reduce:transition-none ${mode === item.id ? "bg-white text-brand shadow-sm ring-1 ring-black/5" : "text-muted hover:text-ink"}`} disabled={busy} key={item.id} onClick={() => { setMode(item.id); setError(null); }} type="button">{item.title}</button>
            ))}
          </div>
          <div className="mb-5 mt-6">
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight" id="account-access-title">{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h1>
            <p className="mt-2 text-sm leading-5 text-muted">{mode === "login" ? "Acesse seus pedidos e aproveite seus benefícios." : "Preencha seus dados para começar a cuidar de você."}</p>
          </div>
          <button aria-busy={googleLoading} className="relative inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-white px-3 text-sm font-medium text-[#1f1f1f] [font-family:Arial,sans-serif] transition-colors hover:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285f4] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none" disabled={busy} onClick={() => void handleGoogleSignIn()} type="button">
            <GoogleMark />
            <span>Continuar com Google</span>
            {googleLoading && <Loader2 aria-hidden="true" className="absolute right-3 h-4 w-4 animate-spin motion-reduce:animate-none" />}
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />ou use seu e-mail<span className="h-px flex-1 bg-line" /></div>
          {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800" role="alert">{error}</p>}
          <form aria-label="Entrar na conta" hidden={mode !== "login"} onSubmit={handleLoginSubmit}>
            <fieldset className="space-y-4" disabled={busy}>
              <Field autoComplete="username" icon={<Mail className="h-4 w-4" />} label="E-mail ou usuário" name="login" placeholder="Digite seu e-mail ou usuário" />
              <Field autoComplete="current-password" icon={<LockKeyhole className="h-4 w-4" />} label="Senha" name="password" placeholder="Digite sua senha" type="password" />
              <button className={`${submitClass} mt-2`} disabled={busy} type="submit">{isEntering && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}{isEntering ? "Entrando…" : "Entrar na minha conta"}<ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></button>
            </fieldset>
          </form>
          <form aria-label="Criar conta" hidden={mode !== "register"} onSubmit={handleRegisterSubmit}>
            <fieldset className="space-y-4" disabled={busy}>
              <Field autoComplete="name" icon={<UserRound className="h-4 w-4" />} label="Nome" name="name" placeholder="Como podemos chamar você?" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field autoComplete="email" icon={<Mail className="h-4 w-4" />} label="E-mail" name="email" placeholder="Seu e-mail" type="email" />
                <Field autoComplete="tel" icon={<Phone className="h-4 w-4" />} label="Telefone" name="phone" placeholder="(44) 99999-9999" type="tel" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field autoComplete="new-password" icon={<LockKeyhole className="h-4 w-4" />} label="Senha" name="new-password" placeholder="Crie sua senha" type="password" />
                <Field autoComplete="new-password" icon={<LockKeyhole className="h-4 w-4" />} label="Confirmar senha" name="confirm-password" placeholder="Repita sua senha" type="password" />
              </div>
              <button className={`${submitClass} mt-2`} disabled={busy} type="submit">{isRegistering && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}{isRegistering ? "Criando sua conta…" : "Criar minha conta"}<ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></button>
            </fieldset>
          </form>
          <div className="mt-6 border-t border-line pt-4 text-center text-xs leading-5 text-muted">
            <p className="flex items-center justify-center gap-1.5"><LockKeyhole aria-hidden="true" className="h-3 w-3 shrink-0" />Seus dados ficam protegidos na sua conta.</p>
            <Link className="mt-1 inline-block rounded-sm font-medium underline underline-offset-4 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand" href="/privacidade">Política de privacidade</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
