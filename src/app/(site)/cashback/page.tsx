import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText, ShoppingBag, Wallet } from "lucide-react";

export const metadata: Metadata = { title: "Sua opinião vale mais | Cashback", alternates: { canonical: "/cashback" } };

export default function Page() {
  return <section className="bg-white px-4 pb-16 pt-40 sm:px-6 lg:pt-52"><div className="mx-auto max-w-5xl">
    <p className="text-sm font-bold text-pharma-green">Beneficios Wimifarma</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Sua opinião vale mais.</h1>
    <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Compartilhe sua experiência com os produtos que comprou e ajude outras pessoas a escolher. Na primeira avaliação de cada produto elegível, você recebe <strong className="font-semibold text-ink">1% de cashback extra sobre uma unidade paga</strong> para usar na próxima compra. Todas as notas recebem o mesmo percentual.</p>
    <Link className="mt-6 inline-flex min-h-12 items-center rounded-full bg-pharma-green px-6 text-sm font-bold text-white hover:brightness-95" href="/minha-conta/avaliacoes">Compartilhar minha experiência</Link>
    <div className="mt-12 grid gap-8 border-y border-line py-8 sm:grid-cols-3">
      {[{ Icon: ShoppingBag, title: "Compra concluida e paga", text: "Compre com sua conta de cliente e aguarde a confirmacao da farmacia." }, { Icon: MessageSquareText, title: "Uma opiniao, um bonus", text: "Na primeira avaliacao de cada produto elegivel, ganhe 1% sobre uma unidade paga." }, { Icon: Wallet, title: "Desconto no proximo pedido", text: "Na etapa Pagamento, selecione o saldo disponivel que deseja usar." }].map(({ Icon, title, text }) => <div key={title}><Icon className="h-7 w-7 text-pharma-green" aria-hidden="true" /><h2 className="mt-4 text-base font-black text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{text}</p></div>)}
    </div>
    <h2 className="mt-10 text-xl font-black text-ink">Regras do beneficio</h2>
    <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-muted">
      <li>Bonus de 1% por cliente e produto, uma unica vez. Exemplo: uma unidade paga de R$ 20 gera R$ 0,20. Comprar varias unidades ou editar a avaliacao nao multiplica o bonus.</li>
      <li>Vale para novas avaliacoes de compras vinculadas a sua conta, concluidas e pagas. Avaliacoes ja existentes nao recebem credito retroativo.</li>
      <li>O calculo considera o preco promocional efetivamente pago, descontado o cashback usado e sem frete. Centavos sao arredondados; bases muito pequenas podem resultar em R$ 0,00.</li>
      <li>Medicamentos com receita e Farmacia Popular nao participam. O bonus de avaliacao e adicional ao cashback de compra dos produtos que oferecem esse beneficio.</li>
      <li>A nota nao altera o bonus. As opinioes com incentivo sao identificadas publicamente. Nao inclua dados pessoais ou de saude no comentario.</li>
      <li>O saldo pode cobrir ate o valor dos produtos do proximo pedido pelo site, sem frete. Nao e saque, transferencia ou dinheiro. O pagamento restante continua sujeito a confirmacao humana.</li>
      <li>Ao enviar o pedido, o desconto fica reservado e sai do saldo disponivel. Cancelamento ou reembolso integral devolve o cashback usado, uma unica vez.</li>
      <li>Cancelamentos e reembolsos estornam os bonus gerados pela compra e pela avaliacao. Se o bonus ja tiver sido usado, o saldo pode ficar negativo e novos creditos compensam a diferenca antes de novo uso.</li>
    </ul>
    <Link className="mt-8 inline-flex min-h-11 items-center font-bold text-brand underline" href="/minha-conta">Consultar meu saldo e extrato</Link>
  </div></section>;
}
