import Link from "next/link";
import Image from "next/image";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicNavItems, siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#101722] text-white">
      <div className="h-1 bg-[linear-gradient(90deg,#c8102e,#138a45,#064b8e)]" />

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.25fr_0.75fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Link aria-label="Wimifarma" className="inline-flex" href="/">
            <span className="flex h-14 w-44 items-center justify-start overflow-visible">
              <Image
                alt="Wimifarma"
                className="h-auto w-full object-contain object-left brightness-0 invert"
                height={48}
                src="/brand/logo-wimifarma.svg"
                width={176}
              />
            </span>
          </Link>

          <p className="mt-5 max-w-xs text-sm leading-6 text-white/62">
            Atendimento local pelo WhatsApp para medicamentos, Farmacia Popular
            e entrega.
          </p>

          <Button
            asChild
            className="mt-6 rounded-full bg-brand px-5 py-3 text-white shadow-[0_16px_36px_rgba(200,16,46,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-strong"
            variant="default"
          >
            <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">
              <MessageCircle className="h-4 w-4" />
              Chamar no WhatsApp
            </a>
          </Button>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/46">
            Navegacao
          </p>
          <div className="mt-5 grid gap-3">
            {publicNavItems.map((item) => (
              <Link
                className="w-fit text-sm font-semibold text-white/72 transition duration-300 hover:translate-x-1 hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/46">
            Atendimento
          </p>
          <div className="mt-5 grid gap-4 text-sm text-white/72">
            <p className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-brand" />
              {siteConfig.address}
            </p>
            <p className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-brand" />
              {siteConfig.displayPhone}
            </p>
            <p className="border-t border-white/10 pt-4 leading-6">
              Pedidos e disponibilidade sempre sob confirmacao da equipe.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 text-xs text-white/48 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>(c) 2026 Wimifarma. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
