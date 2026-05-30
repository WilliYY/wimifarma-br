"use client";

import { motion } from "framer-motion";
import { getProviders, getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const easeOut = [0.16, 1, 0.3, 1] as const;

function GoogleButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-subtle text-sm font-black text-brand">
        G
      </span>
      {label}
    </button>
  );
}

function PuppyLoginMascot({
  isPasswordFocused,
  isPeeking,
  rotation,
}: {
  isPasswordFocused: boolean;
  isPeeking: boolean;
  rotation: number;
}) {
  return (
    <div
      className="puppy-login-mascot"
      data-password-focused={isPasswordFocused}
      data-peeking={isPeeking}
      style={{ "--puppy-head-rotate": `${rotation}deg` } as React.CSSProperties}
    >
      <div className="puppy-login-mascot__ear puppy-login-mascot__ear--left" />
      <div className="puppy-login-mascot__ear puppy-login-mascot__ear--right" />

      <div className="puppy-login-mascot__face">
        <div className="puppy-login-mascot__eyes">
          <span className="puppy-login-mascot__eye">
            <span />
          </span>
          <span className="puppy-login-mascot__eye">
            <span />
          </span>
        </div>
        <div className="puppy-login-mascot__nose">
          <svg aria-hidden="true" height="22" viewBox="0 0 39 23" width="38">
            <path
              d="M2.017 10.987Q-.563 7.513.157 4.754C.877 1.994 2.976.135 6.164.093 16.4-.04 22.293-.022 32.048.093c3.501.042 5.48 2.081 6.02 4.661q.54 2.579-2.051 6.233-8.612 10.979-16.664 11.043-8.053.063-17.336-11.043z"
              fill="currentColor"
            />
          </svg>
          <span />
        </div>
        <div className="puppy-login-mascot__mouth">
          <svg aria-hidden="true" height="23" viewBox="-2 -2 84 23" width="84">
            <path
              d="M0 0c3.76 9.279 9.69 18.98 26.712 19.238 17.022.258 10.72.258 28 0S75.959 9.182 79.987.161"
              fill="none"
              stroke="currentColor"
              strokeLinecap="square"
              strokeMiterlimit="3"
              strokeWidth="3"
            />
          </svg>
          <span className="puppy-login-mascot__mouth-hole" />
          <span className="puppy-login-mascot__tongue">
            <span />
            <span />
          </span>
        </div>
      </div>

      <div className="puppy-login-mascot__hands">
        {["left", "right"].map((side) => (
          <div className={`puppy-login-mascot__hand puppy-login-mascot__hand--${side}`} key={side}>
            {[0, 1, 2].map((finger) => (
              <span className="puppy-login-mascot__finger" key={finger}>
                <span />
                <span />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  autoComplete,
  icon,
  label,
  name,
  placeholder,
  type = "text",
}: {
  autoComplete?: string;
  icon: React.ReactNode;
  label: string;
  name?: string;
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
          name={name}
          placeholder={placeholder}
          required
          type={type}
        />
      </span>
    </label>
  );
}

export function CustomerAuthPage() {
  const router = useRouter();
  const [isEntering, setIsEntering] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginValue, setLoginValue] = useState("");
  const [isLoginFocused, setIsLoginFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isLoginPasswordVisible, setIsLoginPasswordVisible] = useState(false);

  const puppyRotation = isLoginFocused
    ? Math.max(-16, Math.min(14, 10 - loginValue.length * 0.9))
    : 0;

  async function handleGoogleSignIn() {
    const providers = await getProviders();

    if (!providers?.google) {
      toast.info("Google sera ativado quando as chaves OAuth forem configuradas.");
      return;
    }

    await signIn("google", { callbackUrl: "/minha-conta" });
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const login = String(formData.get("login") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!login || !password) {
      toast.error("Informe usuario/email e senha.");
      return;
    }

    setIsEntering(true);
    const result = await signIn("credentials", {
      email: login,
      password,
      redirect: false,
    });
    setIsEntering(false);

    if (!result?.error) {
      const session = await getSession();
      const isAdmin = ["ADMIN", "MANAGER", "STAFF"].includes(
        session?.user?.role ?? "",
      );

      toast.success(isAdmin ? "Acesso administrativo liberado." : "Bem-vindo.");
      router.push(isAdmin ? "/admin/dashboard" : "/minha-conta");
      router.refresh();
      return;
    }

    toast.error("Nao foi possivel entrar com estes dados.");
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("new-password") ?? "");
    const confirmPassword = String(formData.get("confirm-password") ?? "");

    setIsRegistering(true);
    const response = await fetch("/api/minha-conta/register", {
      body: JSON.stringify({
        confirmPassword,
        email,
        name,
        password,
        phone,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    setIsRegistering(false);

    if (!response.ok) {
      toast.error(payload.message ?? "Nao foi possivel criar sua conta.");
      return;
    }

    toast.success("Conta criada.");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result?.error) {
      router.push("/minha-conta");
      router.refresh();
      return;
    }

    toast.info("Conta criada. Entre com seu email e senha.");
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
          <h1 className="text-5xl font-black leading-[0.95] tracking-[-1px] text-ink sm:text-6xl">
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
            noValidate
            onSubmit={handleLoginSubmit}
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
              <GoogleButton
                label="Entrar com Google"
                onClick={handleGoogleSignIn}
              />
            </div>

            <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              <span className="h-px flex-1 bg-line" />
              ou
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="grid gap-4">
              <PuppyLoginMascot
                isPasswordFocused={isPasswordFocused}
                isPeeking={isPasswordFocused && isLoginPasswordVisible}
                rotation={puppyRotation}
              />

              <label className="grid gap-2">
                <span className="text-sm font-bold text-ink">
                  Email ou usuario
                </span>
                <span className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    autoComplete="username"
                    className="h-12 rounded-xl pl-10"
                    name="login"
                    onBlur={() => setIsLoginFocused(false)}
                    onChange={(event) => setLoginValue(event.target.value)}
                    onFocus={() => setIsLoginFocused(true)}
                    placeholder="seuemail@exemplo.com"
                    required
                    type="text"
                    value={loginValue}
                  />
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-ink">Senha</span>
                <span className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <LockKeyhole className="h-4 w-4" />
                  </span>
                  <Input
                    autoComplete="current-password"
                    className="h-12 rounded-xl pl-10 pr-28"
                    name="password"
                    onBlur={() => setIsPasswordFocused(false)}
                    onFocus={() => setIsPasswordFocused(true)}
                    placeholder="Sua senha"
                    required
                    type={isLoginPasswordVisible ? "text" : "password"}
                  />
                  <button
                    className="absolute right-2 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-lg bg-ink px-3 text-xs font-bold text-white transition duration-300 hover:bg-brand"
                    onClick={() =>
                      setIsLoginPasswordVisible((isVisible) => !isVisible)
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    type="button"
                  >
                    {isLoginPasswordVisible ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {isLoginPasswordVisible ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
              </label>
            </div>

            <button
              className="soft-breathe mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(200,16,46,0.22)] transition duration-300 hover:-translate-y-1 hover:bg-brand-strong"
              disabled={isEntering}
              type="submit"
            >
              {isEntering ? "Entrando..." : "Entrar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.form>

          <motion.form
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.5rem] border border-line bg-white/90 p-6 shadow-[0_18px_50px_rgba(17,24,39,0.08)] backdrop-blur sm:p-8"
            initial={{ opacity: 0, y: 24 }}
            noValidate
            onSubmit={handleRegisterSubmit}
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
              <GoogleButton
                label="Cadastrar com Google"
                onClick={handleGoogleSignIn}
              />
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
                name="name"
                placeholder="Seu nome"
              />
              <Field
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                name="email"
                placeholder="seuemail@exemplo.com"
                type="email"
              />
              <Field
                autoComplete="tel"
                icon={<Phone className="h-4 w-4" />}
                label="Telefone"
                name="phone"
                placeholder="+55 44 99999-9999"
                type="tel"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  autoComplete="new-password"
                  icon={<LockKeyhole className="h-4 w-4" />}
                  label="Senha"
                  name="new-password"
                  placeholder="Crie uma senha"
                  type="password"
                />
                <Field
                  autoComplete="new-password"
                  icon={<LockKeyhole className="h-4 w-4" />}
                  label="Confirmar senha"
                  name="confirm-password"
                  placeholder="Repita a senha"
                  type="password"
                />
              </div>
            </div>

            <button
              className="soft-breathe mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(17,24,39,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-brand"
              disabled={isRegistering}
              type="submit"
            >
              {isRegistering ? "Criando..." : "Criar conta"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.form>
        </div>

      </div>
    </section>
  );
}
