import type { Metadata } from "next";
import Link from "next/link";
import { Coins, MessageSquareText, Wallet } from "lucide-react";

export const metadata: Metadata = { title: "WimiCoins, cashback e avaliações", alternates: { canonical: "/cashback" } };

export default function Page() {
  return <section className="bg-white px-4 pb-16 pt-40 sm:px-6 lg:pt-52"><div className="mx-auto max-w-5xl">
    <p className="text-sm font-bold text-pharma-green">Club Wimifarma</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">WimiCoins, cashback e avaliações.</h1>
    <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Clientes cadastrados têm inscrição automática e gratuita no Club. Confira os benefícios indicados em cada produto e acompanhe seus saldos na conta.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {[{ Icon: Coins, title: "WimiCoins", text: "Ganhe moedas em produtos selecionados. O percentual aparece no item. 100 WimiCoins = R$ 1 de desconto nas próximas compras." }, { Icon: Wallet, title: "Cashback da compra", text: "Ganhe 1% nos produtos participantes. Em um item elegível de R$ 100 efetivamente pagos, você acumula R$ 1 de cashback." }, { Icon: MessageSquareText, title: "Bônus de avaliação", text: "Na primeira avaliação de cada produto elegível, receba 1% extra sobre uma unidade paga, independentemente da nota." }].map(({ Icon, title, text }) => <div className="rounded-2xl border border-line bg-surface-subtle p-5" key={title}><Icon className="h-7 w-7 text-pharma-green" aria-hidden="true" /><h2 className="mt-4 text-base font-black text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{text}</p></div>)}
    </div>
    <section aria-labelledby="loyalty-example-title" className="mt-6 rounded-2xl border border-pharma-green/20 bg-emerald-50 p-5 sm:p-6">
      <h2 className="text-lg font-black text-ink" id="loyalty-example-title">Um exemplo para a próxima compra</h2>
      <p className="mt-3 text-sm leading-6 text-ink">Em um produto de R$ 100 pagos que ofereça 2% em WimiCoins e 1% de cashback, você ganha 200 WimiCoins (R$ 2) mais R$ 1 de cashback: <strong>R$ 3 em desconto para usar depois.</strong></p>
      <p className="mt-2 text-sm leading-6 text-muted">Os ganhos ficam disponíveis após a compra concluída e paga. No próximo checkout, selecione os saldos que deseja usar, até o valor dos produtos, sem incluir o frete. O bônus de avaliação é um benefício separado.</p>
    </section>
    <Link className="mt-6 inline-flex min-h-12 items-center rounded-full bg-pharma-green px-6 text-sm font-bold text-white hover:brightness-95" href="/minha-conta?tab=beneficios">Ver meus benefícios</Link>
    <h2 className="mt-10 text-xl font-black text-ink">Bônus por compartilhar sua experiência</h2>
    <p className="mt-3 text-sm leading-6 text-muted">A avaliação deve ser de uma compra vinculada à sua conta, concluída e paga. Todas as notas recebem o mesmo percentual; o incentivo é identificado na avaliação publicada.</p>
    <Link className="mt-3 inline-flex min-h-11 items-center font-bold text-brand underline" href="/minha-conta/avaliacoes">Avaliar minhas compras</Link>
    <h3 className="mt-6 text-base font-bold text-ink">Regras do bônus de avaliação e uso dos saldos</h3>
    <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-muted">
      <li>Bonus de 1% por cliente e produto, uma unica vez. Exemplo: uma unidade paga de R$ 20 gera R$ 0,20. Comprar varias unidades ou editar a avaliacao nao multiplica o bonus.</li>
      <li>Vale para novas avaliacoes de compras vinculadas a sua conta, concluidas e pagas. Avaliacoes ja existentes nao recebem credito retroativo.</li>
      <li>O calculo considera o preco promocional efetivamente pago, descontado o cashback usado e sem frete. Centavos sao arredondados; bases muito pequenas podem resultar em R$ 0,00.</li>
      <li>Medicamentos com receita e Farmacia Popular nao participam. O bonus de avaliacao e adicional ao cashback de compra dos produtos que oferecem esse beneficio.</li>
      <li>A nota nao altera o bonus. As opinioes com incentivo sao identificadas publicamente. Nao inclua dados pessoais ou de saude no comentario.</li>
      <li>O saldo pode cobrir ate o valor dos produtos do proximo pedido pelo site, sem frete. Nao e saque, transferencia ou dinheiro. O restante segue as formas e condições de pagamento exibidas no checkout.</li>
      <li>Ao enviar o pedido, o desconto fica reservado e sai do saldo disponivel. Cancelamento ou reembolso integral devolve o cashback usado, uma unica vez.</li>
      <li>Cancelamentos e reembolsos estornam os bonus gerados pela compra e pela avaliacao. Se o bonus ja tiver sido usado, o saldo pode ficar negativo e novos creditos compensam a diferenca antes de novo uso.</li>
    </ul>
    <Link className="mt-8 inline-flex min-h-11 items-center font-bold text-brand underline" href="/minha-conta">Consultar meu saldo e extrato</Link>
  </div></section>;
}
