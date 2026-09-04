import { Bike, Clock, MapPin } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";

export default function Page() {
  return (
    <>
      <PageHero
        description="Entrega local com checkout organizado, confirmacao humana da farmacia e apoio pelo WhatsApp quando necessario."
        title="Delivery em Ivate"
      >
        <div className="flex gap-4">
          <Bike className="h-8 w-8 text-brand" />
          <div>
            <p className="font-bold text-ink">Checkout com entrega em Ivate</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Monte o carrinho, informe o endereco e aguarde a confirmacao da
              equipe antes do pagamento.
            </p>
          </div>
        </div>
      </PageHero>
      <section className="bg-white py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div className="rounded-lg border border-line p-6">
            <MapPin className="h-6 w-6 text-brand" />
            <h2 className="mt-5 text-xl font-bold text-ink">Area local</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Preparado para regras de bairro, taxa, horario e disponibilidade
              quando a operacao estiver pronta.
            </p>
          </div>
          <div className="rounded-lg border border-line p-6">
            <Clock className="h-6 w-6 text-brand" />
            <h2 className="mt-5 text-xl font-bold text-ink">Horarios</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Conteudo editavel no futuro pelo admin de configuracoes.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
