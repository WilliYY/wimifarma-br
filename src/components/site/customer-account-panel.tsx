"use client";
import { CustomerStoreCredit } from "./customer-store-credit";
import { ClubBenefits } from "@/components/site/club-benefits";
import { CustomerRestockPanel } from "@/components/site/customer-restock-panel";
import { CustomerEmailConfirmation } from "@/components/site/customer-email-confirmation";

import Link from "next/link";

import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
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
import { CustomerOrderCard, CustomerOrderHistoryPanel } from "@/components/site/customer-order-history";
import type { CustomerOrderHistory, OrderHistoryFilter } from "@/features/orders/customer-orders";
import { siteConfig } from "@/lib/site";
import { useClubSummary } from "@/hooks/use-club-summary";
import { formatPostalCode, normalizePostalCode } from "@/features/products/product-detail";
import { postalAddressSchema } from "@/features/orders/postal-code";

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
  passwordRecoveryEmailStatus?: "verified" | "unverified";
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
  { icon: Coins, id: "beneficios", label: "Benefícios" },
  { icon: Bell, id: "avisos", label: "Meus avisos" },
  { icon: UserRound, id: "perfil", label: "Meus dados" },
  { icon: ShieldCheck, id: "seguranca", label: "Segurança" },
] as const;

type TabId = (typeof tabs)[number]["id"];
const miaubyGreetings: Record<TabId, string> = {
  inicio: "Que bom ter você aqui!",
  pedidos: "Suas compras estão logo abaixo.",
  beneficios: "Seus benefícios estão à mão!",
  avisos: "Veja as novidades que você acompanha.",
  perfil: "Atualize seus dados por aqui.",
  seguranca: "Confira suas opções de acesso.",
};
const postalFields = ["address", "neighborhood", "city", "state"] as const;
type PostalField = (typeof postalFields)[number];

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
  cashback: initialCashback,
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
  const [cashback, setCashback] = useState(initialCashback);
  useEffect(() => setCashback(initialCashback), [initialCashback]);
  const club = useClubSummary();
  const [activeTab, setActiveTab] = useState<TabId>("inicio");
  useEffect(() => {
    const readTab = () => {
      const tab = window.location.hash.slice(1);
      if (tabs.some(item => item.id === tab)) setActiveTab(tab as TabId);
    };
    readTab();
    window.addEventListener("hashchange", readTab);
    return () => window.removeEventListener("hashchange", readTab);
  }, []);
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
    city: customer.city ?? "",
    name: customer.name,
    neighborhood: customer.neighborhood ?? "",
    notes: customer.notes ?? "",
    phone: customer.phone ?? "",
    postalCode: "",
    state: "",
  });
  const profileRef = useRef(profile);
  const postalRequest = useRef<AbortController | null>(null);
  const manualAddressFields = useRef(new Set<PostalField>());
  const automaticAddressFields = useRef<Partial<Record<PostalField, string>>>({});
  const [postalStatus, setPostalStatus] = useState({ loading: false, failed: false, message: "" });
  const [postalRetry, setPostalRetry] = useState(0);
  const postalCode = normalizePostalCode(profile.postalCode);

  useEffect(() => {
    if (postalCode.length !== 8 || activeTab !== "perfil") return;
    const controller = new AbortController();
    postalRequest.current = controller;
    const timer = window.setTimeout(async () => {
      setPostalStatus({ loading: true, failed: false, message: "Consultando CEP..." });
      try {
        const response = await fetch(`/api/cep/${postalCode}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        const payload = await response.json().catch(() => null);
        if (controller.signal.aborted || normalizePostalCode(profileRef.current.postalCode) !== postalCode) return;
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Consulta indisponível. Preencha o endereço manualmente.");
        const parsed = postalAddressSchema.safeParse(payload?.data);
        if (!parsed.success || parsed.data.postalCode !== postalCode) throw new Error("Resposta de CEP inválida. Preencha o endereço manualmente.");
        const found = parsed.data;
        const values = { address: found.street, neighborhood: found.neighborhood, city: found.city, state: found.state };
        const next = { ...profileRef.current };
        for (const field of postalFields) {
          if (!next[field] && !manualAddressFields.current.has(field)) {
            next[field] = values[field];
            automaticAddressFields.current[field] = values[field];
          }
        }
        profileRef.current = next;
        setProfile(next);
        setPostalStatus({ loading: false, failed: false, message: "CEP encontrado. Confira rua, número e complemento antes de salvar." });
      } catch (error) {
        if (!controller.signal.aborted && normalizePostalCode(profileRef.current.postalCode) === postalCode) {
          setPostalStatus({ loading: false, failed: true, message: error instanceof Error ? error.message : "Consulta indisponível. Preencha o endereço manualmente." });
        }
      }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [postalCode, activeTab, postalRetry]);
  const [password, setPassword] = useState({
    confirmPassword: "",
    currentPassword: "",
    password: "",
  });

  const balance = cashback?.balance ?? "0";
  const completedFields = [customer.name, customer.phone, customer.address, customer.neighborhood, customer.city].filter(Boolean).length;
  const profileProgress = completedFields * 20;
  const firstName = customer.name.trim().split(/\s+/)[0].replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
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

  async function refreshAfterShortage() {
    await loadOrders(orders.filter, orders.page);
    window.dispatchEvent(new Event("wimifarma:store-credit-updated"));
    window.dispatchEvent(new Event("wimifarma:club-updated"));
    window.dispatchEvent(new Event("wimifarma:cashback-updated"));
    try {
      const response = await fetch("/api/minha-conta/cashback", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok) setCashback(payload.data);
      else { setCashback(null); toast.error("Não foi possível atualizar o cashback. Atualize a conta."); }
    } catch { setCashback(null); toast.error("Não foi possível atualizar o cashback. Atualize a conta."); }
    router.refresh();
  }

  function updateProfileField(
    field: keyof typeof profile,
    value: string,
  ) {
    const next = { ...profileRef.current, [field]: value };
    if (field === "postalCode" && normalizePostalCode(value) !== normalizePostalCode(profileRef.current.postalCode)) {
      postalRequest.current?.abort();
      for (const key of postalFields) {
        if (automaticAddressFields.current[key] !== undefined && next[key] === automaticAddressFields.current[key]) next[key] = "";
      }
      automaticAddressFields.current = {};
      setPostalStatus({ loading: false, failed: false, message: "" });
    } else if (postalFields.includes(field as PostalField)) {
      manualAddressFields.current.add(field as PostalField);
      delete automaticAddressFields.current[field as PostalField];
    }
    profileRef.current = next;
    setProfile(next);
  }

  async function saveProfile() {
    const submitted = { address: profile.address, city: profile.city, name: profile.name, neighborhood: profile.neighborhood, notes: profile.notes, phone: profile.phone };
    setIsSavingProfile(true);
    try {
    const response = await fetch("/api/minha-conta", {
      body: JSON.stringify(submitted),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(payload.message ?? "Nao foi possivel salvar seus dados.");
      return;
    }

    for (const field of ["address", "neighborhood", "city"] as const) {
      if (profileRef.current[field] === submitted[field]) delete automaticAddressFields.current[field];
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
    toast.success("Senha salva. Entre novamente para continuar.");
    router.replace("/login?callbackUrl=%2Fminha-conta");
    router.refresh();
    } catch {
      toast.error("Não foi possível salvar a senha. Verifique sua conexão.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#f5f6f8] px-4 pb-16 pt-40 text-ink sm:px-6 sm:pt-44 lg:px-8 lg:pt-60">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Localização" className="mb-3 flex items-center gap-2 text-xs font-medium text-muted"><Link className="inline-flex min-h-6 items-center hover:text-brand" href="/">Início</Link><ChevronRight aria-hidden="true" className="h-3 w-3" /><span aria-current="page">Minha conta</span></nav>
        <header className="account-welcome grid items-center gap-3 rounded-2xl border border-line p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)_auto]" data-account-welcome>
          <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
            <div className={cn("account-welcome-avatar flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xl font-black text-brand sm:h-16 sm:w-16", club.summary?.member && "account-welcome-avatar-member")}>
              {customer.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Sua foto de perfil" className="h-full w-full object-cover" referrerPolicy="no-referrer" src={customer.imageUrl} />
              ) : initials(customer.name) || <UserRound aria-hidden="true" className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl">{firstName ? `Olá, ${firstName}` : "Olá"}<span className="text-brand">!</span></h1>
              {club.summary?.member && (
                <button className="-mb-1 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md text-left text-xs font-bold text-amber-800 hover:underline focus-visible:outline-2 focus-visible:outline-amber-700" onClick={() => navigateTo("beneficios")} type="button">
                  <BadgeCheck aria-hidden="true" className="h-4 w-4 shrink-0" />Participando do Club
                </button>
              )}
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <picture aria-hidden="true" className="account-miauby-art">
              <source media="(prefers-reduced-motion: reduce)" srcSet="/brand/miauby-avatar.webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" decoding="async" draggable={false} height={500} src="/media/header/gato-correndo.gif" width={500} />
            </picture>
            <div className="account-miauby-bubble min-w-0 rounded-xl border border-line bg-white px-3 py-2">
              <p className="text-xs font-bold text-brand-strong">Miauby</p>
              <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">{miaubyGreetings[activeTab]}</p>
            </div>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-fit" href="/catalogo">
            <ShoppingBag aria-hidden="true" className="h-4 w-4 shrink-0" />Continuar comprando<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Link>
        </header>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-5">
          <aside className="min-w-0 lg:sticky lg:top-[var(--site-header-offset,15rem)]">
            <nav aria-label="Área da conta" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1.5 min-[500px]:grid-cols-3 lg:grid-cols-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return <button aria-current={activeTab === tab.id ? "page" : undefined} aria-controls="account-content" className={cn("flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand sm:px-2.5 sm:text-sm", activeTab === tab.id ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-50 hover:text-ink")} key={tab.id} onClick={() => navigateTo(tab.id)} type="button"><Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{tab.label}</span>{tab.id === "pedidos" && orders.counts.active > 0 && <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] text-white">{orders.counts.active}</span>}</button>;
              })}
            </nav>
            <div className="mt-4 hidden rounded-2xl border border-line bg-white p-5 lg:block">
              <p className="flex items-center gap-2 text-sm font-black"><MessageCircle className="h-4 w-4 text-emerald-600" />Conte com a gente</p><p className="mt-2 text-xs leading-5 text-muted">Uma dúvida sobre sua compra? A equipe Wimifarma ajuda você.</p><a className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand" href={supportUrl} target="_blank" rel="noopener noreferrer">Falar com a equipe <ArrowRight className="h-4 w-4" /></a>
            </div>
            {adminAccess && <Link className="mt-3 inline-flex min-h-11 items-center gap-2 px-3 text-xs font-bold text-muted hover:text-brand" href="/admin/usuarios"><BadgeCheck className="h-4 w-4" />Painel administrativo</Link>}
          </aside>

        <div aria-label={tabs.find(tab => tab.id === activeTab)?.label} className="min-w-0 scroll-mt-40 rounded-2xl outline-none lg:scroll-mt-60" id="account-content" ref={contentRef} role="region" tabIndex={-1}>
          {activeTab === "inicio" && <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black tracking-tight">Seus benefícios</h2><button className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand" onClick={() => navigateTo("beneficios")} type="button">Ver extratos<ArrowRight aria-hidden="true" className="h-4 w-4" /></button></div>
            <div className="grid items-stretch gap-3 md:grid-cols-2">
              <ClubBenefits club={club} compact onShowDetails={() => navigateTo("beneficios")} />
              <section aria-label="Seu cashback" className="flex min-w-0 flex-col rounded-xl border border-line bg-white p-4">
                <h2 className="flex items-center gap-2.5 text-sm font-black text-ink"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50"><Coins aria-hidden="true" className="h-4 w-4 text-emerald-700" /></span>Seu cashback</h2>
                <p className="mt-3 text-xs font-medium text-muted">{cashback ? "Saldo disponível" : "Consulta ao saldo"}</p>
                <p className="mt-1 break-words text-2xl font-black leading-tight tracking-tight tabular-nums text-emerald-900">{cashback ? formatCurrency(balance) : "Indisponível"}</p>
                <button className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-emerald-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" onClick={() => navigateTo("beneficios")} type="button">Ver meu cashback<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
              </section>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-brand/30 focus-visible:outline-2 focus-visible:outline-brand sm:p-5" onClick={() => { navigateTo("pedidos"); void loadOrders("active", 1); }} type="button"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft"><Truck aria-hidden="true" className="h-5 w-5 text-brand" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Em andamento</span><span className="mt-1 block text-xs text-muted">Acompanhar pedidos</span></span><span className="text-3xl font-black tracking-tight">{orders.counts.active.toString().padStart(2, "0")}</span><ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" /></button>
              <button className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-brand/30 focus-visible:outline-2 focus-visible:outline-brand sm:p-5" onClick={() => { navigateTo("pedidos"); void loadOrders("all", 1); }} type="button"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100"><ShoppingBag aria-hidden="true" className="h-5 w-5 text-ink" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Seu histórico</span><span className="mt-1 block text-xs text-muted">Ver todas as compras</span></span><span className="text-3xl font-black tracking-tight">{orders.counts.all.toString().padStart(2, "0")}</span><ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" /></button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2"><h2 className="text-xl font-black tracking-tight">{orders.activeOrder ? "Acompanhe seu pedido" : "Suas compras"}</h2><button className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-brand disabled:opacity-50" disabled={ordersLoading} onClick={() => void loadOrders(orders.filter, orders.page)} type="button"><RefreshCw className={cn("h-3.5 w-3.5", ordersLoading && "animate-spin motion-reduce:animate-none")} />{ordersLoading ? "Atualizando…" : "Atualizar andamento"}</button></div>
            {ordersError && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{ordersError}</p>}
            {orders.activeOrder ? <CustomerOrderCard featured order={orders.activeOrder} onShortageChanged={() => void refreshAfterShortage()} /> : <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-center"><div><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft"><Package className="h-6 w-6 text-brand" /></span><h3 className="text-lg font-black">{orders.counts.all ? "Tudo em dia por aqui" : "Seu cuidado começa com uma escolha"}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted">{orders.counts.all ? "Você não tem pedidos em andamento. Suas compras anteriores continuam no histórico." : "Encontre seus favoritos. Depois da compra, acompanhe cada etapa neste espaço."}</p></div><Link className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark" href="/catalogo">Ver produtos <ArrowRight className="h-4 w-4" /></Link></div>}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-black"><MapPin className="h-5 w-5 text-brand" />Pronto para receber</h2><span className="text-xs font-bold text-muted">{profileProgress}%</span></div><div aria-label="Dados do perfil preenchidos" aria-valuemax={100} aria-valuemin={0} aria-valuenow={profileProgress} className="my-4 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className="h-full rounded-full bg-brand" style={{ width: `${profileProgress}%` }} /></div><p className="break-words text-sm leading-6 text-muted">{customer.address ? [customer.address, customer.neighborhood, customer.city].filter(Boolean).join(" · ") : "Complete seu endereço e telefone para facilitar suas próximas compras."}</p><button className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand" onClick={() => navigateTo("perfil")} type="button">{profileProgress === 100 ? "Revisar meus dados" : "Completar meus dados"}<ArrowRight className="h-4 w-4" /></button></div>
              <div className="rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 sm:p-6"><Star className="mb-3 h-6 w-6 text-amber-600" /><h2 className="text-base font-black">Sua experiência ajuda outras pessoas</h2><p className="mt-2 text-sm leading-6 text-muted">Conte como foi usar os produtos das suas compras. Sua opinião faz a diferença.</p><Link className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand" href="/minha-conta/avaliacoes">Avaliar minhas compras <ArrowRight className="h-4 w-4" /></Link></div>
            </div>
            <a className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white p-3 text-sm font-bold text-ink lg:hidden" href={supportUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 text-emerald-600" />Precisa de ajuda? Fale com a equipe</a>
          </div>}
          {(activeTab === "inicio" || activeTab === "beneficios") && <div className="mb-5"><CustomerStoreCredit key={customer.id} customerId={customer.id} /></div>}

          {activeTab === "pedidos" && <div className="rounded-2xl border border-line bg-white p-4 sm:p-6"><CustomerOrderHistoryPanel onShortageChanged={() => void refreshAfterShortage()} error={ordersError} history={orders} loading={ordersLoading} onLoad={(filter, page) => void loadOrders(filter, page)} /></div>}
          {activeTab === "avisos" && <CustomerRestockPanel />}
          <div className={cn(activeTab === "inicio" || activeTab === "pedidos" || activeTab === "avisos" ? "hidden" : "rounded-2xl border border-line bg-white p-5 sm:p-7")}>
          {activeTab !== "inicio" && activeTab !== "pedidos" && activeTab !== "avisos" && <div className="mb-6 border-b border-line pb-5"><h2 className="text-2xl font-black tracking-tight">{activeTab === "perfil" ? "Seus dados, sempre em dia" : activeTab === "seguranca" ? "Acesso e segurança" : "Seus benefícios"}</h2><p className="mt-2 text-sm leading-6 text-muted">{activeTab === "perfil" ? "Mantenha seu contato e endereço atualizados para facilitar o atendimento." : activeTab === "seguranca" ? "Cuide do acesso à sua conta com uma senha que só você conhece." : "Acompanhe seu saldo e os benefícios das suas compras."}</p></div>}
          {activeTab === "perfil" ? (
            <form autoComplete="on" className="grid gap-4 [&_input]:min-h-11 [&_input]:rounded-xl [&_textarea]:rounded-xl" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
              <fieldset className="min-w-0 rounded-xl border border-line p-3 sm:p-4">
                <legend className="px-1 text-sm font-bold text-ink">Contato</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field icon={<UserRound className="h-4 w-4" />} label="Nome">
                    <Input
                      autoComplete="name"
                      name="name"
                      required
                      value={profile.name}
                      onChange={(event) =>
                        updateProfileField("name", event.target.value)
                      }
                    />
                  </Field>
                  <Field icon={<Mail className="h-4 w-4" />} label="Email da conta">
                    <Input autoComplete="email" name="email" readOnly type="email" className="bg-slate-50 text-muted" value={customer.email ?? ""} />
                  </Field>
                  <Field icon={<Phone className="h-4 w-4" />} label="Telefone">
                    <Input
                      inputMode="tel"
                      autoComplete="tel"
                      name="phone"
                      type="tel"
                      placeholder="+55 44 99999-9999"
                      value={profile.phone}
                      onChange={(event) =>
                        updateProfileField("phone", event.target.value)
                      }
                    />
                  </Field>
                </div>
              </fieldset>
              <fieldset className="min-w-0 rounded-xl border border-line p-3 sm:p-4">
                <legend className="px-1 text-sm font-bold text-ink">Endereço de entrega</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field icon={<MapPin className="h-4 w-4" />} label="CEP">
                    <Input
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={9}
                      name="postalCode"
                      placeholder="00000-000"
                      value={profile.postalCode}
                      onChange={(event) => updateProfileField("postalCode", formatPostalCode(event.target.value))}
                    />
                  </Field>
                  <div className="lg:col-span-2">
                    <Field icon={<Home className="h-4 w-4" />} label="Endereço">
                      <Input
                        placeholder="Rua, numero e complemento"
                        autoComplete="street-address"
                        maxLength={240}
                        name="address"
                        value={profile.address}
                        onChange={(event) =>
                          updateProfileField("address", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field icon={<MapPin className="h-4 w-4" />} label="Bairro">
                    <Input
                      autoComplete="address-level3"
                      maxLength={120}
                      name="neighborhood"
                      value={profile.neighborhood}
                      onChange={(event) =>
                        updateProfileField("neighborhood", event.target.value)
                      }
                    />
                  </Field>
                  <Field icon={<MapPin className="h-4 w-4" />} label="Cidade">
                    <Input
                      autoComplete="address-level2"
                      maxLength={80}
                      name="city"
                      value={profile.city}
                      onChange={(event) =>
                        updateProfileField("city", event.target.value)
                      }
                    />
                  </Field>
                  <Field icon={<MapPin className="h-4 w-4" />} label="UF">
                    <Input
                      autoComplete="address-level1"
                      maxLength={2}
                      name="state"
                      value={profile.state}
                      onChange={(event) => updateProfileField("state", event.target.value.replace(/[^a-z]/gi, "").toUpperCase())}
                    />
                  </Field>
                  <div className="text-xs leading-5 text-muted sm:col-span-2 lg:col-span-3">
                    <div aria-live="polite" role="status">{postalStatus.message}</div>
                    {postalStatus.failed && <button className="mt-1 min-h-11 font-bold text-brand underline underline-offset-4" onClick={() => setPostalRetry((current) => current + 1)} type="button">Consultar CEP novamente</button>}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
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
                  </div>
                </div>
              </fieldset>
              <div>
                <Button
                  className="min-h-11 w-full sm:w-auto"
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
              {customer.passwordRecoveryEmailStatus ? (
                <CustomerEmailConfirmation key={customer.email} verified={customer.passwordRecoveryEmailStatus === "verified"} />
              ) : null}
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
            <div className="min-w-0 space-y-5"><ClubBenefits club={club} />
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <section aria-label="Seu saldo de cashback" className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <h3 className="flex items-center gap-2.5 text-sm font-black text-ink">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50"><Coins aria-hidden="true" className="h-4 w-4 text-emerald-700" /></span>
                  Cashback liberado
                </h3>
                <p className="mt-5 break-all text-4xl font-black tracking-tight tabular-nums text-ink">
                  {formatCurrency(balance)}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">Disponível para usar como desconto no checkout.</p>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl bg-surface-subtle p-4">
                  <div className="min-w-0"><dt className="text-xs leading-5 text-muted">Pendente</dt><dd className="mt-1 break-all text-sm font-bold tabular-nums text-ink">{formatCurrency((cashback?.pendingCents ?? 0) / 100)}</dd></div>
                  <div className="min-w-0"><dt className="text-xs leading-5 text-muted">Reservado em pedidos</dt><dd className="mt-1 break-all text-sm font-bold tabular-nums text-ink">{formatCurrency((cashback?.reservedCents ?? 0) / 100)}</dd></div>
                  <div className="min-w-0"><dt className="text-xs leading-5 text-muted">Créditos após estornos</dt><dd className="mt-1 break-all text-sm font-bold tabular-nums text-ink">{formatCurrency(cashback?.lifetimeEarned ?? "0")}</dd></div>
                  <div className="min-w-0"><dt className="text-xs leading-5 text-muted">Total utilizado</dt><dd className="mt-1 break-all text-sm font-bold tabular-nums text-ink">{formatCurrency(cashback?.lifetimeRedeemed ?? "0")}</dd></div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3"><a className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand" href="/minha-conta/avaliacoes">Avaliar minhas compras<ArrowRight aria-hidden="true" className="h-4 w-4" /></a><a className="inline-flex min-h-11 items-center text-xs font-bold text-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand" href="/cashback">Regras do cashback</a></div>
                <p className="mt-2 text-xs leading-5 text-muted">Benefícios de compras são liberados após conclusão e pagamento. Avaliações elegíveis recebem um agradecimento de 1%, qualquer que seja a nota.</p>
              </section>

              <section aria-label="Extrato de cashback" className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <h3 className="flex items-center gap-2.5 text-sm font-black text-ink">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-subtle"><Gift aria-hidden="true" className="h-4 w-4 text-muted" /></span>
                  Extrato de cashback
                </h3>
                <p className="mt-3 text-xs leading-5 text-muted">Confira as últimas movimentações do seu saldo.</p>
                <div className="mt-3 divide-y divide-line">
                  {cashback?.transactions.length ? (
                    cashback.transactions.map((transaction) => (
                      <div
                        className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4"
                        key={transaction.id}
                      >
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="break-words text-sm font-bold text-ink">
                            {transaction.description}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {transaction.type === "CREDIT" ? "Crédito" : transaction.type === "DEBIT" ? "Estorno / débito" : transaction.type} ·{" "}
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                        <span className="max-w-full break-words rounded-lg bg-surface-subtle px-2.5 py-1 text-sm font-bold tabular-nums text-ink">
                          {transaction.type === "DEBIT" || transaction.type === "EXPIRE" ? "- " : "+ "}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl bg-surface-subtle p-4 text-sm leading-6 text-muted">
                      Sem movimentações de cashback por enquanto.
                    </p>
                  )}
                </div>
              </section>
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
