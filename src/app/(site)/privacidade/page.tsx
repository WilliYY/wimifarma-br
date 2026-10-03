import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createPublicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createPublicPageMetadata({
  description: "Como a Wimifarma trata dados pessoais no site, na conta e nos pedidos.",
  path: "/privacidade",
  title: "Política de Privacidade",
});

const sections = [
  {
    title: "Dados que usamos",
    text: "Podemos tratar nome, telefone, e-mail, dados de conta e endereço. Nos pedidos, registramos produtos, quantidades, valores e entrega ou retirada. Ao pagar online, o formulário seguro do Mercado Pago coleta os dados do cartão; a Wimifarma recebe um token, sem armazenar número completo nem CVV. E-mail e, quando necessário, CPF/CNPJ do pagador são usados para processar a cobrança. Nunca solicitamos senha bancária.",
  },
  {
    title: "Pagamentos online",
    text: "Compartilhamos com o Mercado Pago valor, referência do pedido, e-mail e documento informado pelo pagador, além do token seguro do cartão quando aplicável. O provedor processa o pagamento e controles de prevenção a fraude. Guardamos identificadores, valores e status para conciliação; uma tentativa ainda sem resposta pode ser mantida cifrada para evitar cobrança duplicada. Um cookie necessário permite consultar o pagamento no mesmo navegador por até 24 horas. A preparação e entrega do pedido seguem sob responsabilidade da farmácia.",
  },
  {
    title: "Finalidades",
    text: "Usamos os dados para criar e proteger sua conta, montar e confirmar pedidos, organizar entrega ou retirada, prestar atendimento, prevenir fraude, manter registros operacionais e cumprir obrigacoes legais e regulatorias.",
  },
  {
    title: "Compartilhamento",
    text: "O acesso é limitado à equipe autorizada e aos fornecedores necessários para hospedagem, banco de dados e autenticação. Ao calcular frete, enviamos ao Melhor Envio os CEPs de origem e destino, medidas, peso e valor da encomenda. Na contratação do transporte, a equipe compartilha com os responsáveis pela entrega os dados necessários do remetente, destinatário e documento fiscal. Dados de clientes não são enviados ao assistente de cadastro de produtos. Não vendemos dados pessoais.",
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
    title: "Assistente virtual Miauby",
    text: "Quando voce usa a Miauby, a pergunta e ate seis mensagens recentes da conversa sao enviadas ao Google Gemini para gerar a resposta, junto de dados publicos de produtos relacionados. O site nao grava esse historico no banco nesta fase. Nao envie CPF, cartao, senha, receita, laudo ou outros dados sensiveis no chat; o processamento pelo provedor segue os termos aplicaveis ao servico.",
  },
  {
    title: "Avisos operacionais da loja",
    text: "Podemos encaminhar à conta autorizada da loja no WhatsApp resumos de carrinho, novos pedidos e pagamentos confirmados. Esses avisos não incluem nome, telefone, endereço ou documento do cliente. Um cookie necessário, assinado e válido por até 24 horas, agrupa os avisos de carrinho e evita duplicatas; não é um cookie de publicidade. Avisos finalizados ficam no histórico administrativo por até 60 dias. Resultados incertos são preservados para conferência operacional.",
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
          <p className="mt-3 text-xs font-bold text-muted">Atualizada em 3 de outubro de 2026.</p>
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
