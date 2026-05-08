import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicNavItems, siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-40 items-center justify-start overflow-hidden">
              <Image
                alt="Wimifarma"
                className="h-full w-full scale-[2.05] object-contain object-left brightness-0 invert"
                height={40}
                src="/brand/logo-wimifarma.svg"
                width={40}
              />
            </span>
            <div>
              <p className="font-black">Wimifarma</p>
              <p className="text-sm text-white/60">
                Plataforma comercial em construcao
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/68">
            Base preparada para site publico, admin, ofertas, produtos, cupons,
            clientes, WhatsApp, auditoria e cashback futuro.
          </p>
          <Button asChild className="mt-6" variant="default">
            <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">
              <MessageCircle className="h-4 w-4" />
              Chamar no WhatsApp
            </a>
          </Button>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-white/50">
            Navegacao
          </p>
          <div className="mt-4 grid gap-3">
            {publicNavItems.map((item) => (
              <Link
                className="text-sm text-white/72 transition hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-white/50">
            Atendimento
          </p>
          <div className="mt-4 space-y-3 text-sm text-white/72">
            <p>{siteConfig.address}</p>
            <p>{siteConfig.displayPhone}</p>
            <p>Ofertas e pedidos sob confirmacao da equipe.</p>
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
