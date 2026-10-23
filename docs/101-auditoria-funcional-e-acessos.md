# Auditoria funcional e de acessos — 23/10/2026

Auditoria da base `e55d3cc`, com revisão independente de acessos e comércio, consultas públicas seguras e navegação em três larguras. As conclusões abaixo distinguem bugs confirmados, controles testados e pendências operacionais.

## Bugs reproduzidos e corrigidos

1. **Alta — senha local vinculada ao Club.** Um User local podia receber um Customer sem senha ao aderir ao Club. A alteração de senha da conta conferia somente o hash do Customer e sincronizava a senha do User, permitindo omitir a senha atual. Corrigir a autoridade da credencial local explicitamente vinculada, preservar Google-only, revalidar vínculo/estado e hashes na transação, manter o painel coerente e cobrir concorrência. Nenhum acesso anônimo ou troca de senha real foi usado para reproduzir.
2. **Média — aviso de cancelamento online.** Cancelamentos conciliados por Mercado Pago/Asaas e cancelamento antes da submissão alteravam o pedido sem registrar o aviso de etapa. Usar a outbox transacional existente somente para transição real, preservando consentimento, ambiente, deduplicação e validação do destinatário. Não criar mensagens retroativas nem disparar avisos reais para QA.
3. **Média — avaliação de compra recebida.** A compra recente com o item integralmente faltante podia ser escolhida antes de uma compra anterior válida, bloqueando a avaliação. Selecionar pedido concluído/pago com unidade efetivamente recebida, revalidando após bloqueio e preservando cálculo, crédito único e estorno do bônus.
4. **Baixa — saída do checkout vazio.** O link “Encontrar produtos” apontava para `/produtos`, rota inexistente. Corrigido para `/catalogo`, sem mudar preços, carrinho ou pagamento.

Reproduções sintéticas, resultados e revisões independentes aprovadas ficam em `outputs/auditoria-funcional-2026-10-23/`. Validação local: 484 testes de segurança; 32 focais de senha/Club e 52 comerciais; lint, tipos e Prisma aprovados; auditorias de produção e completa com zero vulnerabilidades. Os conjuntos de testes se sobrepõem e não devem ser somados. A publicação e a CI final serão registradas no relatório de entrega.

## Controles e funcionamento verificados

- Inventário de 75 arquivos API: 60 privados, 12 públicos e três webhooks com autenticação própria. A revisão traçou helpers de autorização e posse dos dados; a contagem não equivale a prova de todas as combinações possíveis.
- Oito GETs privados anônimos representativos retornaram 401 e `private, no-store`: cofre, revelação, pessoas, receita, pedidos próprios, cashback, créditos e resumo administrativo.
- `.env` e `.git/config` retornaram 404; Miauby recusou origem estrangeira com 403. Cabeçalhos CSP, HSTS, nosniff, anti-frame, referrer e permissions presentes.
- Navegação anônima: 34 verificações em 390, 768 e 1440 px, com HTTP 200, sem exceção JavaScript, imagem quebrada detectada ou vazamento horizontal. O login foi o destino esperado da conta privada. Um 404 de prefetch revelou o link incorreto do checkout; o 401 de Club sem sessão era um bloqueio esperado.
- Métodos de escrita foram interceptados no navegador: 68 chamadas de analytics/carrinho foram suprimidas, evitando dados de teste e avisos na operação real. Isso limita a prova à apresentação/leitura desses fluxos; mutações são cobertas por testes isolados.
- Regras de pagamento, confirmação canônica do gateway, proteção contra repetições, limites de saldo, Pix após seleção, reservas e barreiras de receita foram revisadas com testes sintéticos existentes e reproduções dirigidas. Nenhuma cobrança, pedido, estorno financeiro ou mensagem real foi criado.
- Servidor no mesmo commit, aplicativo e PostgreSQL saudáveis e zero reinícios. Leitura instantânea: cerca de 125 GB livres; app 225 MiB/1,5 GiB, banco 161 MiB/768 MiB. Janela de 30 minutos do contêiner atual não apresentou os marcadores de erro verificados. Não foi feito teste de carga ou garantia de disponibilidade futura.

## Pendência operacional confirmada: frete nacional

Consulta agregada somente leitura encontrou 1.017 produtos ativos: 1.015 de distribuidora e dois físicos. Dois físicos tinham perfil habilitado/revisado; nenhum ativo de distribuidora tinha ambas as flags. Dentre as distribuidoras, 273 tinham objeto de perfil cadastrado. Flags não substituem validação completa de medidas, peso, conservação, carga e serviço.

O conector Melhor Envio já foi validado com 31 CEPs em 27 UFs no mesmo dia, conforme [99](99-auditoria-frete-checkout-seguranca.md). Essa amostra não libera automaticamente todo o catálogo. A expansão depende de dados físicos confiáveis e revisão logística; não foram inventadas medidas ou ativados perfis em massa. A caixa 24 × 15 × 10 cm continua sujeita à tara, dimensões externas e cabimento.

## Limites de conclusão

Testes aprovados e revisão reduzem a chance de regressões nos caminhos verificados, sem provar ausência absoluta de bugs. Pagamento efetivo, entrega de WhatsApp no aparelho, comportamento real de transportadoras para cada carrinho e contas privadas não foram exercitados em produção. Mudanças comerciais ou dados logísticos pendentes continuam exigindo evidência própria.
