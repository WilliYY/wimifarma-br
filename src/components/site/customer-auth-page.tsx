"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const easeOut = [0.16, 1, 0.3, 1] as const;

function GoogleButton({ label }: { label: string }) {
  return (
    <button
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand"
      onClick={() =>
        toast.info("Google sera ativado quando as chaves OAuth forem configuradas.")
      }
      type="button"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-subtle text-sm font-black text-brand">
        G
      </span>
      {label}
    </button>
  );
}

function Field({
  autoComplete,
  icon,
  label,
  placeholder,
  type = "text",
}: {
  autoComplete?: string;
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-ink">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {icon}
        </span>
        <Input
          autoComplete={autoComplete}
          className="h-12 rounded-xl pl-10"
          placeholder={placeholder}
          required
          type={type}
        />
      </span>
    </label>
  );
}

export function CustomerAuthPage() {
  function handleAuthSubmit(
    event: React.FormEvent<HTMLFormElement>,
    message: string,
  ) {
    event.preventDefault();
    toast.info(message);
  }

  return (
    <section className="pharma-clouds min-h-screen bg-white px-4 pb-16 pt-40 text-ink sm:px-6 lg:px-8 lg:pt-52">
      <div className="mx-auto max-w-7xl">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.55, ease: easeOut }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-bold text-brand">
            <Sparkles className="h-4 w-4" />
            Conta Wimifarma
          </span>
          <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-1px] text-ink sm:text-6xl">
            Login / Cadastrar
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Entre para acompanhar pedidos, salvar dados de atendimento e receber
            ofertas com mais rapidez.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <motion.form
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.5rem] border border-line bg-white/90 p-6 shadow-[0_18px_50px_rgba(17,24,39,0.08)] backdrop-blur sm:p-8"
            initial={{ opacity: 0, y: 24 }}
            onSubmit={(event) =>
              handleAuthSubmit(
                event,
                "Login de cliente sera conectado ao modulo de clientes.",
              )
            }
            transition={{ delay: 0.08, duration: 0.55, ease: easeOut }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-ink">Entrar</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Use email e senha para acessar sua conta de cliente.
                </p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <LockKeyhole className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-7">
              <GoogleButton label="Entrar com Google" />
            </div>

            <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              <span className="h-px flex-1 bg-line" />
              ou
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="grid gap-4">
              <Field
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                placeholder="seuemail@exemplo.com"
                type="email"
              />
              <Field
                autoComplete="current-password"
                icon={<LockKeyhole className="h-4 w-4" />}
                label="Senha"
                placeholder="Sua senha"
                type="password"
              />
            </div>

            <button
              className="soft-breathe mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(200,16,46,0.22)] transition duration-300 hover:-translate-y-1 hover:bg-brand-strong"
              type="submit"
            >
              Entrar
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.form>

          <motion.form
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.5rem] border border-line bg-white/90 p-6 shadow-[0_18px_50px_rgba(17,24,39,0.08)] backdrop-blur sm:p-8"
            initial={{ opacity: 0, y: 24 }}
            onSubmit={(event) =>
              handleAuthSubmit(
                event,
                "Cadastro de cliente sera conectado ao modulo de clientes.",
              )
            }
            transition={{ delay: 0.16, duration: 0.55, ease: easeOut }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-ink">Cadastrar</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Crie sua conta para agilizar proximos atendimentos.
                </p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3f3f5] text-[#064b8e]">
                <UserRound className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-7">
              <GoogleButton label="Cadastrar com Google" />
            </div>

            <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              <span className="h-px flex-1 bg-line" />
              ou
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="grid gap-4">
              <Field
                autoComplete="name"
                icon={<UserRound className="h-4 w-4" />}
                label="Nome"
                placeholder="Seu nome"
              />
              <Field
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                placeholder="seuemail@exemplo.com"
                type="email"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  autoComplete="new-password"
                  icon={<LockKeyhole className="h-4 w-4" />}
                  label="Senha"
                  placeholder="Crie uma senha"
                  type="password"
                />
                <Field
                  autoComplete="new-password"
                  icon={<LockKeyhole className="h-4 w-4" />}
                  label="Confirmar senha"
                  placeholder="Repita a senha"
                  type="password"
                />
              </div>
            </div>

            <button
              className="soft-breathe mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(17,24,39,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-brand"
              type="submit"
            >
              Criar conta
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.form>
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-[1.25rem] border border-line bg-white/80 p-5 text-sm text-muted shadow-sm backdrop-blur"
          initial={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.24, duration: 0.5, ease: easeOut }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" />
              Acesso de administrador e colaboradores fica separado.
            </span>
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-soft px-4 py-2 font-bold text-brand transition hover:bg-brand hover:text-white"
              href="/admin/login"
            >
              Entrar no admin
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
