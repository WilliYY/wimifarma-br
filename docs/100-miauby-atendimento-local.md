# Miauby: atendimento local e consulta de preços

## Revisão do atendimento público — 15/11/2026

Os atalhos da Miauby e do WhatsApp ficam na mesma posição durante a rolagem. A posição é definida pelo tamanho da tela e pela rota. Nas fichas de produto, fica acima do espaço reservado à compra rápida. No celular, o link de WhatsApp fica no painel da Miauby. O botão usa o avatar transparente da mascote em `public/miauby/miauby-avatar-v2.webp`. O balão de boas-vindas continua sujeito à sua própria verificação de sobreposição.

O painel limita a altura à área visível, muda para o lado dos atalhos em telas largas e baixas e usa mais espaço vertical em celulares baixos. O histórico rola dentro do painel. Ao fechar pelo X ou Escape, o foco volta ao atalho. O campo mantém o foco durante o envio e o envio concorrente é bloqueado. Em telas de toque, abrir a conversa foca o painel para evitar abrir o teclado por conta própria.

### Decisões sobre a auditoria

| Critério | Decisão e evidência |
| --- | --- |
| 01–02 — Consulta equivalente | A Miauby remove trechos conversacionais nos limites da pergunta e usa a busca pública para a identidade do produto. As variações de Dove são conferidas com produtos de teste. |
| 03 — Nomes com “Tem” | A fronteira do verbo preserva nomes como Tempra, Temodal e Temozolomida. |
| 04 — EAN | Código puro e código rotulado passam pela validação GTIN. O diálogo orienta quando o código não é válido. |
| 05 — Apresentação | Os testes cobrem dose decimal, unidades, quantidade e tamanho. |
| 06 — Comércio e clínica | Perguntas comerciais claras de higiene, fralda e dispositivo são encaminhadas à busca. Solicitações clínicas continuam com a orientação local. |
| 07 — Urgência e dados privados | Os guardas de emergência e de dados privados têm precedência sobre a busca. As regressões usam dados de teste. |
| 08–09 — Saudações e horário | Saudações compostas e perguntas de horário recebem resposta local. O horário vem do cadastro da farmácia. A equipe confirma domingos, feriados, plantões e abertura naquele instante. |
| 10 — Privacidade | A página de privacidade descreve a conversa na memória da aba e o processamento no servidor local para resposta e consulta de catálogo. |
| 11–13 — Apresentação, cotação e elegibilidade | Os cards continuam consumindo os dados da busca pública, com preço canônico, bloqueio de cotação histórica e regras de compra da loja. Mudanças de apresentação e ações comerciais entram em revisão separada. |
| 14 — Rotas de ação | Os links existentes continuam montados pelo código a partir de rotas conhecidas. Uma lista de novas ações exige revisão própria. |
| 15 — Abertura e boas-vindas | Abrir a conversa e mostrar dicas não consulta o catálogo. Os testes mantêm essa garantia. |
| 16 — Contexto | O recorte de contexto atual e o teste de dose isolada continuam sendo referência. Seleção de produto por ID requer uma mudança explícita de interface. |
| 17–18 — Foco e altura | O teste de interface verifica foco no campo, retorno ao atalho, abertura em tela baixa e controles clicáveis nas larguras testadas. |
| 19–20 — Repetição, timeout e 429 | Uma etapa própria deve tratar recuperação explícita na mesma identidade, respeitar `Retry-After` e validar interrupção e indisponibilidade sem duplicar consultas. |
| 21 — Prévia comercial no WhatsApp | A prévia ainda precisa de um contrato para os campos públicos escolhidos e de um teste do encaminhamento manual. |
| 22 — Sessão e isolamento | A suíte inclui logout, troca de conta, armazenamento indisponível, descarte de respostas tardias e ausência de IA no fluxo público. |
| 23–24 — Alertas administrativos | A seleção de preço e o alerta de cesta mista com antimicrobiano pedem revisão própria da política canônica, com fixtures e transporte simulado. |

Comparação de preço unitário, ajuda na cesta, ações por produto e métricas entram em avaliação separada. Qualquer indicador precisa distinguir intenção de compra, checkout, envio de mensagem e pagamento. Uma eventual medição do chat deve evitar texto bruto ou inferências sobre saúde.

## Balão e proteção da compra — 29/10/2026

O aviso passivo usa cantos arredondados, gradiente claro, identificação da Miauby, emoji decorativo 👋 e botão de fechar com alvo de 44 px. Ao rolar ou interagir fora do widget, ele recolhe e cancela o timer pendente; não agenda dica quando a rota já inicia rolada e não reabre na mesma rota apenas por abrir/fechar o painel. O chat manual e o WhatsApp integrado continuam acessíveis.

Antes de pintar o aviso, a proteção de colisão confere sua região contra preço, controles e barras de compra. Se houver interseção, o aviso é suprimido; redimensionamentos são acompanhados somente enquanto ele existe, com cleanup, sem polling ou leitura de layout por frame de rolagem. Testes sintéticos cobrem também o caso inicial sem scroll, timer atrasado, dispensa por gesto/teclado/fechar, troca de sessão e CTA clicável. Não há nova chamada de IA, uso de tokens, endpoint ou persistência de dados pessoais. Capturas e logs em `outputs/miauby-cards-2026-10-29/`.

Em 29/10/2026, o widget usava um ajuste de posição por colisão durante a rolagem. A revisão de 15/11 adotou a posição fixa dos atalhos descrita acima.

Correção publicada na fonte/OCI `e85676e`. A revisão independente reproduziu o risco inicial e aprovou sua correção. A conferência pública em 320/390/768/1440 px confirmou balão arredondado com emoji e dentro da viewport, sem interseção com compra/preço; ao rolar, o aviso foi removido. Home, catálogo e detalhe conferidos, incluindo quantidade local e alvo de compra acessível, com chamadas de escrita bloqueadas. Isso complementa as fixtures sintéticas; não representa teste de pagamento ou de aparelho físico.

## Contrato aprovado em 23/10/2026

O chat público da Miauby ajuda a encontrar produtos e consultar preços reais sem chamadas a modelos de IA. Saudações, dicas de navegação, entrega, pagamento, Farmácia Popular, saldo e acompanhamento de pedidos usam textos locais. As sugestões administrativas de catálogo com Gemini continuam independentes; suas credenciais não foram removidas nem alteradas.

## Boas-vindas e contexto

- O layout autenticado fornece somente primeiro nome validado, limitado a 24 caracteres, e marcador opaco derivado do identificador da sessão. Não fornece e-mail, telefone, token, pedidos, saldo ou perfil clínico ao widget.
- Ao entrar ou trocar de identidade, o widget é remontado: conversa, texto digitado e pendências são descartados. O transporte é abortado e respostas tardias são ignoradas. O nome só participa da saudação local, não do corpo enviado à API.
- Boas-vindas e dicas de catálogo/produto não fazem requisições à API de chat nem consultam produtos. Marcadores opacos no `sessionStorage` limitam dicas a três por aba e deduplicam boas-vindas por identidade, com armazenamento limitado a oito identidades; nomes e mensagens não são persistidos. Storage indisponível desativa avisos adicionais sem impedir o chat.
- Eventos Auth.js, retorno à aba, foco e restauração da página revalidam a sessão pelo endpoint próprio `/api/auth/session`, sem cache e sem polling contínuo. Durante a verificação, o widget fica oculto/inativo e aborta requisições pendentes, ignorando respostas tardias. Identidade confirmada igual preserva conversa e rascunho; troca, sinal explícito de sessão, expiração ou falha descartam o estado anterior. Sessão indisponível deixa o widget sem identidade autenticada.
- O balão pode ser fechado, desaparece em sete segundos, respeita a visibilidade da aba e não aparece sobre chat aberto ou rotas ocultas. O atalho WhatsApp segue integrado à Miauby no celular.

## Consulta comercial

- Somente uma pergunta enviada explicitamente consulta o catálogo. Botões genéricos pedem o nome antes de buscar. O servidor usa `getSearchCatalog(query, { pageSize: 4, relatedLimit: 0 })`, com os mesmos filtros públicos, regras de apresentação/dose, ofertas atuais, imagens permitidas e correção limitada de digitação.
- A extração conserva números, dose, apresentação, SKU e EAN. Uma continuação como “e o preço?” pode usar somente a última pergunta do usuário; texto do assistente não define um produto. Uma dose isolada não é mesclada com outro medicamento.
- A API retorna apenas campos públicos permitidos. Não retorna ofertas internas, fornecedor, custo, documentos ou dados de clientes. Sem resultado, pede nome/marca/EAN; falha de catálogo retorna erro genérico, sem preço inventado.
- Produtos de distribuidora sem oferta atualmente disponível não retornam uma cotação do preço histórico armazenado. Se todos os resultados estiverem nessa situação, a Miauby informa que não conseguiu confirmar um preço disponível e encaminha para a equipe.
- O preço exibido é o mesmo preço público normal/promocional do item; não calcula Pix. Os 3% aparecem somente ao selecionar Pix no checkout. A consulta não reserva estoque nem cria pedido.

## Segurança e custo

- `/api/miauby` não chama `fetch`, SDK ou provedor de IA, mesmo com `GEMINI_API_KEY` configurada. Portanto, o chat público não consome tokens de inferência. Consultas explícitas ainda usam processamento e banco do servidor.
- Mantidos origem, proteção do middleware, corpo limitado, Zod, até 500 caracteres por pergunta e seis mensagens de histórico. DOM limita conversa a 20 mensagens.
- Limites no processo da aplicação: dez requisições por minuto e cem por hora por IP, 120 por minuto no total e até dois mil visitantes no mapa. `x-real-ip` deve continuar sobrescrito pelo proxy confiável. Reinício ou múltiplas instâncias não preservam/compartilham essas contagens.
- Sintomas, uso, troca de medicamento, gravidez e outros contextos clínicos recebem orientação local para profissional; emergências recebem indicação de urgência/192. Perguntas sobre documentos, senhas e dados de pagamento são encaminhadas aos canais privados. Regras determinísticas não substituem avaliação profissional.
- Não há ferramentas para consultar pedidos privados, movimentar saldo, alterar preço, cobrar ou enviar mensagens. Os alertas comerciais WhatsApp, opt-ins e outbox existentes permanecem independentes.
- Erros registram somente um código fixo de indisponibilidade, sem pergunta, histórico ou diagnóstico do banco.

## Validação

Testes sintéticos cobrem extração de apresentação/EAN, contexto permitido, saudação sem consulta, ausência de chamada de IA com chave configurada, limites por IP/global, origem/corpo, falha de catálogo sem vazamento, preços públicos e filtros de imagens. Regressão de navegador cobre boas-vindas, troca de conta/logout, abort e resposta tardia, armazenamento indisponível, ausência de busca automática e layout em 320, 390, 768 e 1280 px.

Evidências operacionais e resultados da entrega ficam em `outputs/miauby-sem-tokens-2026-10-23/`. Não foram criados pedidos, cobranças, envios de WhatsApp ou consultas a dados reais de clientes para testar o chat.
