# 77 — Ampliação de dermocosméticos e DM Paraná

## Escopo aprovado em 19/10/2026

O titular solicitou mais de 300 produtos, consultas preferenciais na ANB/Profarma e comparação da DM Paraná quando disponível. Confirmou entrega da DM no dia seguinte e autorizou acréscimo de 20% também para outras marcas de dermocosméticos, mantendo Nivea/Dove em 20%. O calendário conservador do checkout continua com recebimento de terça a sábado e corte de 18h30; o relato sobre entrega não substitui confirmação de feriados/cortes da DM.

## Contrato da integração

- Migração aditiva `20261019220000_supplier_dm` acrescenta `DM` ao enum. Simulador, painel e importador reconhecem o fornecedor; os manifestos aceitam até três ofertas distintas por EAN. GAM/SantaCruz continuam apenas referências.
- Uma apresentação por GTIN validado. Custo final unitário com ST, condição da conta, disponibilidade real e data da observação permanecem privados. Sem desconto progressivo não atingido, soma duplicada de ST, estoque inventado ou reserva presumida.
- O menor custo elegível determina o preço com o percentual ADMIN do produto. Sincronizar ofertas não altera esse percentual. Estoque `PHARMACY`, produtos antigos, carteiras, pedidos e respectivas cotações ficam preservados.
- Não foi criado conector API/EDI nem coletor independente na VPS. A rotina Codex existente permanece pausada; ofertas vencem em até 24 horas da consulta real. Não renovar horários sem conferir o portal.

## Preparação do lote e fotos

Lotes privados versionados são gerados a partir de capturas autenticadas da Profarma, complementadas por comparação amostral de EANs na ANB. Os sete primeiros arquivos renderam 301 propostas; uma fonte ISDIN adicional está em revisão. Esses números são propostas, não confirmação de publicação. Comparação limitada não significa pesquisa exaustiva dos três fornecedores. A nova aba da DM exigiu login e a aba anterior perdeu a conexão; nenhuma oferta DM foi inventada.

Marca explícita ou linha confirmada pelo fabricante, unidade, variante e EAN são preservados. Produtos indisponíveis não viram cadastros vendáveis. Propostas de medicamentos permanecem separadas: não entram neste lote por aproximação de nome, classificação incompleta ou extrapolação do teto conservador.

Fotos passam por revisão visual por apresentação. Divergência de gramatura, unidade, cor ou forma bloqueia a associação e fica pendente de nova conferência; não corrigir g para ml por suposição. Origem, hash, observação e autorização acompanham as publicações aprovadas. As cópias públicas usam o publicador auditado, WebP sem ampliar, até 640 px/100 KB. Não afirmar que a arte é a versão mais recente do fabricante sem prova. Itens sem foto aprovada não entram nas vitrines; busca mantém o fallback institucional adequado.

## Frete e validação

Rascunhos logísticos usam apenas as regras existentes, com `measurementBasis:estimated`, `enabled:false` e `transportReviewed:false`. Sem peso/volume confiável, o campo fica pendente. Não converter dosagem, pixels ou ST em peso, nem habilitar transporte a partir da estimativa. Aerossóis e outras cargas restritas não recebem liberação automática.

Antes da publicação: revisão independente, testes de fornecedores e segurança, lint, typecheck, Prisma validate, build, auditoria de produção, QA PostgreSQL isolado com dados sintéticos e backup validado. Importação e fotos exigem ADMIN ativo, dry-run e depois apply do mesmo manifesto, com auditoria. Não são criados pedidos, cobranças, compras no fornecedor, etiquetas ou mensagens.

## Estado de entrega

Código e propostas em validação. Publicação e contagens reais serão registradas após QA, importação e leitura pública; este documento não confirma produtos já adicionados.
