"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
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
  ArrowRight,
  ChevronRight,
  LayoutDashboard,
  MessageCircle,
  Package,
  RefreshCw,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BrandSignature } from "@/components/site/brand-signature";
import { CustomerOrderCard, CustomerOrderHistoryPanel } from "@/components/site/customer-order-history";
import type { CustomerOrderHistory, OrderHistoryFilter } from "@/features/orders/customer-orders";
import { siteConfig } from "@/lib/site";

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
  reservedCents?: number;
  pendingCents: number;
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
  { icon: LayoutDashboard, id: "inicio", label: "Visão geral" },
  { icon: Package, id: "pedidos", label: "Meus pedidos" },
  { icon: Coins, id: "beneficios", label: "Cashback" },
  { icon: UserRound, id: "perfil", label: "Meus dados" },
  { icon: ShieldCheck, id: "seguranca", label: "Segurança" },
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
    timeZone: "America/Sao_Paulo",
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
  initialOrders,
  adminAccess = false,
}: {
  cashback: CashbackSummary;
  customer: CustomerAccount;
  initialOrders: CustomerOrderHistory;
  adminAccess?: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("inicio");
  const [orders, setOrders] = useState(initialOrders);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const orderRequest = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => orderRequest.current?.abort(), []);
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
  const completedFields = [customer.name, customer.phone, customer.address, customer.neighborhood, customer.city].filter(Boolean).length;
  const profileProgress = completedFields * 20;
  const firstName = customer.name.trim().split(/\s+/)[0];
  const supportUrl = `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent("Olá! Preciso de ajuda com minha conta Wimifarma.")}`;

  function navigateTo(tab: TabId) {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      contentRef.current?.focus({ preventScroll: true });
      contentRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }

  async function loadOrders(filter: OrderHistoryFilter, page: number) {
    orderRequest.current?.abort();
    const controller = new AbortController();
    orderRequest.current = controller;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const response = await fetch(`/api/minha-conta/pedidos?filter=${filter}&page=${page}`, { cache: "no-store", signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Não foi possível atualizar os pedidos.");
      if (!controller.signal.aborted) setOrders(payload.data);
    } catch (error) {
      if (!controller.signal.aborted) setOrdersError(error instanceof Error ? error.message : "Não foi possível consultar os pedidos. Verifique sua conexão.");
    } finally {
      if (orderRequest.current === controller) setOrdersLoading(false);
    }
  }

  function updateProfileField(
    field: keyof typeof profile,
    value: string,
  ) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    try {
    const response = await fetch("/api/minha-conta", {
      body: JSON.stringify(profile),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.message ?? "Nao foi possivel salvar seus dados.");
      return;
    }

    toast.success("Dados salvos.");
    router.refresh();
    } catch {
      toast.error("Não foi possível salvar. Verifique sua conexão e tente novamente.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);
    try {
    const response = await fetch("/api/minha-conta/password", {
      body: JSON.stringify(password),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.message ?? "Nao foi possivel salvar a senha.");
      return;
    }

    setHasPassword(true);
    setPassword({ confirmPassword: "", currentPassword: "", password: "" });
    toast.success("Senha salva.");
    router.refresh();
    } catch {
      toast.error("Não foi possível salvar a senha. Verifique sua conexão.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#f5f6f8] px-4 pb-16 pt-40 text-ink sm:px-6 sm:pt-44 lg:px-8 lg:pt-60">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Localização" className="mb-5 flex items-center gap-2 text-xs font-medium text-muted"><Link className="inline-flex min-h-6 items-center hover:text-brand" href="/">Início</Link><ChevronRight aria-hidden="true" className="h-3 w-3" /><span aria-current="page">Minha conta</span></nav>
        <header className="relative isolate overflow-hidden rounded-3xl bg-[#151e2e] px-5 py-7 text-white sm:p-8 lg:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-40 -z-10 h-[32rem] w-[32rem] rounded-full border-[65px] border-white/[0.03]" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 -z-10 h-1 w-full bg-brand" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Seu espaço Wimifarma</p><BrandSignature className="px-2.5 py-1.5" />
          </div>
          <div className="mt-7 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-2xl font-black ring-1 ring-white/20 sm:h-20 sm:w-20">
                {customer.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Sua foto de perfil" className="h-full w-full object-cover" referrerPolicy="no-referrer" src={customer.imageUrl} />
                ) : initials(customer.name) || <UserRound className="h-8 w-8" />}
              </div>
              <div className="min-w-0"><h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Olá, {firstName}<span className="text-brand">.</span></h1><p className="mt-2 text-sm leading-6 text-white/70">Seu cuidado, suas compras, tudo por aqui.</p></div>
            </div>
            <Link className="inline-flex min-h-11 w-fit items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-brand-soft" href="/catalogo"><ShoppingBag className="h-4 w-4 text-brand" />Continuar comprando <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </header>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7">
          <aside className="min-w-0 lg:sticky lg:top-60">
            <nav aria-label="Área da conta" className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-2 lg:grid">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return <button aria-current={activeTab === tab.id ? "page" : undefined} aria-controls="account-content" className={cn("flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand lg:w-full", activeTab === tab.id ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-50 hover:text-ink")} key={tab.id} onClick={() => navigateTo(tab.id)} type="button"><Icon aria-hidden="true" className="h-[18px] w-[18px]" />{tab.label}{tab.id === "pedidos" && orders.counts.active > 0 && <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[10px] text-white">{orders.counts.active}</span>}</button>;
              })}
            </nav>
            <div className="mt-4 hidden rounded-2xl border border-line bg-white p-5 lg:block">
              <p className="flex items-center gap-2 text-sm font-black"><MessageCircle className="h-4 w-4 text-emerald-600" />Conte com a gente</p><p className="mt-2 text-xs leading-5 text-muted">Uma dúvida sobre sua compra? A equipe Wimifarma ajuda você.</p><a className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand" href={supportUrl} target="_blank" rel="noopener noreferrer">Falar com a equipe <ArrowRight className="h-4 w-4" /></a>
            </div>
            {adminAccess && <Link className="mt-3 inline-flex min-h-11 items-center gap-2 px-3 text-xs font-bold text-muted hover:text-brand" href="/admin/usuarios"><BadgeCheck className="h-4 w-4" />Painel administrativo</Link>}
          </aside>

        <div aria-label={tabs.find(tab => tab.id === activeTab)?.label} className="min-w-0 scroll-mt-40 rounded-2xl outline-none lg:scroll-mt-60" id="account-content" ref={contentRef} role="region" tabIndex={-1}>
          {activeTab === "inicio" && <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button className="group col-span-2 rounded-2xl border border-emerald-100 bg-[#edf8f2] p-5 text-left transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-brand sm:col-span-1" onClick={() => navigateTo("beneficios")} type="button"><span className="flex items-center justify-between text-xs font-bold text-emerald-800">Seu cashback<Coins className="h-5 w-5" /></span><span className="mt-3 block text-3xl font-black tracking-tight text-emerald-950">{formatCurrency(balance)}</span><span className="mt-2 block text-xs text-emerald-800">Disponível para usar <ArrowRight className="ml-1 inline h-3 w-3" /></span></button>
              <button className="rounded-2xl border border-line bg-white p-5 text-left hover:border-brand/30 focus-visible:outline-2 focus-visible:outline-brand" onClick={() => { navigateTo("pedidos"); void loadOrders("active", 1); }} type="button"><span className="flex items-center justify-between text-xs font-bold text-muted">Em andamento<Truck className="h-5 w-5 text-brand" /></span><span className="mt-3 block text-3xl font-black tracking-tight">{orders.counts.active.toString().padStart(2, "0")}</span><span className="mt-2 block text-xs text-muted">Acompanhar pedidos <ArrowRight className="ml-1 inline h-3 w-3" /></span></button>
              <button className="rounded-2xl border border-line bg-white p-5 text-left hover:border-brand/30 focus-visible:outline-2 focus-visible:outline-brand" onClick={() => { navigateTo("pedidos"); void loadOrders("all", 1); }} type="button"><span className="flex items-center justify-between text-xs font-bold text-muted">Seu histórico<ShoppingBag className="h-5 w-5 text-brand" /></span><span className="mt-3 block text-3xl font-black tracking-tight">{orders.counts.all.toString().padStart(2, "0")}</span><span className="mt-2 block text-xs text-muted">Ver todas as compras <ArrowRight className="ml-1 inline h-3 w-3" /></span></button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2"><h2 className="text-xl font-black tracking-tight">{orders.activeOrder ? "Acompanhe seu pedido" : "Suas compras"}</h2><button className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-brand disabled:opacity-50" disabled={ordersLoading} onClick={() => void loadOrders(orders.filter, orders.page)} type="button"><RefreshCw className={cn("h-3.5 w-3.5", ordersLoading && "animate-spin motion-reduce:animate-none")} />{ordersLoading ? "Atualizando…" : "Atualizar andamento"}</button></div>
            {ordersError && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{ordersError}</p>}
            {orders.activeOrder ? <CustomerOrderCard featured order={orders.activeOrder} /> : <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-center"><div><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft"><Package className="h-6 w-6 text-brand" /></span><h3 className="text-lg font-black">{orders.counts.all ? "Tudo em dia por aqui" : "Seu cuidado começa com uma escolha"}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted">{orders.counts.all ? "Você não tem pedidos em andamento. Suas compras anteriores continuam no histórico." : "Encontre seus favoritos. Depois da compra, acompanhe cada etapa neste espaço."}</p></div><Link className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark" href="/catalogo">Ver produtos <ArrowRight className="h-4 w-4" /></Link></div>}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-black"><MapPin className="h-5 w-5 text-brand" />Pronto para receber</h2><span className="text-xs font-bold text-muted">{profileProgress}%</span></div><div aria-label="Dados do perfil preenchidos" aria-valuemax={100} aria-valuemin={0} aria-valuenow={profileProgress} className="my-4 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className="h-full rounded-full bg-brand" style={{ width: `${profileProgress}%` }} /></div><p className="break-words text-sm leading-6 text-muted">{customer.address ? [customer.address, customer.neighborhood, customer.city].filter(Boolean).join(" · ") : "Complete seu endereço e telefone para facilitar suas próximas compras."}</p><button className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand" onClick={() => navigateTo("perfil")} type="button">{profileProgress === 100 ? "Revisar meus dados" : "Completar meus dados"}<ArrowRight className="h-4 w-4" /></button></div>
              <div className="rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 sm:p-6"><Star className="mb-3 h-6 w-6 text-amber-600" /><h2 className="text-base font-black">Sua experiência ajuda outras pessoas</h2><p className="mt-2 text-sm leading-6 text-muted">Conte como foi usar os produtos das suas compras. Sua opinião faz a diferença.</p><Link className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand" href="/minha-conta/avaliacoes">Avaliar minhas compras <ArrowRight className="h-4 w-4" /></Link></div>
            </div>
            <a className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white p-3 text-sm font-bold text-ink lg:hidden" href={supportUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 text-emerald-600" />Precisa de ajuda? Fale com a equipe</a>
          </div>}
          {activeTab === "pedidos" && <div className="rounded-2xl border border-line bg-white p-4 sm:p-6"><CustomerOrderHistoryPanel error={ordersError} history={orders} loading={ordersLoading} onLoad={(filter, page) => void loadOrders(filter, page)} /></div>}
          <div className={cn(activeTab === "inicio" || activeTab === "pedidos" ? "hidden" : "rounded-2xl border border-line bg-white p-5 sm:p-7")}>
          {activeTab !== "inicio" && activeTab !== "pedidos" && <div className="mb-6 border-b border-line pb-5"><h2 className="text-2xl font-black tracking-tight">{activeTab === "perfil" ? "Seus dados, sempre em dia" : activeTab === "seguranca" ? "Acesso e segurança" : "Seu cashback"}</h2><p className="mt-2 text-sm leading-6 text-muted">{activeTab === "perfil" ? "Mantenha seu contato e endereço atualizados para facilitar o atendimento." : activeTab === "seguranca" ? "Cuide do acesso à sua conta com uma senha que só você conhece." : "Acompanhe seu saldo e os benefícios das suas compras."}</p></div>}
          {activeTab === "perfil" ? (
            <form className="grid gap-5 sm:grid-cols-2 [&_input]:min-h-12 [&_input]:rounded-xl [&_textarea]:rounded-xl" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
              <Field icon={<UserRound className="h-4 w-4" />} label="Nome">
                <Input
                  autoComplete="name"
                  required
                  value={profile.name}
                  onChange={(event) =>
                    updateProfileField("name", event.target.value)
                  }
                />
              </Field>
              <Field icon={<Mail className="h-4 w-4" />} label="Email da conta">
                <Input readOnly type="email" className="bg-slate-50 text-muted" value={customer.email ?? ""} />
              </Field>
              <Field icon={<Phone className="h-4 w-4" />} label="Telefone">
                <Input
                  inputMode="tel"
                  autoComplete="tel"
                  type="tel"
                  placeholder="+55 44 99999-9999"
                  value={profile.phone}
                  onChange={(event) =>
                    updateProfileField("phone", event.target.value)
                  }
                />
              </Field>
              <Field icon={<Home className="h-4 w-4" />} label="Endereço">
                <Input
                  placeholder="Rua, numero e complemento"
                  autoComplete="street-address"
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
              <Field icon={<Home className="h-4 w-4" />} label="Observações de entrega">
                <Textarea
                  className="min-h-24"
                  placeholder="Referencia de entrega, horario ou detalhe importante"
                  value={profile.notes}
                  onChange={(event) =>
                    updateProfileField("notes", event.target.value)
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Button
                  className="w-full sm:w-auto"
                  disabled={isSavingProfile}
                  type="submit"
                >
                  <Save className="h-4 w-4" />
                  {isSavingProfile ? "Salvando..." : "Salvar meus dados"}
                </Button>
              </div>
            </form>
          ) : null}

          {activeTab === "seguranca" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
              <form className="grid content-start gap-5 [&_input]:min-h-12 [&_input]:rounded-xl" onSubmit={savePassword}>
                {hasPassword ? (
                  <Field
                    icon={<LockKeyhole className="h-4 w-4" />}
                    label="Senha atual"
                  >
                    <Input
                      autoComplete="current-password"
                      required
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
                      required
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
                      required
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

              <aside className="rounded-2xl border border-line bg-slate-50 p-5">
                <p className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4 text-emerald-700" />Sua conta</p>
                <p className="mt-4 text-sm font-bold">{customer.hasGoogle ? "Google conectado" : "Acesso com email e senha"}</p>
                <p className="mt-1 break-all text-xs leading-5 text-muted">{customer.email}</p>
                <dl className="mt-5 grid gap-4 text-xs"><div><dt className="text-muted">Último acesso</dt><dd className="mt-1 font-bold">{formatDate(customer.lastLoginAt)}</dd></div><div><dt className="text-muted">Cliente desde</dt><dd className="mt-1 font-bold">{formatDate(customer.createdAt).split(",")[0]}</dd></div></dl>
                <a className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand" href={supportUrl} target="_blank" rel="noopener noreferrer">Preciso de ajuda <ArrowRight className="h-4 w-4" /></a>
              </aside>
            </div>
          ) : null}

          {activeTab === "beneficios" ? (
            <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
              <div className="rounded-2xl border border-emerald-100 bg-[#edf8f2] p-5">
                <p className="flex items-center gap-2 text-sm font-black text-brand">
                  <Coins className="h-4 w-4" />
                  Cashback liberado
                </p>
                <p className="mt-3 text-4xl font-black text-ink">
                  {formatCurrency(balance)}
                </p>
                <div className="mt-5 grid gap-2 text-sm font-bold text-ink">
                  <span>Pendente: {formatCurrency((cashback?.pendingCents ?? 0) / 100)}</span>
                  <span>Reservado em pedidos: {formatCurrency((cashback?.reservedCents ?? 0) / 100)}</span>
                  <span>
                    Creditos apos estornos:{" "}
                    {formatCurrency(cashback?.lifetimeEarned ?? "0")}
                  </span>
                  <span>
                    Usado total:{" "}
                    {formatCurrency(cashback?.lifetimeRedeemed ?? "0")}
                  </span>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted">Use o saldo disponível como desconto no checkout. Benefícios de compras são liberados após conclusão e pagamento. Avaliações elegíveis recebem um agradecimento de 1%, qualquer que seja a nota. Confira as condições nas regras.</p>
                <a className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-brand underline" href="/minha-conta/avaliacoes">Avaliar minhas compras</a>
                <a className="mt-2 block text-xs font-bold text-muted underline" href="/cashback">Regras do cashback</a>
              </div>

              <div className="min-w-0 rounded-2xl border border-line bg-white p-5">
                <p className="flex items-center gap-2 text-sm font-black text-ink">
                  <Gift className="h-4 w-4 text-brand" />
                  Historico recente
                </p>
                <div className="mt-4 grid gap-3">
                  {cashback?.transactions.length ? (
                    cashback.transactions.map((transaction) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"
                        key={transaction.id}
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-ink">
                            {transaction.description}
                          </p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                            {transaction.type === "CREDIT" ? "Credito" : transaction.type === "DEBIT" ? "Estorno / debito" : transaction.type} -{" "}
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-brand">
                          {transaction.type === "DEBIT" || transaction.type === "EXPIRE" ? "- " : "+ "}{formatCurrency(transaction.amount)}
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
        </div>
      </div>
    </section>
  );
}
