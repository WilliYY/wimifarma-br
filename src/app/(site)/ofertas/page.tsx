import { BadgePercent, MessageCircle, Tags } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";
import { formatCurrency } from "@/lib/utils";

const offers = [
  ["Cuidado diario", "Produtos essenciais com preco de campanha.", 19.9],
  ["Bem-estar", "Vitaminas e suplementos para demanda recorrente.", 29.9],
  ["Beleza e pele", "Vitrine preparada para dermocosmeticos.", 39.9],
];

export default function Page() {
  return (
    <>
      <PageHero
        description="Vitrine inicial para ofertas comerciais. Depois ela sera alimentada pelo admin e pelas APIs de produtos e campanhas."
        title="Ofertas Wimifarma"
      >
        <div className="flex items-start gap-4">
          <BadgePercent className="h-8 w-8 text-brand" />
          <div>
            <p className="font-bold text-ink">Campanhas estruturadas</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Preco, validade, destaque, produto relacionado e chamada pronta
              para WhatsApp.
            </p>
          </div>
        </div>
      </PageHero>
      <section className="bg-white py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {offers.map(([title, description, price]) => (
            <Card key={title}>
              <CardContent className="p-5">
                <Tags className="h-6 w-6 text-brand" />
                <h2 className="mt-5 text-xl font-bold text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {description}
                </p>
                <p className="mt-5 text-3xl font-black text-brand">
                  {formatCurrency(Number(price))}
                </p>
                <a
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-pharma-green"
                  href={siteConfig.whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle className="h-4 w-4" />
                  Conferir disponibilidade
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
