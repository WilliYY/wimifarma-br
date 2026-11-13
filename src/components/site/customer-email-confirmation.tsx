"use client";

import { BadgeCheck, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const codePattern = /^[A-Za-z0-9_-]{43}$/;

export function CustomerEmailConfirmation({ verified }: { verified: boolean }) {
  const router = useRouter();
  const [enteringCode, setEnteringCode] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const enabled = verified || confirmed;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");
    const token = String(fields.get("token") ?? "").trim();
    setNotice("");
    setError("");

    if (enteringCode && !codePattern.test(token)) {
      setError("Confira o código e cole todos os caracteres.");
      return;
    }

    const failure = enteringCode
      ? "Não foi possível confirmar o e-mail. Confira a senha e o código ou solicite outro código."
      : "Não foi possível solicitar o código. Confira a senha e tente novamente.";

    setBusy(true);
    try {
      const response = await fetch("/api/minha-conta/confirmar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enteringCode ? { password, token } : { password }),
      });

      if (!response.ok) {
        setError(failure);
        return;
      }

      if (enteringCode) {
        const result = await response.json();
        if (result.verified !== true) {
          setError(failure);
          return;
        }
        setConfirmed(true);
        setNotice("E-mail confirmado. A recuperação de senha está habilitada.");
        router.refresh();
      } else {
        setEnteringCode(true);
        setNotice("Se o e-mail puder ser confirmado, você receberá um código. Confira a caixa de entrada e o spam.");
      }
      form.reset();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-slate-50 p-5 xl:col-span-2" aria-labelledby="email-confirmation-title">
      <h3 id="email-confirmation-title" className="flex items-center gap-2 text-sm font-black">
        {enabled ? <BadgeCheck aria-hidden="true" className="h-4 w-4 text-emerald-700" /> : <Mail aria-hidden="true" className="h-4 w-4 text-brand" />}
        Recuperação de senha por e-mail
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted" role="status">
        {notice || (enabled ? "E-mail confirmado para recuperar sua senha." : "Confirme o e-mail da sua conta para poder redefinir a senha se precisar.")}
      </p>
      {!enabled ? (
        <form key={String(enteringCode)} className="mt-4 grid max-w-md gap-4" method="post" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-sm font-bold" htmlFor="email-confirmation-password">Senha atual</label>
            <Input autoComplete="current-password" disabled={busy} id="email-confirmation-password" name="password" required type="password" />
          </div>
          {enteringCode ? (
            <div>
              <label className="mb-1.5 block text-sm font-bold" htmlFor="email-confirmation-code">Código recebido por e-mail</label>
              <Input autoCapitalize="none" autoComplete="one-time-code" disabled={busy} id="email-confirmation-code" name="token" required spellCheck={false} type="text" />
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm font-medium text-brand">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} type="submit">
              {busy ? "Aguarde…" : enteringCode ? "Confirmar e-mail" : "Enviar código"}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setEnteringCode(!enteringCode);
                setError("");
                setNotice("");
              }}
              type="button"
              variant="secondary"
            >
              {enteringCode ? "Solicitar outro código" : "Já tenho um código"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
