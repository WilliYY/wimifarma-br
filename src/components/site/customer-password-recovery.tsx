"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrandSignature } from "@/components/site/brand-signature";
import { Input } from "@/components/ui/input";

const fieldClass = "mt-2 h-12 rounded-xl border-slate-300 bg-white text-base focus-visible:border-brand focus-visible:ring-brand/20";
const requestReceived = "Se houver uma conta elegível, enviaremos as instruções para o e-mail informado. Confira a caixa de entrada e o spam.";
const invalidLink = "Este link é inválido ou expirou. Solicite um novo link para recuperar sua senha.";
const recoveryCodePattern = /^[A-Za-z0-9_-]{43}$/;

export function CustomerPasswordRecovery() {
  const initialized = useRef(false);
  const submitting = useRef(false);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const resetting = Boolean(token || manualCode);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const fragment = window.location.hash;
    if (fragment) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
      const resetToken = /^#token=([A-Za-z0-9_-]{43})$/.exec(fragment)?.[1];
      if (resetToken) setToken(resetToken);
      else setError(invalidLink);
    } else if (new URLSearchParams(window.location.search).get("codigo") === "1") {
      setManualCode(true);
    }
    setReady(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    setError("");
    setNotice("");
    const fields = new FormData(event.currentTarget);
    const recoveryCode = token ?? String(fields.get("recoveryCode") ?? "").trim();
    const password = String(fields.get("password") ?? "");
    const confirmPassword = String(fields.get("confirmPassword") ?? "");
    if (resetting && !recoveryCodePattern.test(recoveryCode)) {
      setError("Cole o código completo recebido no e-mail.");
      return;
    }
    if (resetting && password !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    if (resetting && new TextEncoder().encode(password).length > 72) {
      setError("A senha ficou longa demais. Use menos caracteres, principalmente se incluir acentos ou emojis.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      const response = await fetch(resetting ? "/api/minha-conta/redefinir-senha" : "/api/minha-conta/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetting ? { token: recoveryCode, password, confirmPassword } : { email: String(fields.get("email") ?? "").trim() }),
      });

      if (response.status === 429) {
        setError("Aguarde alguns minutos antes de tentar novamente.");
        return;
      }
      const payload: unknown = await response.json().catch(() => null);
      if (response.status === 200 && payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string") {
        if (resetting) {
          setCompleted(true);
          setToken(null);
        } else {
          setNotice(requestReceived);
        }
        return;
      }
      if (resetting && [400, 404, 409, 410].includes(response.status)) {
        setToken(null);
        setManualCode(false);
        setError(token ? invalidLink : "Este código é inválido ou expirou. Solicite um novo código.");
        return;
      }
      if (response.status === 422) {
        setError(resetting ? "Confira o código e as orientações da senha. Os dois campos de senha precisam ser iguais." : "Confira o endereço de e-mail e tente novamente.");
        return;
      }
      setError("Não foi possível concluir agora. Tente novamente em instantes.");
    } catch {
      setError("Não foi possível conectar. Tente novamente em instantes.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="password-recovery-title" className="min-h-screen bg-surface-subtle px-4 pb-16 pt-40 text-ink lg:pt-56">
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-9">
        <BrandSignature />
        <h1 className="mt-6 text-[1.75rem] font-bold leading-tight tracking-tight" id="password-recovery-title">
          {completed ? "Senha atualizada" : resetting ? "Crie sua nova senha" : "Recuperar senha"}
        </h1>
        {completed ? (
          <p className="mt-3 text-sm leading-6 text-muted" role="status">Já pode entrar na Wimifarma com a nova senha.</p>
        ) : ready ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted">
              {resetting ? "Use pelo menos 6 caracteres. Letras com acento e emojis ocupam mais espaço." : "Informe o e-mail da sua conta para receber as instruções de recuperação."}
            </p>
            {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800" role="alert">{error}</p>}
            {notice && <p className="mt-4 rounded-xl bg-brand-soft p-3 text-sm leading-5" role="status">{notice}</p>}
            <form className="mt-5" key={resetting ? "reset" : "request"} method="post" onSubmit={handleSubmit}>
              <fieldset aria-busy={busy} className="space-y-4" disabled={busy}>
                {resetting ? (
                  <>
                    {manualCode && (
                      <label className="block text-sm font-semibold">
                        Código de recuperação
                        <Input autoCapitalize="none" autoComplete="off" className={fieldClass} name="recoveryCode" required spellCheck={false} />
                      </label>
                    )}
                    <label className="block text-sm font-semibold">
                      Nova senha
                      <Input autoComplete="new-password" className={fieldClass} maxLength={72} minLength={6} name="password" required type="password" />
                    </label>
                    <label className="block text-sm font-semibold">
                      Confirme a nova senha
                      <Input autoComplete="new-password" className={fieldClass} maxLength={72} minLength={6} name="confirmPassword" required type="password" />
                    </label>
                  </>
                ) : (
                  <label className="block text-sm font-semibold">
                    E-mail
                    <Input autoComplete="email" className={fieldClass} maxLength={254} name="email" required type="email" />
                  </label>
                )}
                <button className="min-h-12 w-full rounded-xl bg-brand px-5 text-base font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none" type="submit">
                  {busy ? "Aguarde…" : resetting ? "Salvar nova senha" : "Recuperar senha"}
                </button>
              </fieldset>
            </form>
            {!token && (
              <button className="mt-2 min-h-11 rounded-sm text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:opacity-60" disabled={busy} onClick={() => { setManualCode(!manualCode); setError(""); setNotice(""); }} type="button">
                {manualCode ? "Solicitar um código" : "Já tenho um código"}
              </button>
            )}
            {!resetting && <p className="mt-2 text-sm leading-6 text-muted">Se você usa sua conta Google para entrar, escolha “Continuar com Google” na tela de login.</p>}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted" role="status">Carregando…</p>
        )}
        <Link className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" href="/login">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Voltar para entrar
        </Link>
      </div>
    </section>
  );
}
