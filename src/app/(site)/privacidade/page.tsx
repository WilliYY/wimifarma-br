import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politica de Privacidade | Wimifarma",
  description: "Como a Wimifarma trata dados pessoais no site, na conta e nos pedidos.",
};

const sections = [
  {
    title: "Dados que usamos",
    text: "Podemos tratar nome, telefone, e-mail, dados de conta e endereco. Nos pedidos, tambem registramos produtos, quantidades, valores, entrega ou retirada e a preferencia de pagamento. Nao solicitamos numero de cartao, CVV, senha bancaria ou chave Pix do cliente neste site.",
  },
  {
    title: "Finalidades",
    text: "Usamos os dados para criar e proteger sua conta, montar e confirmar pedidos, organizar entrega ou retirada, prestar atendimento, prevenir fraude, manter registros operacionais e cumprir obrigacoes legais e regulatorias.",
  },
  {
    title: "Compartilhamento",
    text: "O acesso e limitado a equipe autorizada e fornecedores tecnicos necessarios para hospedagem, banco de dados e autenticacao. Dados de clientes nao sao enviados ao assistente de cadastro de produtos. Nao vendemos dados pessoais.",
  },
  {
    title: "Armazenamento local e cookies",
    text: "O carrinho usa o armazenamento local do navegador para lembrar produtos e quantidades. Cookies estritamente necessarios podem manter login e seguranca da sessao. Atualmente nao usamos cookies de publicidade; se isso mudar, o aviso e os controles de consentimento deverao ser atualizados.",
  },
  {
    title: "Avaliacoes de produtos",
    text: "Somente clientes autenticados com pedido concluido podem avaliar um produto comprado. Na pagina publica exibimos a nota, o comentario, a data e o primeiro nome com o sobrenome abreviado; o vinculo com a conta e o pedido permanece restrito a equipe autorizada.",
  },
  {
    title: "Retencao e seguranca",
    text: "Mantemos os dados pelo tempo necessario ao atendimento e as obrigacoes legais, regulatorias e de defesa de direitos. Depois, os dados devem ser eliminados ou anonimizados quando aplicavel. Usamos controles de acesso, validacao, conexao protegida, backups e monitoramento, sem prometer risco zero.",
  },
  {
    title: "Seus direitos",
    text: "Voce pode solicitar confirmacao de tratamento, acesso, correcao, informacoes sobre compartilhamento e, quando aplicavel, eliminacao, oposicao, portabilidade ou revisao. A identidade pode ser confirmada antes do atendimento da solicitacao.",
  },
];

export default function Page() {
  return (
    <section className="bg-surface-subtle px-4 pb-20 pt-36 sm:px-6 sm:pt-40 lg:px-8 lg:pt-56">
      <div className="mx-auto max-w-4xl">
        <div className="border-b border-line pb-7">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand"><ShieldCheck className="h-5 w-5" /></span>
          <h1 className="mt-5 text-3xl font-black text-ink sm:text-4xl">Politica de Privacidade</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Transparencia sobre os dados usados pela Wimifarma no site, na conta e nos pedidos.</p>
          <p className="mt-3 text-xs font-bold text-muted">Atualizada em 4 de setembro de 2026.</p>
        </div>

        <div className="grid gap-8 py-8">
          <div><h2 className="text-lg font-black text-ink">Responsavel pelo tratamento</h2><p className="mt-2 text-sm leading-6 text-muted">Wimifarma, {siteConfig.address}. Para assuntos de privacidade, fale pelo telefone {siteConfig.displayPhone} ou pelo <a className="font-black text-brand underline" href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">WhatsApp oficial</a>.</p></div>
          {sections.map((section) => <div key={section.title}><h2 className="text-lg font-black text-ink">{section.title}</h2><p className="mt-2 text-sm leading-6 text-muted">{section.text}</p></div>)}
        </div>

        <div className="border-t border-line pt-7"><p className="text-sm leading-6 text-muted">Ao enviar um pedido, voce confirma que revisou os dados informados e tomou ciencia desta politica. O tratamento necessario ao pedido se baseia na execucao do atendimento solicitado e nas obrigacoes aplicaveis.</p><Link className="mt-5 inline-flex rounded-md bg-brand px-5 py-3 text-sm font-black text-white" href="/">Voltar ao inicio</Link></div>
      </div>
    </section>
  );
}
