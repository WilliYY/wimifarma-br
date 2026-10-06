import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight, CreditCard, LockKeyhole, MapPin, MessageCircle,
  PackageCheck, Phone, QrCode, ShieldCheck, Store, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicNavItems, siteConfig } from "@/lib/site";

const supportLinks = [
  { href: "/minha-conta", label: "Minha conta e pedidos" },
  { href: "/delivery", label: "Entrega e retirada" },
  { href: "/cashback", label: "Como funciona o cashback" },
  { href: "/privacidade", label: "Política de privacidade" },
  { href: "/contato", label: "Ajuda com sua compra" },
];

const linkStyle = "inline-flex min-h-11 w-fit items-center gap-2 rounded-sm text-sm text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-ink";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t-4 border-brand bg-ink text-white" aria-label="Informações da Wimifarma">
      <div className="border-b border-white/15">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { icon: LockKeyhole, title: "Conexão protegida", text: "Navegação com criptografia HTTPS." },
            { icon: Store, title: "Uma farmácia perto de você", text: "Loja física e atendimento em Ivaté-PR." },
            { icon: PackageCheck, title: "Acompanhe sua compra", text: "Seus pedidos reunidos na sua conta." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-pharma-yellow"><Icon aria-hidden="true" className="h-5 w-5" /></span>
              <div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-sm leading-5 text-white/70">{text}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-10 px-5 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.25fr_0.7fr_1fr_1.05fr] lg:px-8 lg:py-12">
        <div className="min-w-0">
          <Link aria-label="Wimifarma — início" className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/">
            <Image alt="Wimifarma" className="h-auto w-52 brightness-0 invert" height={151} src="/brand/logo-wimifarma-compact.webp" unoptimized width={640} />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/75">Cuidado, conveniência e uma equipe pronta para ajudar você a comprar com tranquilidade.</p>
          <Button asChild className="mt-5 min-h-11 rounded-full bg-white px-5 text-ink hover:bg-white/90">
            <a href={siteConfig.whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" className="h-4 w-4" />Falar com a equipe<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>
          </Button>
        </div>

        <nav aria-label="Explore a Wimifarma" className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/60">Explore</h2>
          <ul>{publicNavItems.map((item) => <li key={item.href}><Link className={linkStyle} href={item.href}>{item.label}</Link></li>)}</ul>
        </nav>

        <nav aria-label="Ajuda e informações" className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/60">Sua compra</h2>
          <ul>{supportLinks.map((item) => <li key={item.href}><Link className={linkStyle} href={item.href}>{item.label}</Link></li>)}</ul>
        </nav>

        <div className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/60">Nossa farmácia</h2>
          <address className="grid gap-3 text-sm not-italic leading-6">
            <a className={linkStyle} href={siteConfig.mapsUrl} rel="noopener noreferrer" target="_blank"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-pharma-yellow" /><span>{siteConfig.address}</span></a>
            <a className={linkStyle} href={`tel:+${siteConfig.phone}`}><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-pharma-yellow" />{siteConfig.displayPhone}</a>
          </address>
          <a className={`${linkStyle} mt-2 font-semibold underline decoration-white/30 underline-offset-4`} href={siteConfig.mapsUrl} rel="noopener noreferrer" target="_blank">Encontre a Wimifarma no Google<ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /></a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-2xl border border-white/15 bg-white/5 p-5 md:grid-cols-2 md:gap-10 lg:p-6">
          <div>
            <h2 className="text-sm font-bold">Formas de pagamento</h2>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Pix e cartão">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm"><QrCode aria-hidden="true" className="h-4 w-4" />Pix</span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm"><CreditCard aria-hidden="true" className="h-4 w-4" />Cartão</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">Confira as opções e as condições disponíveis ao finalizar sua compra.</p>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold"><Truck aria-hidden="true" className="h-4 w-4 text-pharma-yellow" />Entrega ou retirada</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">Retire na farmácia ou informe seu CEP no checkout para consultar frete, transportadora e prazo disponíveis.</p>
            <Link className={`${linkStyle} mt-1 font-semibold`} href="/delivery">Conheça as opções de entrega<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 text-xs leading-5 text-white/65 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0"><p className="font-semibold text-white/85">{siteConfig.legalName}</p><p>CNPJ {siteConfig.cnpj} · Ivaté-PR</p><p className="mt-1">© {new Date().getFullYear()} Wimifarma. Todos os direitos reservados.</p></div>
          <Link className={`${linkStyle} gap-3 text-xs`} href="/privacidade"><ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-pharma-yellow" /><span>Sua privacidade importa<br /><span className="text-white/60">Conheça como tratamos seus dados</span></span></Link>
        </div>
      </div>
    </footer>
  );
}
