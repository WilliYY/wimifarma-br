# 130 — Identificação legal da farmácia no rodapé

## Escopo autorizado em 29/10/2026

O titular pediu informações legais no rodapé em texto pequeno, centralizado e organizado, além de pesquisa de exigências adicionais. Confirmou ser o responsável técnico e autorizou localizar os documentos. Não foi autorizada alteração dos documentos sanitários nem criada declaração de regularidade integral da operação.

`FooterLegalInformation` substitui o cartão institucional da Anvisa e a identificação empresarial antes separada. Usa 12 px/20 px para o conteúdo legal, largura máxima controlada, contraste em fundo claro e links com foco/área de toque. O copyright usa 11 px/20 px. Logo, pagamentos, navegação e gerador/filtro/tempos das 128 bolhas permanecem. Não há imagem da Anvisa nem certificação presumida.

## Dados e origem

- Razão social/CNPJ/contato reutilizados de `siteConfig`; CEP já utilizado nos dados estruturados do site, agora disponível também na configuração comum.
- CRT do CRF-PR: responsável técnico Willian Yuji Yoshiura, CRF/PR 35373, certidão com validade indicada até 31/03/2028. Horário normal registrado: segunda a sábado, 08h às 18h30. A linha de plantão é distinta; não foi convertida em promessa de atendimento diário até 20h30. Domingos/plantões orientam consulta à equipe.
- Licença sanitária 029/2026, Vigilância Sanitária de Ivaté/PR, documento com vencimento indicado em 15/10/2027, localizado na resposta da vigilância municipal encaminhada ao titular em outubro de 2026. Não são publicados PDF, assinatura ou códigos de autenticação.
- Documentos apresentam Rua Maringá, 2263 e nome fantasia Irisfarma. O titular confirmou nesta tarefa Avenida Minas Gerais, 2263 como endereço da loja; o contato público foi preservado. A divergência cadastral de endereço/nome fantasia precisa ser conferida na documentação, sem afirmar que ela já foi retificada.
- A pré-visualização fornecida pelo titular identifica AFE `0998041`, CNPJ correspondente, DOU nº 199 de 14/10/2013 e RE nº 3.775 de 10/10/2013. A prévia contém a marca “SEM VALIDADE”; não foi tratada como certidão final nem como prova de cancelamento. O índice de cópia do DOU hospedada pelo MPF também referencia `0.99804.1` e o mesmo CNPJ sob razão social histórica. A abertura integral dessa cópia retornou 403. Não reutilizar `0473014`, de referências anteriores, como autorização atual.
- A [Anvisa esclarece que a publicação no DOU comprova a concessão](https://www.gov.br/anvisa/pt-br/setorregulado/regularizacao/farmacias-e-drogarias/autorizacao-de-funcionamento-afe-ou-autorizacao-especial-ae/solicitacao-de-afe-ou-ae/solicitacao-de-afe-farmacias-e-drogarias). Não exigir nova certidão como única prova nem presumir vencimento pela data histórica da concessão. A situação atual, endereço e site da AFE permanecem por conferir: a consulta automatizada foi bloqueada com 403, antes de apresentar resultados da empresa, e o conector não conseguiu ler a aba aberta pelo titular. AFE continua nula na configuração até essa conferência. AE é condicional e não foi presumida.

Essa é uma conferência documental dos campos apresentados, não validação online de autenticidade de todas as certidões nem garantia de ausência de suspensão/cancelamento posterior. Fontes privadas e evidências operacionais ficam em `outputs/rodape-legal-2026-10-29/`, fora do Git; nenhum dado de cliente foi usado.

## Página e links

`/informacoes-legais` contém âncoras para atendimento farmacêutico, apresentação de receitas, trocas/cancelamentos e privacidade. Reutiliza WhatsApp, privacidade e canais existentes. O resumo do arrependimento não impõe exclusão genérica para medicamentos, embalagem lacrada como condição absoluta ou novo prazo comercial. Custos, entrega e pagamento continuam definidos antes da finalização pelos fluxos próprios.

Configuração documental é estática em `src/lib/site.ts`, sem banco, formulário administrativo ou nova consulta por visita. Campos não conferidos são omitidos, sem rótulos de “em atualização” para o cliente. Isso impede inventar dados, mas não torna dispensável completar a AFE exigida. A página foi incluída no sitemap.

## Exigências federais pesquisadas

| Base | Exigência/aplicação | Situação e limite |
| --- | --- | --- |
| [RDC 44/2009, art. 53](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=8542&cod_modulo=310&link=S&numeroAto=00000044&orgao=RDC%2FDC%2FANVISA%2FMS&seqAto=000&tipo=RDC&valorAno=2009) | Identificação empresarial, contato/horário, RT/CRF, licença, AFE e AE quando aplicável na página principal; links de atendimento, alertas e receita | Campos conferidos no rodapé e links acrescentados; AFE atual permanece pendente |
| RDC 44, arts. 55 e 58 §1º | Endereço eletrônico informado na AFE e comunicação direta/imediata com farmacêutico presente | Conferir cadastro da AFE e a operação humana do canal; criar link não prova atendimento imediato |
| RDC 44, art. 54 | Limites de publicidade/imagens de medicamentos sob prescrição | Revisão do catálogo e campanhas pelo responsável técnico continua separada; o rodapé não corrige eventual conflito |
| RDC 44, art. 59 | Sigilo/privacidade e restrição ao uso de dados para promoção ou indução ao consumo de medicamentos | Política existente foi vinculada; campanhas/assistente precisam de revisão específica, não auditadas integralmente nesta tarefa |
| [Decreto 7.962/2013, arts. 2º, 4º e 5º](https://www2.camara.leg.br/legin/fed/decret/2013/decreto-7962-15-marco-2013-775557-publicacaooriginal-139266-pe.html) e [CDC, art. 49](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | Identificação e oferta claras, atendimento eficaz, confirmação/contrato e exercício de arrependimento | Link de solicitação e resumo acrescentados; não afirmar auditoria completa do checkout/SAC ou cumprimento de todos os prazos |
| [LGPD, arts. 9º, 18 e 41](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html) | Transparência, direitos e contato de privacidade; encarregado salvo dispensa aplicável | Link permanente preservado. Enquadramento da empresa/dispensa e adequação operacional não foram comprovados |
| [Lei 13.146/2015, art. 63](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm) | Acessibilidade de sites empresariais | Centralização/tamanho são escolhas visuais; fonte pequena não dispensa contraste, zoom, foco e leitura |
| [Política de Comunicação Anvisa, arts. 13–16](https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/gestao/comunicacao/politica-de-comunicacao-da-anvisa.pdf/@@download/file) | Manual e autorização formal da comunicação; restrição de uso comercial da marca | Logo não utilizada; AFE/licença não conferem esse direito |

Normas estaduais/municipais e regularidade operacional completa não foram auditadas. Documentação institucional não substitui dispensação, retenção/escrituração de receitas, transporte adequado ou comprovação dos cadastros. Não houve petição à Anvisa, alteração cadastral ou envio de mensagens aos órgãos/fornecedores.

## Verificação e publicação

Sete regressões dirigidas de rodapé/navegação aprovadas: dados completos/ausentes, centralização/legibilidade e links em 320/390/768/1440 px, preservação das bandeiras e da animação original. Regressão de metadata, 491 testes de segurança, ESLint e TypeScript aprovados. Revisão independente sem achados. Auditorias completa e de produção mantêm 3 low/1 moderate, zero high/critical; nenhuma dependência foi alterada.

O build Windows compilou e atingiu o limite de memória do worker de tipos (código 134). Uma repetição com `NODE_OPTIONS=--max-old-space-size=1536` apenas no processo da tarefa concluiu compilação, lint/tipos, 41 páginas e traces com código zero. Não houve configuração permanente nem ocultação de erro.

Publicado em 29/10/2026, após liberação expressa da janela do catálogo. Fonte imutável `0f003bb8f788c1db66f4ed1db0528a25b27e170d`, build Linux Docker, imagem `wimifarma-br:legal-ready-0f003bb` (`sha256:fc22f64f6e3ef1ec3d88cb7b413c1e4730c5795f913f7ea9d50c3829f9668282`). Checkout VPS `ba84eb6` no momento da ativação; descendentes da fonte alteravam somente documentação. Backup validado e imagem anterior preservados; troca exclusiva do app, sem migration ou reinício do PostgreSQL. Identidade/StartedAt do banco e comparação integral de Product, SupplierCatalogOffer, Offer e Order permaneceram iguais. Canonical preservado em `bf6d8aa7c985a7fe55cc76149979b35e0748287125b0a0b0d4bb4f983715438a`.

QA pública aprovada em 390/1440 px: identificação documental correta, fonte 12 px/entrelinha 20 px, texto centralizado, sem overflow ou erros de página; três links internos com âncoras e página contendo um único landmark principal. As 128 bolhas e o filtro original permaneceram. Visitas, analytics e escritas foram bloqueados durante a QA; não houve compra, mensagem ou logout de conta real. Saúde pública 200. Evidências e capturas em `outputs/rodape-legal-2026-10-29/RESULTADO.md`. Esta validação não comprova regularidade integral do catálogo, cadastro da AFE ou operação de atendimento.
