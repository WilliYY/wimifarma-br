"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Baby,
  BadgePercent,
  Bike,
  HeartPulse,
  MessageCircle,
  Pause,
  Pill,
  Play,
  ShoppingBasket,
  Sparkles,
  Volume2,
  VolumeX,
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

type ProductVisualConfig = {
  accent: string;
  headline: string;
  kind?: "box" | "bottle" | "tube";
  label: string;
  soft: string;
};

type MedicineProduct = {
  badge: string;
  description: string;
  icon?: LucideIcon;
  price: string;
  title: string;
  visual: ProductVisualConfig;
};

type OfferProduct = {
  badge: string;
  category: string;
  icon: LucideIcon;
  price: string;
  title: string;
  visual: ProductVisualConfig;
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

function ProductVisual({
  icon: Icon,
  visual,
}: {
  icon: LucideIcon;
  visual: ProductVisualConfig;
}) {
  const packageClass =
    visual.kind === "bottle"
      ? "h-24 w-16 rounded-[1.45rem]"
      : visual.kind === "tube"
        ? "h-24 w-20 rounded-[1.25rem]"
        : "h-24 w-28 rounded-[1rem]";

  return (
    <div
      className="relative mb-5 h-36 overflow-hidden rounded-[1.15rem] border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_34px_rgba(17,24,39,0.08)]"
      style={{
        background: `linear-gradient(135deg, ${visual.soft} 0%, #ffffff 48%, rgba(247,248,250,0.96) 100%)`,
      }}
    >
      <div
        className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-35 blur-xl"
        style={{ background: visual.accent }}
      />
      <div className="absolute -bottom-10 left-1/2 h-28 w-52 -translate-x-1/2 rounded-[50%] bg-white/75 blur-md" />

      <div
        className={`absolute left-7 top-7 flex ${packageClass} rotate-[-5deg] flex-col justify-between bg-white p-3 shadow-[0_18px_35px_rgba(17,24,39,0.16)] transition duration-500 group-hover:rotate-[-2deg] group-hover:scale-[1.03]`}
      >
        <span
          className="h-2 w-full rounded-full"
          style={{ background: visual.accent }}
        />
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-ink">
          Wimi
        </span>
        <span className="text-[9px] font-bold uppercase leading-tight text-muted">
          {visual.label}
        </span>
        <span className="h-5 w-10 rounded-full bg-surface-subtle" />
      </div>

      <div className="absolute bottom-5 right-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#064b8e] shadow-[0_14px_34px_rgba(17,24,39,0.12)] transition duration-500 group-hover:-translate-y-1 group-hover:text-brand">
        <Icon className="h-8 w-8 stroke-[2.1]" />
      </div>

      <div className="absolute left-36 top-8 max-w-[8rem]">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
          Wimifarma
        </p>
        <p className="mt-2 text-lg font-black leading-none text-ink">
          {visual.headline}
        </p>
      </div>
    </div>
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

const productCards: OfferProduct[] = [
  {
    badge: "Oferta",
    category: "Higiene",
    icon: ShoppingBasket,
    price: "R$ 19,90",
    title: "Kit cuidado diario",
    visual: {
      accent: "#c8102e",
      headline: "cuidado",
      label: "higiene",
      soft: "#fff1f3",
    },
  },
  {
    badge: "Bem-estar",
    category: "Vitaminas",
    icon: HeartPulse,
    price: "R$ 29,90",
    title: "Vitaminas selecionadas",
    visual: {
      accent: "#138a45",
      headline: "vitaminas",
      kind: "bottle",
      label: "bem-estar",
      soft: "#effaf3",
    },
  },
  {
    badge: "Consulte",
    category: "Medicamentos",
    icon: Pill,
    price: "Via WhatsApp",
    title: "Genericos e similares",
    visual: {
      accent: "#064b8e",
      headline: "consulta",
      label: "genericos",
      soft: "#eef7ff",
    },
  },
  {
    badge: "Local",
    category: "Ivate",
    icon: Bike,
    price: "Pedido rapido",
    title: "Pedido local",
    visual: {
      accent: "#c8102e",
      headline: "local",
      kind: "tube",
      label: "entrega",
      soft: "#fff7ed",
    },
  },
];

const medicineProducts: MedicineProduct[] = [
  {
    badge: "Generico",
    description: "Analgesico de uso comum. Consulte a equipe antes de pedir.",
    price: "R$ 12,90",
    title: "Dipirona 500mg",
    visual: {
      accent: "#c8102e",
      headline: "analgesico",
      label: "comprimidos",
      soft: "#fff1f3",
    },
  },
  {
    badge: "Oferta",
    description: "Antitermico e analgesico. Disponibilidade sob consulta.",
    price: "R$ 9,90",
    title: "Paracetamol 750mg",
    visual: {
      accent: "#064b8e",
      headline: "febre e dor",
      label: "comprimidos",
      soft: "#eef7ff",
    },
  },
  {
    badge: "Mais pedido",
    description: "Produto sujeito a orientacao farmaceutica e estoque.",
    price: "R$ 24,90",
    title: "Omeprazol 20mg",
    visual: {
      accent: "#138a45",
      headline: "consulta",
      kind: "bottle",
      label: "capsulas",
      soft: "#effaf3",
    },
  },
  {
    badge: "Antialergico",
    description: "Consulte apresentacao, quantidade e melhor horario.",
    price: "R$ 18,90",
    title: "Loratadina 10mg",
    visual: {
      accent: "#c8102e",
      headline: "alergia",
      label: "comprimidos",
      soft: "#fff7ed",
    },
  },
  {
    badge: "Bem-estar",
    description: "Apoio para rotina diaria, com confirmacao de marca.",
    icon: HeartPulse,
    price: "R$ 29,90",
    title: "Vitamina C 1g",
    visual: {
      accent: "#f7c948",
      headline: "vitamina c",
      kind: "bottle",
      label: "suplemento",
      soft: "#fff9df",
    },
  },
  {
    badge: "Essencial",
    description: "Item basico para cuidados diarios e higiene nasal.",
    price: "R$ 7,90",
    title: "Soro fisiologico",
    visual: {
      accent: "#064b8e",
      headline: "soro",
      kind: "tube",
      label: "higiene",
      soft: "#eef7ff",
    },
  },
];

const extraMedicineProducts: MedicineProduct[] = [
  {
    badge: "Consulte",
    description: "Anti-inflamatorio com orientacao da equipe antes do pedido.",
    price: "R$ 16,90",
    title: "Ibuprofeno 400mg",
    visual: {
      accent: "#c8102e",
      headline: "dor",
      label: "comprimidos",
      soft: "#fff1f3",
    },
  },
  {
    badge: "Rotina",
    description: "Opcao para consulta de marca, dosagem e disponibilidade.",
    price: "R$ 14,90",
    title: "Antiacido",
    visual: {
      accent: "#138a45",
      headline: "estomago",
      kind: "bottle",
      label: "suspensao",
      soft: "#effaf3",
    },
  },
  {
    badge: "Cuidado",
    description: "Pastilhas e itens de cuidado conforme estoque da farmacia.",
    price: "R$ 11,90",
    title: "Pastilha para garganta",
    visual: {
      accent: "#064b8e",
      headline: "garganta",
      label: "pastilhas",
      soft: "#eef7ff",
    },
  },
  {
    badge: "Primeiros cuidados",
    description: "Curativos e itens basicos para pequenos cuidados diarios.",
    icon: ShoppingBasket,
    price: "R$ 8,90",
    title: "Curativo adesivo",
    visual: {
      accent: "#c8102e",
      headline: "curativo",
      kind: "tube",
      label: "higiene",
      soft: "#fff7ed",
    },
  },
];

function MedicineCard({
  index,
  product,
}: {
  index: number;
  product: MedicineProduct;
}) {
  const Icon = product.icon ?? Pill;

  return (
    <MotionBlock delay={index * 0.04} key={product.title}>
      <article className="group flex h-full min-h-[388px] flex-col rounded-[1.35rem] border border-brand/10 bg-[linear-gradient(180deg,#ffffff_0%,#fff9fa_100%)] p-4 shadow-[0_16px_45px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-1.5 hover:border-brand/20 hover:shadow-[0_22px_60px_rgba(17,24,39,0.14)]">
        <ProductVisual icon={Icon} visual={product.visual} />

        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-black leading-tight text-ink">
            {product.title}
          </h3>
          <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
            {product.badge}
          </span>
        </div>

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
  );
}

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play().then(() => setIsPlaying(true));
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && video.paused) {
      void video.play().then(() => setIsPlaying(true));
    }
  };

  return (
    <div className="overflow-hidden rounded-[1.75rem] border-[3px] border-brand bg-brand p-1.5 shadow-[0_24px_80px_rgba(200,16,46,0.16)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] bg-black sm:aspect-video lg:aspect-[16/6] xl:aspect-[16/5.6]">
        <video
          aria-label="Video da Wimifarma"
          autoPlay
          className="h-full w-full bg-black object-contain object-center"
          loop
          muted
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
          playsInline
          preload="auto"
          ref={videoRef}
        >
          <source src="/videos/thiago-cansado.mp4" type="video/mp4" />
        </video>

        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-ink/60 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-md">
          <button
            aria-label={isPlaying ? "Pausar video" : "Reproduzir video"}
            className="soft-breathe inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
            onClick={togglePlay}
            title={isPlaying ? "Pausar video" : "Reproduzir video"}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </button>

          <button
            aria-label={isMuted ? "Ativar som do video" : "Silenciar video"}
            className="soft-breathe inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
            onClick={toggleMute}
            title={isMuted ? "Ativar som do video" : "Silenciar video"}
            type="button"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="pharma-clouds bg-white pt-44 text-ink lg:pt-52">
        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-x-5 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
            {categoryItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <MotionBlock delay={index * 0.03} key={item.label}>
                  <Link
                    className="group flex flex-col items-center gap-5 text-center"
                    href={item.href}
                  >
                    <span
                      className="soft-float flex h-20 w-20 items-center justify-center rounded-full bg-[#f0f3f7] text-[#064b8e] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_14px_34px_rgba(17,24,39,0.06)] transition duration-300 group-hover:-translate-y-1 group-hover:bg-brand group-hover:text-white sm:h-24 sm:w-24"
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
          <MotionBlock className="overflow-hidden rounded-[2rem] border border-white bg-white p-3 shadow-[0_18px_60px_rgba(17,24,39,0.12)] sm:p-4">
            <HeroVideo />
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
              <MedicineCard
                index={index}
                key={product.title}
                product={product}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="pharma-clouds bg-surface-subtle px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <MotionBlock className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-4xl font-black tracking-[-1px] text-ink sm:text-5xl">
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
                  <article className="group flex min-h-[382px] flex-col rounded-[1.35rem] border border-brand/10 bg-[linear-gradient(180deg,#ffffff_0%,#fff9fa_100%)] p-4 shadow-[0_16px_45px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-1.5 hover:border-brand/20 hover:shadow-[0_22px_60px_rgba(17,24,39,0.14)]">
                    <div className="flex items-center justify-between pb-4">
                      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                        {product.badge}
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        {product.category}
                      </span>
                    </div>

                    <ProductVisual icon={Icon} visual={product.visual} />

                    <h3 className="text-lg font-bold leading-tight text-ink">
                      {product.title}
                    </h3>
                    <p className="mt-3 text-2xl font-black leading-none text-brand">
                      {product.price}
                    </p>
                    <a
                      className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 group-hover:bg-brand"
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
        <div className="mx-auto max-w-7xl">
          <MotionBlock className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">
                Mais cuidados
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-1px] text-ink sm:text-5xl">
                Medicamentos e itens essenciais
              </h2>
            </div>
            <a
              className="soft-breathe inline-flex w-fit items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-1 hover:bg-brand"
              href={siteConfig.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              Consultar no WhatsApp
              <MessageCircle className="h-4 w-4" />
            </a>
          </MotionBlock>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {extraMedicineProducts.map((product, index) => (
              <MedicineCard
                index={index}
                key={product.title}
                product={product}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
