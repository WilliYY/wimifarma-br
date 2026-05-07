import { HeartHandshake, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";

export default function Page() {
  return (
    <>
      <PageHero
        description="A Wimifarma ganha uma plataforma propria para relacionamento, campanhas, atendimento e crescimento comercial."
        title="Sobre a Wimifarma"
      >
        <div className="flex gap-4">
          <HeartHandshake className="h-8 w-8 text-brand" />
          <div>
            <p className="font-bold text-ink">Farmacia local, plataforma moderna</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Uma base que respeita o atendimento humano e abre caminho para
              automacao comercial.
            </p>
          </div>
        </div>
      </PageHero>
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ShieldCheck className="h-8 w-8 text-brand" />
          <h2 className="mt-5 text-2xl font-black text-ink">
            Estrutura sem misturar projetos
          </h2>
          <p className="mt-4 text-base leading-8 text-muted">
            A Wimifarma fica separada do Candy English, com banco, containers,
            rotas, admin, features e documentacao proprios.
          </p>
        </div>
      </section>
    </>
  );
}
