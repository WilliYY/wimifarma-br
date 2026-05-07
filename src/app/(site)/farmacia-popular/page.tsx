import { ClipboardCheck, FileText, HeartPulse } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";

export default function Page() {
  return (
    <>
      <PageHero
        description="Pagina dedicada para explicar documentos, confirmar disponibilidade e orientar o cliente sem criar promessa automatica."
        title="Farmacia Popular"
      >
        <div className="flex gap-4">
          <HeartPulse className="h-8 w-8 text-pharma-green" />
          <div>
            <p className="font-bold text-ink">Atendimento com confirmacao</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Conteudo preparado para crescer com regras, documentos e produtos
              elegiveis.
            </p>
          </div>
        </div>
      </PageHero>
      <section className="bg-white py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          {[
            ["Documentos", "Espaco para CPF, documento com foto e receita quando aplicavel."],
            ["Fluxo", "Cliente chama no WhatsApp, equipe valida e confirma retirada ou entrega."],
          ].map(([title, text]) => (
            <div className="rounded-lg border border-line p-6" key={title}>
              {title === "Documentos" ? (
                <FileText className="h-6 w-6 text-brand" />
              ) : (
                <ClipboardCheck className="h-6 w-6 text-brand" />
              )}
              <h2 className="mt-5 text-xl font-bold text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
