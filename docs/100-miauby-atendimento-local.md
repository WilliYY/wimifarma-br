# Miauby: atendimento local e consulta de preços

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
