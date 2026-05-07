import { Mail, MapPin, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

export default function Page() {
  return (
    <>
      <PageHero
        description="Central de contato inicial com foco em WhatsApp. Formularios e leads ficam preparados para evolucao com banco."
        title="Contato Wimifarma"
      >
        <div className="space-y-4 text-sm text-muted">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand" />
            {siteConfig.address}
          </p>
          <p className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-brand" />
            {siteConfig.displayPhone}
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand" />
            contato@wimifarma.com.br
          </p>
        </div>
      </PageHero>
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black text-ink">
            Quer atendimento agora?
          </h2>
          <p className="mt-3 text-muted">
            Use o WhatsApp para falar com a equipe e confirmar ofertas,
            disponibilidade ou delivery.
          </p>
          <Button asChild className="mt-6" size="lg">
            <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">
              Abrir WhatsApp
            </a>
          </Button>
        </div>
      </section>
    </>
  );
}
