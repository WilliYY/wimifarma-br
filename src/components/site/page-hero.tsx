import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

type PageHeroProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHero({ children, description, title }: PageHeroProps) {
  return (
    <section className="pharma-clouds border-b border-line bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 pt-36 sm:px-6 sm:pt-40 lg:grid-cols-[1fr_0.74fr] lg:px-8 lg:pb-20 lg:pt-60">
        <div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            {description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">
                Falar no WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="/ofertas">Ver ofertas</a>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white/92 p-5 shadow-[0_24px_70px_rgba(17,24,39,0.08)]">
          {children ?? (
            <div className="grid gap-3 text-sm text-muted">
              <p>Modulo estruturado para evoluir com dados reais.</p>
              <p>Sem clientes reais, sem senhas reais e sem checkout agora.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
