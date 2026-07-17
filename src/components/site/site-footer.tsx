import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicNavItems, siteConfig } from "@/lib/site";

type BubbleStyle = CSSProperties & Record<`--${string}`, string>;

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

export function SiteFooter() {
  return (
    <footer className="site-gooey-footer text-white">
      <div aria-hidden="true" className="site-gooey-footer__bubbles">
        {footerBubbles.map((style, index) => (
          <div className="site-gooey-footer__bubble" key={index} style={style} />
        ))}
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.25fr_0.75fr_1fr] lg:px-8">
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

          <p className="mt-5 max-w-xs text-sm font-medium leading-6 text-white/85">
            Atendimento local pelo WhatsApp para medicamentos, Farmacia Popular
            e entrega.
          </p>

          <Button
            asChild
            className="mt-6 rounded-full bg-white px-5 py-3 text-ink shadow-[0_16px_36px_rgba(88,6,20,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/92"
            variant="default"
          >
            <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">
              <MessageCircle className="h-4 w-4" />
              Chamar no WhatsApp
            </a>
          </Button>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
            Navegacao
          </p>
          <div className="mt-5 grid gap-3">
            {publicNavItems.map((item) => (
              <Link
                className="w-fit text-sm font-bold text-white/85 transition duration-300 hover:translate-x-1 hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
            Atendimento
          </p>
          <div className="mt-5 grid gap-4 text-sm font-medium text-white/85">
            <p className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-pharma-yellow" />
              {siteConfig.address}
            </p>
            <p className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-pharma-yellow" />
              {siteConfig.displayPhone}
            </p>
            <p className="border-t border-white/20 pt-4 leading-6">
              Pedidos e disponibilidade sempre sob confirmacao da equipe.
            </p>
          </div>
        </div>
      </div>
      <div className="relative z-10 border-t border-white/20 py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 text-xs font-medium text-white/70 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>(c) 2026 Wimifarma. Todos os direitos reservados.</p>
        </div>
      </div>
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden"
        focusable="false"
      >
        <defs>
          <filter id="wimifarma-footer-blob">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              result="blob"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            />
          </filter>
        </defs>
      </svg>
    </footer>
  );
}
