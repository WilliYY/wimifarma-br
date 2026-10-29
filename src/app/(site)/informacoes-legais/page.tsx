import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { createPublicPageMetadata } from "@/lib/metadata";

export const metadata = createPublicPageMetadata({
  title: "Informações legais e atendimento farmacêutico",
  description: "Orientação farmacêutica, apresentação de receitas, trocas, cancelamentos e direitos sobre seus dados na Wimifarma.",
  path: "/informacoes-legais",
});

const linkStyle = "inline-flex min-h-11 items-center rounded-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

export default function LegalInformationPage() {
  return (
    <div className="bg-white px-5 pb-16 pt-36 text-ink sm:px-8 sm:pt-40 lg:pt-56">
      <div className="mx-auto max-w-3xl">
        <Link className={linkStyle} href="/">Voltar ao início</Link>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Informações para sua compra</h1>
        <p className="mt-4 text-base leading-7 text-muted">Conheça nossos canais de atendimento e as orientações para comprar com informação e cuidado.</p>
        <div className="mt-10 divide-y divide-line">
          <section className="scroll-mt-32 pb-8" id="atendimento-farmaceutico">
            <h2 className="text-xl font-bold">Atendimento farmacêutico</h2>
            <p className="mt-3 leading-7 text-muted">Para dúvidas sobre o uso de medicamentos, solicite atendimento com o farmacêutico responsável ou seu substituto pelo canal da farmácia. A equipe informa quem está em atendimento e seu registro profissional.</p>
            <a className={linkStyle} href={siteConfig.whatsappUrl} rel="noopener noreferrer" target="_blank">Solicitar atendimento farmacêutico</a>
            <p className="text-sm leading-6 text-muted">O conteúdo do site e a assistente virtual não substituem a avaliação de um profissional de saúde.</p>
          </section>
          <section className="scroll-mt-32 py-8" id="receitas">
            <h2 className="text-xl font-bold">Receitas e dispensação</h2>
            <p className="mt-3 leading-7 text-muted">Medicamentos sujeitos à prescrição são dispensados mediante apresentação e avaliação da receita pelo farmacêutico. A equipe orienta sobre a documentação e a apresentação do original físico ou de uma prescrição eletrônica válida.</p>
            <p className="mt-3 leading-7 text-muted">Para medicamentos classificados como antimicrobianos, o checkout solicita o envio privado da receita para análise inicial. Esse envio não substitui a conferência do documento e a retenção quando exigida. Medicamentos sujeitos a controle especial e itens da Farmácia Popular seguem atendimento assistido, sem compra automática pelo site.</p>
            <a className={linkStyle} href={siteConfig.whatsappUrl} rel="noopener noreferrer" target="_blank">Consultar a apresentação da receita</a>
          </section>
          <section className="scroll-mt-32 py-8" id="trocas-e-cancelamentos">
            <h2 className="text-xl font-bold">Trocas e cancelamentos</h2>
            <p className="mt-3 leading-7 text-muted">Para solicitar cancelamento, devolução, troca ou informar um produto incorreto ou avariado, entre em contato com a farmácia e informe o número do pedido. Não envie dados de cartão, senhas ou receitas pelo canal de cancelamento.</p>
            <p className="mt-3 leading-7 text-muted">Nas compras realizadas fora do estabelecimento, o Código de Defesa do Consumidor prevê o direito de arrependimento em até 7 dias da assinatura do contrato ou do recebimento do produto ou serviço, sem ônus, com restituição dos valores pagos. A equipe orientará a devolução e os cuidados de transporte e conservação aplicáveis ao produto, preservando seus direitos legais.</p>
            <a className={linkStyle} href={siteConfig.whatsappUrl} rel="noopener noreferrer" target="_blank">Solicitar troca ou cancelamento</a>
          </section>
          <section className="scroll-mt-32 py-8" id="privacidade">
            <h2 className="text-xl font-bold">Privacidade e dados pessoais</h2>
            <p className="mt-3 leading-7 text-muted">Conheça as finalidades do tratamento, os fornecedores envolvidos e os canais para exercer seus direitos sobre os dados pessoais.</p>
            <Link className={linkStyle} href="/privacidade">Ler a Política de Privacidade</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
