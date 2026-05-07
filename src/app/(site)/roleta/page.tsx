import { Gift, ShieldCheck, TicketPercent } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";

export default function Page() {
  return (
    <>
      <PageHero
        description="Experiencia promocional preparada para capturar leads, distribuir cupons e auditar tentativas. A regra real entra numa etapa futura."
        title="Roleta Promocional"
      >
        <div className="flex gap-4">
          <Gift className="h-8 w-8 text-brand" />
          <div>
            <p className="font-bold text-ink">Modulo pronto para campanha</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Campanhas, premios, probabilidades, limites e tentativas ja
              previstos no banco.
            </p>
          </div>
        </div>
      </PageHero>
      <section className="bg-white py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div className="rounded-lg border border-line p-6">
            <TicketPercent className="h-6 w-6 text-brand" />
            <h2 className="mt-5 text-xl font-bold text-ink">Cupons</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Premios podem gerar cupons vinculados e controlados.
            </p>
          </div>
          <div className="rounded-lg border border-line p-6">
            <ShieldCheck className="h-6 w-6 text-brand" />
            <h2 className="mt-5 text-xl font-bold text-ink">Auditoria</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Tentativas registram telefone, premio, campanha e metadados.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
