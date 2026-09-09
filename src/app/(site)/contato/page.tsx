import { ArrowRight, ArrowUpRight, ChevronDown, Mail, MapPin, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import { InstitutionalHero } from "@/components/site/institutional-hero";
import { Button } from "@/components/ui/button";
import { createPublicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createPublicPageMetadata({
  description: "Entre em contato com a Wimifarma em Ivaté-PR. WhatsApp, endereço e e-mail para consultar produtos, retirada, entrega e Farmácia Popular.",
  path: "/contato",
  title: "Contato e WhatsApp em Ivaté-PR",
});

const channels = [
  { icon: MessageCircle, label: "WhatsApp", value: siteConfig.displayPhone, description: "Produtos, pedidos e dúvidas com a equipe.", action: "Iniciar conversa", href: siteConfig.whatsappUrl, external: true, color: "text-pharma-green bg-[#eaf7ef]", border: "border-t-pharma-green" },
  { icon: MapPin, label: "Nossa farmácia", value: "Av. Minas Gerais, 2263", description: "Ivaté, Paraná. Venha nos visitar.", action: "Abrir no Google Maps", href: siteConfig.mapsUrl, external: true, color: "text-brand bg-brand-soft", border: "border-t-brand" },
  { icon: Mail, label: "E-mail", value: "contato@wimifarma.com.br", description: "Envie sua mensagem para a Wimifarma.", action: "Escrever e-mail", href: "mailto:contato@wimifarma.com.br", external: false, color: "text-[#146b86] bg-[#eaf5f9]", border: "border-t-[#146b86]" },
];

const questions = [
  { question: "O que enviar para consultar um produto?", answer: "Informe o nome e a apresentação do produto, ou envie uma foto legível pelo WhatsApp. A equipe confere o preço e a disponibilidade com você." },
  { question: "Posso retirar meu pedido na farmácia?", answer: "Sim. Combine a retirada com a equipe e aguarde a confirmação antes de ir à loja, na Avenida Minas Gerais, 2263, em Ivaté-PR." },
  { question: "Como saber se há entrega para o meu endereço?", answer: "Informe seu CEP no produto ou fale com a equipe pelo WhatsApp. A cobertura e as condições de entrega são confirmadas durante o atendimento." },
  { question: "Como funciona o atendimento da Farmácia Popular?", answer: "A equipe orienta sobre os documentos necessários e confere a disponibilidade. Consulte a página Farmácia Popular e fale com a Wimifarma para confirmar seu atendimento." },
];

export default function Page() {
  return (
    <>
      <InstitutionalHero
        title="Contato Wimifarma"
        headline="Uma conversa faz toda a diferença."
        description="Para consultar um produto, combinar a retirada ou saber sobre entrega, fale diretamente com a nossa equipe."
        image="/banners/contato-conversa.webp"
        imageAlt="Foto ilustrativa de uma mulher sorrindo durante uma conversa pelo celular."
        imageMode="portrait"
      >
        <Button asChild variant="success"><a href={siteConfig.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" className="h-4 w-4" />Chamar no WhatsApp</a></Button>
        <Button asChild variant="secondary"><a href="#canais-contato">Outros contatos<ArrowRight aria-hidden="true" className="h-4 w-4" /></a></Button>
      </InstitutionalHero>

      <section id="canais-contato" className="scroll-mt-56 border-b border-line bg-white px-5 py-10 sm:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-extrabold text-ink">Escolha como falar com a gente</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {channels.map(({ icon: Icon, label, value, description, action, href, external, color, border }) => (
              <a key={label} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={`group flex min-w-0 flex-col rounded-lg border border-t-[3px] border-line bg-white p-5 transition duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-safe:hover:-translate-y-1 lg:p-6 ${border}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${color}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-muted transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-muted">{label}</h3>
                <p className="mt-1 break-words text-lg font-bold leading-snug text-ink [overflow-wrap:anywhere]">{value}</p>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted">{description}</p>
                <span className="mt-5 border-t border-line pt-4 text-sm font-bold text-brand">{action}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f1f8f4] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <Store aria-hidden="true" className="mt-1 h-8 w-8 shrink-0 text-pharma-green" />
            <div><h2 className="text-2xl font-extrabold text-ink">Seu pedido, do seu jeito.</h2><p className="mt-2 max-w-xl text-base leading-7 text-muted">Retirada na Wimifarma ou entrega conforme a cobertura. A equipe combina tudo com você antes de confirmar.</p></div>
          </div>
          <Button asChild variant="secondary" className="w-fit shrink-0"><Link href="/delivery">Consultar entrega<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button>
        </div>
      </section>

      <section className="bg-white px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_1fr] lg:gap-16">
          <div>
            <p className="text-sm font-bold text-brand">Antes de chamar</p><h2 className="mt-2 text-3xl font-extrabold text-ink">Podemos ajudar?</h2>
            <p className="mt-4 max-w-sm text-base leading-7 text-muted">Algumas respostas para facilitar o seu contato com a farmácia.</p>
            <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-bold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href="/farmacia-popular">Ver Farmácia Popular<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          <div className="min-w-0 divide-y divide-line border-y border-line">
            {questions.map(({ question, answer }) => (
              <details key={question} className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-5 text-base font-bold text-ink transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">{question}<ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-brand transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary>
                <p className="pb-5 pr-7 text-base leading-7 text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
