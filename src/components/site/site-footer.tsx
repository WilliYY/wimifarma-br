import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import {
  ArrowUpRight, CreditCard, LockKeyhole, MapPin, MessageCircle,
  PackageCheck, Phone, QrCode, ShieldCheck, Store, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicNavItems, siteConfig } from "@/lib/site";

type BubbleStyle = CSSProperties & Record<`--${string}`, string>;

// Original approved animation. Preserve the count, timings and SVG filter.
const footerBubbles = Array.from({ length: 128 }, (_, index) => {
  const size = 2 + ((index * 37) % 40) / 10;
  const distance = 6 + ((index * 53) % 40) / 10;
  const position = -5 + ((index * 29) % 110);
  const time = 2 + ((index * 17) % 20) / 10;
  const delay = -1 * (2 + ((index * 31) % 20) / 10);
  return {
    "--delay": `${delay.toFixed(1)}s`,
    "--distance": `${distance.toFixed(1)}rem`,
    "--position": `${position}%`,
    "--size": `${size.toFixed(1)}rem`,
    "--time": `${time.toFixed(1)}s`,
  } as BubbleStyle;
});

const supportLinks = [
  { href: "/minha-conta", label: "Minha conta e pedidos" },
  { href: "/delivery", label: "Entrega e retirada" },
  { href: "/cashback", label: "Como funciona o cashback" },
  { href: "/privacidade", label: "Política de privacidade" },
  { href: "/contato", label: "Ajuda com sua compra" },
];

const linkStyle = "inline-flex min-h-11 w-fit items-center gap-2 rounded-sm text-sm text-ink/75 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-white";

export function SiteFooter() {
  return (
    <footer className="site-gooey-footer text-white" aria-label="Informações da Wimifarma">
      <div aria-hidden="true" className="site-gooey-footer__bubbles">
        {footerBubbles.map((style, index) => <div className="site-gooey-footer__bubble" key={index} style={style} />)}
      </div>
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">Da nossa farmácia para você</h2>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Store, title: "Sua farmácia em Ivaté", text: "Loja física, cuidado de perto.", href: "/contato" },
            { icon: MessageCircle, title: "Atendimento humano", text: "Converse com a nossa equipe.", href: siteConfig.whatsappUrl },
            { icon: PackageCheck, title: "Sua compra acompanhada", text: "Consulte o andamento na sua conta.", href: "/minha-conta" },
            { icon: Truck, title: "Entrega ou retirada", text: "Veja as opções para o seu endereço.", href: "/delivery" },
          ].map(({ icon: Icon, title, text, href }) => (
            <Link className="group flex min-h-11 min-w-0 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-brand" href={href} key={title}>
              <Icon aria-hidden="true" className="h-8 w-8 shrink-0 text-white" strokeWidth={1.5} />
              <span className="min-w-0">
                <span className="block text-base font-semibold group-hover:underline underline-offset-4">{title}</span>
                <span className="mt-1 block text-sm leading-5 text-white/85">{text}</span>
              </span>
            </Link>
          ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-white text-ink">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-10 sm:gap-x-8 sm:px-6 lg:grid-cols-[1.2fr_0.7fr_0.9fr_1.15fr] lg:px-8 lg:py-12">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <Link aria-label="Wimifarma — início" className="inline-flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4" href="/">
            <Image alt="Wimifarma" className="h-auto w-52" height={151} src="/brand/logo-wimifarma-compact.webp" unoptimized width={640} />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-ink/75">Cuidado, conveniência e uma equipe pronta para ajudar você a comprar com tranquilidade.</p>
          <Button asChild className="mt-5 min-h-11 rounded-full bg-brand px-5 text-white hover:bg-brand-strong focus-visible:ring-brand focus-visible:ring-offset-4">
            <a href={siteConfig.whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" className="h-4 w-4" />Falar com a equipe<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>
          </Button>
        </div>

        <nav aria-label="Explore a Wimifarma" className="min-w-0">
          <h2 className="mb-3 text-sm font-bold text-ink">Explore a Wimifarma</h2>
          <ul>{publicNavItems.map((item) => <li key={item.href}><Link className={linkStyle} href={item.href}>{item.label}</Link></li>)}</ul>
        </nav>

        <nav aria-label="Ajuda e informações" className="min-w-0">
          <h2 className="mb-3 text-sm font-bold text-ink">Ajuda com sua compra</h2>
          <ul>{supportLinks.map((item) => <li key={item.href}><Link className={linkStyle} href={item.href}>{item.label}</Link></li>)}</ul>
        </nav>

        <div className="col-span-2 min-w-0 sm:col-span-1">
          <h2 className="mb-3 text-sm font-bold text-ink">Nossa farmácia</h2>
          <address className="grid gap-3 text-sm not-italic leading-6">
            <a className={linkStyle} href={siteConfig.mapsUrl} rel="noopener noreferrer" target="_blank"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" /><span>{siteConfig.address}</span></a>
            <a className={linkStyle} href={`tel:+${siteConfig.phone}`}><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />{siteConfig.displayPhone}</a>
          </address>
          <a className={`${linkStyle} mt-2 font-semibold underline decoration-brand/30 underline-offset-4`} href={siteConfig.mapsUrl} rel="noopener noreferrer" target="_blank">Encontre a Wimifarma no Google<ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /></a>
          <a className={`${linkStyle} mt-1 underline decoration-brand/30 underline-offset-4`} href={siteConfig.reclameAquiUrl} rel="noopener noreferrer" target="_blank">Nosso perfil no Reclame AQUI<ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /></a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
          <div>
            <h2 className="text-sm font-bold">Informações para comprar com confiança</h2>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-5">
              {[
                { icon: LockKeyhole, badge: "HTTPS", title: "Conexão criptografada", href: "/privacidade" },
                { icon: Store, badge: "CNPJ", title: "Loja física em Ivaté", href: "/contato" },
                { icon: ShieldCheck, badge: "Privacidade", title: "Conheça nossa política", href: "/privacidade" },
              ].map(({ icon: Icon, badge, title, href }) => (
                <Link className="group flex min-h-11 min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4" href={href} key={badge}>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-pharma-green/25 bg-pharma-green/5 p-1 transition-colors group-hover:bg-pharma-green/10">
                    <span className="flex h-full w-full items-center justify-center rounded-full border border-pharma-green/15"><Icon aria-hidden="true" className="h-7 w-7 text-pharma-green" strokeWidth={1.5} /></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">{badge}</span>
                  <span className="max-w-32 text-xs leading-5 text-ink/75">{title}</span>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold">Formas de pagamento</h2>
            <div className="mt-5 flex flex-wrap gap-3" aria-label="Pix e cartão">
              <span className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface-subtle px-4 text-base font-semibold"><QrCode aria-hidden="true" className="h-5 w-5 text-pharma-green" />Pix</span>
              <span className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface-subtle px-4 text-base font-semibold"><CreditCard aria-hidden="true" className="h-5 w-5 text-ink/65" />Cartão</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink/75">Confira as opções e as condições disponíveis ao finalizar sua compra.</p>
            <Link className={`${linkStyle} mt-1 font-semibold`} href="/delivery"><Truck aria-hidden="true" className="h-4 w-4 text-brand" />Consulte entrega e retirada<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>

      <div className="border-t border-line bg-surface-subtle">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-xs leading-5 text-ink/75 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8">
          <div className="min-w-0"><p className="font-semibold text-ink">{siteConfig.legalName}</p><p>CNPJ {siteConfig.cnpj} · Ivaté-PR</p></div>
          <p>© {new Date().getFullYear()} Wimifarma. Todos os direitos reservados.</p>
        </div>
      </div>
      </div>
      <svg aria-hidden="true" className="pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden" focusable="false">
        <defs>
          <filter id="wimifarma-footer-blob">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
            <feColorMatrix in="blur" mode="matrix" result="blob" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
          </filter>
        </defs>
      </svg>
    </footer>
  );
}
