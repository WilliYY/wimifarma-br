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

const linkStyle = "inline-flex min-h-11 w-fit items-center gap-2 rounded-sm text-sm text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-ink";

export function SiteFooter() {
  return (
    <footer className="site-gooey-footer text-white" aria-label="Informações da Wimifarma">
      <div aria-hidden="true" className="site-gooey-footer__bubbles">
        {footerBubbles.map((style, index) => <div className="site-gooey-footer__bubble" key={index} style={style} />)}
      </div>
      <div className="relative z-10 border-b border-white/15">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <h2 className="mb-5 text-sm font-bold">Informações para comprar com confiança</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: LockKeyhole, badge: "HTTPS", title: "Conexão criptografada", text: "Proteção dos dados durante a navegação.", href: "/privacidade", action: "Conheça nossa política de privacidade" },
            { icon: Store, badge: "CNPJ", title: "Farmácia com endereço", text: `CNPJ ${siteConfig.cnpj} · Loja física em Ivaté-PR.`, href: "/contato", action: "Conheça a Wimifarma" },
            { icon: PackageCheck, badge: "Pedidos", title: "Acompanhe sua compra", text: "Histórico e andamento reunidos na sua conta.", href: "/minha-conta", action: "Acessar meus pedidos" },
            { icon: MessageCircle, badge: "Atendimento", title: "Fale com nossa equipe", text: `WhatsApp ${siteConfig.displayPhone} · Atendimento da farmácia.`, href: siteConfig.whatsappUrl, action: "Conversar com a Wimifarma" },
          ].map(({ icon: Icon, badge, title, text, href, action }) => (
            <Link className="group flex min-w-0 items-start gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pharma-yellow" href={href} key={title}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-pharma-yellow/30 bg-pharma-yellow/10 text-pharma-yellow"><Icon aria-hidden="true" className="h-6 w-6" /></span>
              <span className="min-w-0">
                <span className="inline-flex rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90">{badge}</span>
                <span className="mt-2 block text-sm font-bold">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-white/90">{text}</span>
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-pharma-yellow">{action}<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" /></span>
              </span>
            </Link>
          ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-x-8 gap-y-10 px-5 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.25fr_0.7fr_1fr_1.05fr] lg:px-8 lg:py-12">
        <div className="min-w-0">
          <Link aria-label="Wimifarma — início" className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/">
            <Image alt="Wimifarma" className="h-auto w-52 brightness-0 invert" height={151} src="/brand/logo-wimifarma-compact.webp" unoptimized width={640} />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/90">Cuidado, conveniência e uma equipe pronta para ajudar você a comprar com tranquilidade.</p>
          <Button asChild className="mt-5 min-h-11 rounded-full bg-white px-5 text-ink hover:bg-white/90">
            <a href={siteConfig.whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" className="h-4 w-4" />Falar com a equipe<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>
          </Button>
        </div>

        <nav aria-label="Explore a Wimifarma" className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/90">Explore</h2>
          <ul>{publicNavItems.map((item) => <li key={item.href}><Link className={linkStyle} href={item.href}>{item.label}</Link></li>)}</ul>
        </nav>

        <nav aria-label="Ajuda e informações" className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/90">Sua compra</h2>
          <ul>{supportLinks.map((item) => <li key={item.href}><Link className={linkStyle} href={item.href}>{item.label}</Link></li>)}</ul>
        </nav>

        <div className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/90">Nossa farmácia</h2>
          <address className="grid gap-3 text-sm not-italic leading-6">
            <a className={linkStyle} href={siteConfig.mapsUrl} rel="noopener noreferrer" target="_blank"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-pharma-yellow" /><span>{siteConfig.address}</span></a>
            <a className={linkStyle} href={`tel:+${siteConfig.phone}`}><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-pharma-yellow" />{siteConfig.displayPhone}</a>
          </address>
          <a className={`${linkStyle} mt-2 font-semibold underline decoration-white/30 underline-offset-4`} href={siteConfig.mapsUrl} rel="noopener noreferrer" target="_blank">Encontre a Wimifarma no Google<ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /></a>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-2xl border border-white/15 bg-white/5 p-5 md:grid-cols-2 md:gap-10 lg:p-6">
          <div>
            <h2 className="text-sm font-bold">Formas de pagamento</h2>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Pix e cartão">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm"><QrCode aria-hidden="true" className="h-4 w-4" />Pix</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm"><CreditCard aria-hidden="true" className="h-4 w-4" />Cartão</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/90">Confira as opções e as condições disponíveis ao finalizar sua compra.</p>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold"><Truck aria-hidden="true" className="h-4 w-4 text-pharma-yellow" />Entrega ou retirada</h2>
            <p className="mt-3 text-sm leading-6 text-white/90">Retire na farmácia ou informe seu CEP no checkout para consultar frete, transportadora e prazo disponíveis.</p>
            <Link className={`${linkStyle} mt-1 font-semibold`} href="/delivery">Conheça as opções de entrega<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 text-xs leading-5 text-white/90 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0"><p className="font-semibold text-white">{siteConfig.legalName}</p><p>CNPJ {siteConfig.cnpj} · Ivaté-PR</p><p className="mt-1">© {new Date().getFullYear()} Wimifarma. Todos os direitos reservados.</p></div>
          <Link className={`${linkStyle} gap-3 text-xs`} href="/privacidade"><ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-pharma-yellow" /><span>Sua privacidade importa<br /><span className="text-white/90">Conheça como tratamos seus dados</span></span></Link>
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
