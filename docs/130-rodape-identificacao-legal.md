# 130 — Identificação legal da farmácia no rodapé

## Escopo autorizado em 29/10/2026

O titular pediu informações legais no rodapé em texto pequeno, centralizado e organizado, além de pesquisa de exigências adicionais. Confirmou ser o responsável técnico e autorizou localizar os documentos. Não foi autorizada alteração dos documentos sanitários nem criada declaração de regularidade integral da operação.

`FooterLegalInformation` substitui o cartão institucional da Anvisa e a identificação empresarial antes separada. Usa 12 px/20 px para o conteúdo legal, largura máxima controlada, contraste em fundo claro e links com foco/área de toque. O copyright usa 11 px/20 px. Logo, pagamentos, navegação e gerador/filtro/tempos das 128 bolhas permanecem. Não há imagem da Anvisa nem certificação presumida.

## Dados e origem

- Razão social/CNPJ/contato reutilizados de `siteConfig`; CEP já utilizado nos dados estruturados do site, agora disponível também na configuração comum.
- CRT do CRF-PR: responsável técnico Willian Yuji Yoshiura, CRF/PR 35373, certidão com validade indicada até 31/03/2028. Horário normal registrado: segunda a sábado, 08h às 18h30. A linha de plantão é distinta; não foi convertida em promessa de atendimento diário até 20h30. Domingos/plantões orientam consulta à equipe.
- Licença sanitária 029/2026, Vigilância Sanitária de Ivaté/PR, documento com vencimento indicado em 15/10/2027, localizado na resposta da vigilância municipal encaminhada ao titular em outubro de 2026. Não são publicados PDF, assinatura ou códigos de autenticação.
- Documentos apresentam Rua Maringá, 2263 e nome fantasia Irisfarma. O titular confirmou nesta tarefa Avenida Minas Gerais, 2263 como endereço da loja; o contato público foi preservado. A divergência cadastral de endereço/nome fantasia precisa ser conferida na documentação, sem afirmar que ela já foi retificada.
- AFE continua nula na configuração enquanto faltar conferência atual. Há referência oficial histórica a 0.47301.4 (2010/2011) e uma pista de alteração de razão social de 2023 com outro número; nenhuma delas comprova, isoladamente, o cadastro vigente. Não publicar número antigo como autorização atual. AE é condicional e não foi presumida.

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

O build Windows compilou e atingiu o limite de memória do worker de tipos (código 134). Uma repetição com `NODE_OPTIONS=--max-old-space-size=1536` apenas no processo da tarefa concluiu compilação, lint/tipos, 41 páginas e traces com código zero. Não houve configuração permanente nem ocultação de erro. Publicação ainda depende da liberação da janela do catálogo; não confundir prévia/build local com versão publicada. Evidência em `outputs/rodape-legal-2026-10-29/RESULTADO.md`.
