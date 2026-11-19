# Gatinho no cabeçalho público

O cabeçalho público recebe o GIF fornecido pelo lojista em uma faixa própria, entre os controles principais e a navegação. O animal percorre a faixa, volta nas extremidades e inverte o sentido ao receber toque, clique, Enter ou Espaço. No desktop, o percurso começa após o painel da marca, acompanhando a região marcada pelo lojista; no celular, aproveita a largura disponível. A faixa reserva seu espaço para não cobrir a busca, a conta, a cesta ou o atalho Painel admin. Não integra o painel administrativo.

O componente `HeaderCatRunner` mantém dez frases curtas. Cada balão acompanha o personagem por três segundos, permanece oculto por cinco segundos e dá lugar à próxima frase. O texto é decorativo, não recebe eventos de ponteiro e não anuncia promoções automaticamente em leitores de tela. Não há controle manual de pausa, conforme pedido do lojista.

O GIF original tem 67.655 bytes, 500 × 500 px e seis quadros. O arquivo é servido localmente, sem dependência nova ou solicitação a terceiros. O branco se integra ao fundo claro da faixa por `mix-blend-mode: multiply`, preservando os quadros originais. O arquivo continua opaco; a integração visual não produz um novo arquivo com canal alfa. A janela do sprite alinha a base do desenho ao chão da faixa.

O deslocamento usa Web Animations e `transform`, sem atualização de estado React a cada quadro, canvas ou processamento contínuo de pixels. Um ResizeObserver recalcula o limite ao mudar a largura. A animação e os temporizadores são descartados ao desmontar. O GIF é removido enquanto a aba está oculta, há diálogo aberto ou o cabeçalho está compacto. A preferência por movimento reduzido oculta a faixa e evita carregar o GIF.

Validação: testes de ida e volta, inversão, ciclo dos balões, limites responsivos, diálogos, redução de movimento e descarte; regressões do cabeçalho, lint, tipos, build e segurança. Os resultados finais de execução e publicação são apresentados na entrega da tarefa.

A auditoria de dependências deve continuar distinguindo alertas de produção e desenvolvimento. Nenhuma regra de frete, preço, catálogo, autenticação ou permissão é alterada por este componente.
