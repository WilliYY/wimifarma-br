"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Baby,
  BadgePercent,
  Bike,
  HeartPulse,
  MapPin,
  MessageCircle,
  Pill,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { siteConfig } from "@/lib/site";

const easeOut = [0.16, 1, 0.3, 1] as const;

const entrance = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut },
  },
};

function MotionBlock({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      animate="show"
      className={className}
      initial="hidden"
      transition={{ delay }}
      variants={entrance}
    >
      {children}
    </motion.div>
  );
}

const categoryItems: {
  href: string;
  icon: LucideIcon;
  label: string;
}[] = [
  { href: "/ofertas", icon: BadgePercent, label: "Cupom\nde desconto" },
  { href: "/ofertas", icon: BadgePercent, label: "Ofertas\nate 35%" },
  { href: "/ofertas", icon: Baby, label: "Infantil" },
  { href: "/ofertas", icon: Pill, label: "Medicamentos" },
  { href: "/ofertas", icon: HeartPulse, label: "Vitaminas\ne Suplementos" },
  { href: "/ofertas", icon: Sparkles, label: "Dermo" },
  { href: "/ofertas", icon: Sparkles, label: "Beleza" },
  { href: "/ofertas", icon: ShoppingBasket, label: "Higiene" },
];

const productCards = [
  {
    badge: "Oferta",
    category: "Higiene",
    icon: ShoppingBasket,
    price: "R$ 19,90",
    title: "Kit cuidado diario",
  },
  {
    badge: "Bem-estar",
    category: "Vitaminas",
    icon: HeartPulse,
    price: "R$ 29,90",
    title: "Vitaminas selecionadas",
  },
  {
    badge: "Consulte",
    category: "Medicamentos",
    icon: Pill,
    price: "Via WhatsApp",
    title: "Genericos e similares",
  },
  {
    badge: "Local",
    category: "Ivate",
    icon: Bike,
    price: "Pedido rapido",
    title: "Pedido local",
  },
];

const medicineProducts = [
  {
    badge: "Generico",
    description: "Analgesico de uso comum. Consulte a equipe antes de pedir.",
    price: "R$ 12,90",
    title: "Dipirona 500mg",
  },
  {
    badge: "Oferta",
    description: "Antitermico e analgesico. Disponibilidade sob consulta.",
    price: "R$ 9,90",
    title: "Paracetamol 750mg",
  },
  {
    badge: "Mais pedido",
    description: "Produto sujeito a orientacao farmaceutica e estoque.",
    price: "R$ 24,90",
    title: "Omeprazol 20mg",
  },
  {
    badge: "Antialergico",
    description: "Consulte apresentacao, quantidade e melhor horario.",
    price: "R$ 18,90",
    title: "Loratadina 10mg",
  },
  {
    badge: "Bem-estar",
    description: "Apoio para rotina diaria, com confirmacao de marca.",
    price: "R$ 29,90",
    title: "Vitamina C 1g",
  },
  {
    badge: "Essencial",
    description: "Item basico para cuidados diarios e higiene nasal.",
    price: "R$ 7,90",
    title: "Soro fisiologico",
  },
];

const serviceCards = [
  {
    description: "A equipe confirma disponibilidade, preco e melhor horario.",
    icon: MessageCircle,
    title: "Pedido pelo WhatsApp",
  },
  {
    description: "Fluxo preparado para campanhas e produtos em destaque.",
    icon: BadgePercent,
    title: "Ofertas organizadas",
  },
  {
    description: "Atendimento pensado para a rotina local da cidade.",
    icon: MapPin,
    title: "Atendimento em Ivate",
  },
  {
    description: "Admin, clientes, cupons e cashback preparados para evoluir.",
    icon: ShieldCheck,
    title: "Base escalavel",
  },
];

export function HomePage() {
  return (
    <>
      <section className="pharma-clouds bg-white pt-36 text-ink lg:pt-44">
        <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-5 sm:grid-cols-4 lg:grid-cols-8">
            {categoryItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <MotionBlock delay={index * 0.03} key={item.label}>
                  <Link
                    className="group flex flex-col items-center gap-3 text-center"
                    href={item.href}
                  >
                    <span
                      className="soft-float flex h-20 w-20 items-center justify-center rounded-full bg-[#f3f3f5] text-[#064b8e] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_12px_28px_rgba(17,24,39,0.04)] transition duration-300 group-hover:-translate-y-1 group-hover:bg-brand group-hover:text-white sm:h-24 sm:w-24"
                      style={{ animationDelay: `${index * 0.16}s` }}
                    >
                      <Icon className="h-9 w-9 stroke-[2.2]" />
                    </span>
                    <span className="whitespace-pre-line text-sm font-bold leading-tight text-[#4b4b4b] group-hover:text-brand">
                      {item.label}
                    </span>
                  </Link>
                </MotionBlock>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pharma-clouds bg-surface-subtle px-4 pb-10 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <MotionBlock className="relative min-h-[430px] overflow-hidden rounded-[1.75rem] bg-[#fff5f6] shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_26%,rgba(200,16,46,0.2),transparent_30%),radial-gradient(circle_at_76%_88%,rgba(6,75,142,0.12),transparent_28%),linear-gradient(100deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.95)_55%,rgba(255,226,231,0.9)_100%)]" />
            <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[48%] lg:block">
              <div className="soft-float absolute right-16 top-12 rounded-[1.5rem] bg-white/92 p-5 shadow-[0_18px_50px_rgba(17,24,39,0.12)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <BadgePercent className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Semana de ofertas
                    </p>
                    <p className="text-2xl font-black leading-none text-ink">
                      ate 35%
                    </p>
                  </div>
                </div>
              </div>
              <div className="soft-float absolute bottom-12 right-12 flex h-56 w-44 rotate-6 flex-col justify-between rounded-[1.75rem] bg-brand p-5 text-white shadow-[0_24px_60px_rgba(200,16,46,0.28)] [animation-delay:0.55s]">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/18">
                  <Pill className="h-8 w-8" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/72">
                    Medicamentos
                  </p>
                  <p className="mt-2 text-3xl font-black leading-none">
                    consulta rapida
                  </p>
                </div>
              </div>
              <div className="soft-float absolute bottom-28 right-64 flex h-28 w-28 -rotate-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_18px_45px_rgba(37,211,102,0.28)] [animation-delay:1s]">
                <MessageCircle className="h-12 w-12" />
              </div>
              <div className="absolute right-4 top-28 h-28 w-28 rounded-full bg-white/70" />
            </div>

            <div className="relative z-10 flex min-h-[430px] flex-col justify-center px-6 py-10 sm:px-10 lg:max-w-[60%] lg:px-12">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-bold text-brand">
                <BadgePercent className="h-4 w-4" />
                Ofertas da semana
              </span>

              <h1 className="mt-6 max-w-2xl font-body text-5xl font-black leading-[0.98] tracking-[-1px] text-ink sm:text-6xl lg:text-7xl">
                Farmacia Wimifarma em Ivate.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
                Consulte ofertas, medicamentos e Farmacia Popular com
                atendimento direto pelo WhatsApp.
              </p>

              <form
                action="/ofertas"
                className="mt-8 flex max-w-2xl flex-col gap-3 rounded-[1.25rem] border border-line bg-white/95 p-2 shadow-[0_14px_42px_rgba(17,24,39,0.1)] backdrop-blur sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                  <Search className="h-5 w-5 shrink-0 text-brand" />
                  <input
                    aria-label="Buscar na Wimifarma"
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                    name="q"
                    placeholder="Buscar produto, oferta ou categoria"
                    type="search"
                  />
                </div>
                <button
                  className="soft-breathe h-12 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(200,16,46,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-strong"
                  type="submit"
                >
                  Buscar
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  className="soft-breathe inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-6 text-sm font-bold text-white shadow-lg shadow-[#25d366]/20 transition duration-300 hover:-translate-y-1 hover:bg-[#1ebe57]"
                  href={siteConfig.whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Pedir pelo WhatsApp
                  <MessageCircle className="h-5 w-5" />
                </a>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-brand/15 bg-white px-6 text-sm font-bold text-ink shadow-[0_10px_24px_rgba(17,24,39,0.06)] transition duration-300 hover:-translate-y-1 hover:border-brand hover:text-brand"
                  href="/ofertas"
                >
                  Ver ofertas
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </MotionBlock>

        </div>
      </section>

      <section className="pharma-clouds bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <MotionBlock className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">
                Medicamentos
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-1px] text-ink sm:text-5xl">
                Consulte remedios, genericos e similares
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Precos demonstrativos para visualizar a vitrine. A equipe
                confirma marca, estoque e orientacao pelo WhatsApp.
              </p>
            </div>

            <a
              className="soft-breathe inline-flex w-fit items-center gap-2 rounded-xl bg-[#25d366] px-5 py-3 text-sm font-bold text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:bg-[#1ebe57]"
              href={siteConfig.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              Enviar lista
              <MessageCircle className="h-4 w-4" />
            </a>
          </MotionBlock>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {medicineProducts.map((product, index) => (
              <MotionBlock delay={index * 0.04} key={product.title}>
                <article className="group flex h-full min-h-[255px] flex-col rounded-[1.25rem] border border-line bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(17,24,39,0.12)]">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f3f3f5] text-[#064b8e] transition group-hover:bg-brand group-hover:text-white">
                      <Pill className="h-7 w-7" />
                    </span>
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                      {product.badge}
                    </span>
                  </div>

                  <h3 className="mt-6 text-xl font-black leading-tight text-ink">
                    {product.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted">
                    {product.description}
                  </p>

                  <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                        A partir de
                      </p>
                      <p className="mt-1 text-3xl font-black leading-none text-brand">
                        {product.price}
                      </p>
                    </div>
                    <a
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-ink px-5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 group-hover:bg-brand"
                      href={siteConfig.whatsappUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Pedir
                    </a>
                  </div>
                </article>
              </MotionBlock>
            ))}
          </div>
        </div>
      </section>

      <section className="pharma-clouds bg-surface-subtle px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <MotionBlock className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">
                Vitrine Wimifarma
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-1px] text-ink sm:text-5xl">
                Destaques para pedir agora
              </h2>
            </div>
            <Link
              className="soft-breathe inline-flex w-fit items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-1 hover:bg-brand-strong"
              href="/ofertas"
            >
              Ver todas as ofertas
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </MotionBlock>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {productCards.map((product, index) => {
              const Icon = product.icon;

              return (
                <MotionBlock delay={index * 0.06} key={product.title}>
                  <article className="group flex min-h-[340px] flex-col rounded-[1.25rem] border border-line bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(17,24,39,0.12)]">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                        {product.badge}
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        {product.category}
                      </span>
                    </div>

                    <div className="my-7 flex flex-1 items-center justify-center rounded-2xl bg-surface-subtle">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-[#064b8e] shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
                        <Icon className="h-10 w-10" />
                      </div>
                    </div>

                    <h3 className="text-lg font-bold leading-tight text-ink">
                      {product.title}
                    </h3>
                    <p className="mt-3 text-2xl font-black leading-none text-brand">
                      {product.price}
                    </p>
                    <a
                      className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 group-hover:bg-brand"
                      href={siteConfig.whatsappUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Pedir no WhatsApp
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </article>
                </MotionBlock>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pharma-clouds bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <MotionBlock>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">
              Plataforma da farmacia
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-1px] text-ink sm:text-5xl">
              Estrutura para vender hoje e crescer depois.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">
              A Wimifarma pode evoluir por modulos: produtos, ofertas, clientes,
              cupons, WhatsApp, cashback futuro e admin reservado.
            </p>
          </MotionBlock>

          <div className="grid gap-4 sm:grid-cols-2">
            {serviceCards.map((service, index) => {
              const Icon = service.icon;

              return (
                <MotionBlock delay={index * 0.06} key={service.title}>
                  <div className="h-full rounded-[1.25rem] border border-line bg-white p-6 shadow-sm">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f3f5] text-[#064b8e]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-6 text-xl font-bold text-ink">
                      {service.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {service.description}
                    </p>
                  </div>
                </MotionBlock>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
