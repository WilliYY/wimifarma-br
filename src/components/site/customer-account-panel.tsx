"use client";

import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  BadgeCheck,
  Coins,
  Gift,
  Home,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CustomerAccount = {
  address: string | null;
  city: string;
  createdAt: string;
  email: string | null;
  hasGoogle: boolean;
  hasPassword: boolean;
  id: string;
  imageUrl: string | null;
  lastLoginAt: string | null;
  name: string;
  neighborhood: string | null;
  notes: string | null;
  passwordSetAt: string | null;
  phone: string | null;
};

type CashbackSummary = {
  balance: string;
  lifetimeEarned: string;
  lifetimeRedeemed: string;
  transactions: Array<{
    amount: string;
    createdAt: string;
    description: string;
    id: string;
    type: string;
  }>;
} | null;

const tabs = [
  { icon: UserRound, id: "perfil", label: "Usuario" },
  { icon: ShieldCheck, id: "seguranca", label: "Senha" },
  { icon: Coins, id: "beneficios", label: "Cashback" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return "Ainda nao registrado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Field({
  icon,
  label,
  children,
}: {
  children: ReactNode;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-bold text-ink">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

export function CustomerAccountPanel({
  cashback,
  customer,
}: {
  cashback: CashbackSummary;
  customer: CustomerAccount;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("perfil");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(customer.hasPassword);
  const [profile, setProfile] = useState({
    address: customer.address ?? "",
    city: customer.city || "Ivate",
    name: customer.name,
    neighborhood: customer.neighborhood ?? "",
    notes: customer.notes ?? "",
    phone: customer.phone ?? "",
  });
  const [password, setPassword] = useState({
    confirmPassword: "",
    currentPassword: "",
    password: "",
  });

  const balance = cashback?.balance ?? "0";
  const accountBadges = useMemo(
    () =>
      [
        customer.hasGoogle ? "Google conectado" : null,
        hasPassword ? "Senha criada" : "Senha pendente",
        customer.phone ? "Telefone salvo" : null,
      ].filter(Boolean),
    [customer.hasGoogle, customer.phone, hasPassword],
  );

  function updateProfileField(
    field: keyof typeof profile,
    value: string,
  ) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    const response = await fetch("/api/minha-conta", {
      body: JSON.stringify(profile),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const payload = await response.json().catch(() => ({}));
    setIsSavingProfile(false);

    if (!response.ok) {
      toast.error(payload.message ?? "Nao foi possivel salvar seus dados.");
      return;
    }

    toast.success("Dados salvos.");
    router.refresh();
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);
    const response = await fetch("/api/minha-conta/password", {
      body: JSON.stringify(password),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const payload = await response.json().catch(() => ({}));
    setIsSavingPassword(false);

    if (!response.ok) {
      toast.error(payload.message ?? "Nao foi possivel salvar a senha.");
      return;
    }

    setHasPassword(true);
    setPassword({ confirmPassword: "", currentPassword: "", password: "" });
    toast.success("Senha salva.");
    router.refresh();
  }

  return (
    <section className="pharma-clouds min-h-screen bg-white px-4 pb-16 pt-40 text-ink sm:px-6 lg:px-8 lg:pt-52">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-2xl font-black text-brand ring-8 ring-white">
                {customer.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    src={customer.imageUrl}
                  />
                ) : (
                  initials(customer.name) || <UserRound className="h-8 w-8" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">
                  Minha conta
                </p>
                <h1 className="mt-2 text-4xl font-black leading-none text-ink sm:text-5xl">
                  {customer.name}
                </h1>
                <p className="mt-3 text-sm text-muted">
                  {customer.email ?? "Email nao informado"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {accountBadges.map((badge) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-ink"
                      key={badge}
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-brand" />
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-white p-4 shadow-[0_12px_30px_rgba(17,24,39,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  Cashback
                </p>
                <p className="mt-2 text-2xl font-black text-ink">
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-white p-4 shadow-[0_12px_30px_rgba(17,24,39,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  Telefone
                </p>
                <p className="mt-2 truncate text-lg font-black text-ink">
                  {customer.phone ?? "Pendente"}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-white p-4 shadow-[0_12px_30px_rgba(17,24,39,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  Ultimo acesso
                </p>
                <p className="mt-2 text-sm font-black text-ink">
                  {formatDate(customer.lastLoginAt)}
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-line bg-white p-5 shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-brand">
              Atendimento
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Dados completos deixam o atendimento por WhatsApp e entrega mais
              rapidos.
            </p>
            <div className="mt-5 grid gap-3 text-sm">
              <span className="flex items-center gap-2 font-bold text-ink">
                <Phone className="h-4 w-4 text-brand" />
                {profile.phone || "Telefone pendente"}
              </span>
              <span className="flex items-center gap-2 font-bold text-ink">
                <Home className="h-4 w-4 text-brand" />
                {profile.address || "Endereco pendente"}
              </span>
            </div>
          </aside>
        </div>

        <div className="mt-8 overflow-x-auto border-b border-line">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={cn(
                    "inline-flex h-12 items-center gap-2 border-b-2 px-4 text-sm font-black transition",
                    activeTab === tab.id
                      ? "border-brand text-brand"
                      : "border-transparent text-muted hover:text-ink",
                  )}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-white/92 p-5 shadow-[0_18px_50px_rgba(17,24,39,0.08)] sm:p-6">
          {activeTab === "perfil" ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <Field icon={<UserRound className="h-4 w-4" />} label="Nome">
                <Input
                  value={profile.name}
                  onChange={(event) =>
                    updateProfileField("name", event.target.value)
                  }
                />
              </Field>
              <Field icon={<Mail className="h-4 w-4" />} label="Email">
                <Input disabled value={customer.email ?? ""} />
              </Field>
              <Field icon={<Phone className="h-4 w-4" />} label="Telefone">
                <Input
                  inputMode="tel"
                  placeholder="+55 44 99999-9999"
                  value={profile.phone}
                  onChange={(event) =>
                    updateProfileField("phone", event.target.value)
                  }
                />
              </Field>
              <Field icon={<Home className="h-4 w-4" />} label="Endereco">
                <Input
                  placeholder="Rua, numero e complemento"
                  value={profile.address}
                  onChange={(event) =>
                    updateProfileField("address", event.target.value)
                  }
                />
              </Field>
              <Field icon={<MapPin className="h-4 w-4" />} label="Bairro">
                <Input
                  value={profile.neighborhood}
                  onChange={(event) =>
                    updateProfileField("neighborhood", event.target.value)
                  }
                />
              </Field>
              <Field icon={<MapPin className="h-4 w-4" />} label="Cidade">
                <Input
                  value={profile.city}
                  onChange={(event) =>
                    updateProfileField("city", event.target.value)
                  }
                />
              </Field>
              <Field icon={<Home className="h-4 w-4" />} label="Observacoes">
                <Textarea
                  className="min-h-24"
                  placeholder="Referencia de entrega, horario ou detalhe importante"
                  value={profile.notes}
                  onChange={(event) =>
                    updateProfileField("notes", event.target.value)
                  }
                />
              </Field>
              <div className="lg:col-span-2">
                <Button
                  className="w-full sm:w-auto"
                  disabled={isSavingProfile}
                  onClick={saveProfile}
                  type="button"
                >
                  <Save className="h-4 w-4" />
                  {isSavingProfile ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          ) : null}

          {activeTab === "seguranca" ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <form className="grid gap-5" onSubmit={savePassword}>
                {hasPassword ? (
                  <Field
                    icon={<LockKeyhole className="h-4 w-4" />}
                    label="Senha atual"
                  >
                    <Input
                      autoComplete="current-password"
                      type="password"
                      value={password.currentPassword}
                      onChange={(event) =>
                        setPassword((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                    />
                  </Field>
                ) : null}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    icon={<LockKeyhole className="h-4 w-4" />}
                    label={hasPassword ? "Nova senha" : "Criar senha"}
                  >
                    <Input
                      autoComplete="new-password"
                      minLength={6}
                      type="password"
                      value={password.password}
                      onChange={(event) =>
                        setPassword((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field
                    icon={<LockKeyhole className="h-4 w-4" />}
                    label="Confirmar senha"
                  >
                    <Input
                      autoComplete="new-password"
                      minLength={6}
                      type="password"
                      value={password.confirmPassword}
                      onChange={(event) =>
                        setPassword((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Button disabled={isSavingPassword} type="submit">
                  <Save className="h-4 w-4" />
                  {isSavingPassword ? "Salvando..." : "Salvar senha"}
                </Button>
              </form>

              <div className="rounded-lg border border-line bg-surface-subtle p-5">
                <p className="flex items-center gap-2 text-sm font-black text-ink">
                  <Mail className="h-4 w-4 text-brand" />
                  Redefinir por email
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  O envio automatico por email fica pronto quando um provedor
                  de email for configurado.
                </p>
                <Button
                  className="mt-4"
                  onClick={() =>
                    toast.info(
                      "Redefinicao por email sera ativada quando o envio de email for configurado.",
                    )
                  }
                  type="button"
                  variant="secondary"
                >
                  Solicitar redefinicao
                </Button>
              </div>
            </div>
          ) : null}

          {activeTab === "beneficios" ? (
            <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <div className="rounded-lg border border-line bg-brand-soft p-5">
                <p className="flex items-center gap-2 text-sm font-black text-brand">
                  <Coins className="h-4 w-4" />
                  Saldo cashback
                </p>
                <p className="mt-3 text-4xl font-black text-ink">
                  {formatCurrency(balance)}
                </p>
                <div className="mt-5 grid gap-2 text-sm font-bold text-ink">
                  <span>
                    Ganho total:{" "}
                    {formatCurrency(cashback?.lifetimeEarned ?? "0")}
                  </span>
                  <span>
                    Usado total:{" "}
                    {formatCurrency(cashback?.lifetimeRedeemed ?? "0")}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-line bg-white p-5">
                <p className="flex items-center gap-2 text-sm font-black text-ink">
                  <Gift className="h-4 w-4 text-brand" />
                  Historico recente
                </p>
                <div className="mt-4 grid gap-3">
                  {cashback?.transactions.length ? (
                    cashback.transactions.map((transaction) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-lg border border-line p-3"
                        key={transaction.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-ink">
                            {transaction.description}
                          </p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                            {transaction.type} -{" "}
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-brand">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-line p-4 text-sm leading-6 text-muted">
                      Sem movimentacoes de cashback por enquanto.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
