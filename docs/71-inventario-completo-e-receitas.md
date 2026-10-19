# 71 — Inventário completo e receitas de antimicrobianos

## Pedido do titular — 19/10/2026

O titular autorizou separar todos os itens do relatório FAR, ampliar Nivea/Dove e comparar apresentações com ANB e Profarma. Pediu também incluir medicamentos com retenção de receita e conferir a legislação antes de adaptar o checkout. A autorização não converte códigos internos em EAN, não comprova disponibilidade de fornecedor e não dispensa os requisitos de dispensação.

## Inventário e marcas

A extração já reconciliada do PDF foi reorganizada por todos os 6.290 códigos internos, preservando nomes e detalhes originais, inclusive zeros à esquerda. São 83.229 linhas de origem, 111.931 unidades vendidas e 1.472 estornadas, resultando em 110.459 unidades líquidas. O valor histórico de R$ 1.818.816,99 reconcilia com a extração e o total impresso. Venda avulsa fica segregada; estornos sem valor monetário não recebem um valor inventado.

Foram separados 36 códigos Nivea e 29 Dove explicitamente identificados no relatório. As filas completas, prioridades históricas, estornos e planilha de revisão permanecem em `outputs/catalogo-inventario-2026-10-19/`, fora do Git. Nenhum registro recebe classificação clínica, EAN, estoque ou custo atual apenas pelo nome antigo.

A consulta aos índices públicos dos fabricantes encontrou 202 páginas de produto Nivea e 177 Dove, depois de excluir 94 URLs de categorias Nivea. O índice Dove de teste replica o principal e foi deduplicado. Os 379 GTINs extraídos das URLs passaram no dígito verificador, mas continuam candidatos até confrontar a página, a apresentação e o distribuidor. Isso não prova todo o portfólio comercial vigente nem disponibilidade regional. Fontes: [sitemap Nivea](https://www.nivea.com.br/sitemap.xml) e [sitemap de produtos Dove Brasil](https://www.dove.com/br/sitemap.products-product-page-sitemap.xml). Hashes e horários ficam nas evidências privadas locais.

O navegador local foi novamente recusado pelo Work nesta etapa. Sem acesso comercial válido, não foram renovadas datas, criados estoques ou publicados novos EANs a partir dessas filas. A comparação e publicação continuam condicionadas à observação real das ofertas ANB/Profarma; os percentuais já escolhidos pelo titular permanecem preservados.

Metadados públicos: 201 das 202 páginas Nivea responderam, e uma retornou 404; 159 das 177 Dove responderam, e 18 retornaram 500. As falhas foram preservadas como pendentes. Nas 159 páginas Dove, o objeto público `Product` declarou GTIN compatível com o candidato da URL. Na Nivea, não houve esse objeto exato; EANs de botões podem pertencer a recomendações ou a apresentações novas, portanto não foram usados para confirmar a identidade. Títulos, trechos de descrição, URLs de imagens e hashes ficam como referências, sem conferir licença, embalagem ou fotografia por processamento automático. Não há importação comercial a partir desse material.

## Distinção regulatória

- Antimicrobianos: solicitação remota permitida pelo art. 12 da RDC 471/2021, com apresentação, avaliação, retenção e escrituração. A validade ordinária é de dez dias, com exceções próprias para tratamento prolongado. Não calcular validade apenas pela data de upload nem presumir que todo antibiótico tenha a mesma apresentação/regra.
- Controlados: a RDC 812/2023, art. 34-B, §1º, veda compra e venda pela internet. A entrega remota autorizada segue atendimento próprio, com conferência farmacêutica e recolhimento prévio do original físico ou recepção de original eletrônico válido. Upload, novo nome de botão ou aprovação humana não tornam um checkout de controlados automaticamente permitido.
- Receita comum: permanece o fluxo anterior, sem arquivo no checkout e com conferência antes da dispensação. A RDC 44/2009 exige apresentação e avaliação para medicamentos sujeitos à prescrição solicitados remotamente; ausência de upload não dispensa a receita.
- Genérico, similar, referência e segmento ético são eixos independentes da retenção/controle. Não substituir a classe regulatória por uma dedução lexical nem transformar uma ilustração em prova de classificação.

Foto de receita manuscrita é apenas cópia para análise. PDF original eletrônico exige verificação de integridade e assinatura pelo responsável; o sistema não interpreta uma extensão `.pdf` como assinatura válida. O FAQ da RDC 1.000/2025 admite assinatura avançada para antimicrobianos, incluindo gov.br, e exige assinatura qualificada ICP-Brasil para controlados. As regras transitórias do SNCR precisam ser acompanhadas; não se implementou integração com o SNCR.

## Contrato técnico

A classificação explícita `ANTIMICROBIAL` é separada de `ORDINARY` e `CONTROLLED`. O campo de envio só é oferecido no checkout de antimicrobiano classificado; controlados continuam no atendimento assistido, bloqueados pelo servidor. Não classificar automaticamente produtos reais por palavras no relatório.

O envio é privado, vinculado ao cliente autenticado e ao carrinho conferido pelo servidor. O arquivo não entra na biblioteca pública de imagens, galerias, dados estruturados, mensagens, fornecedores, IA ou logs clínicos. Download administrativo exige permissão revalidada. O arquivo é pré-análise e não concede conferência farmacêutica, retenção, aprovação de pagamento ou autorização de transporte.

- `PrescriptionUpload` guarda bytes cifrados AES-256-GCM com chave HKDF de contexto próprio, derivada de `SECRET_VAULT_KEY`; não usa fallback de sessão. Chave ausente deixa o envio indisponível. Identificador aleatório e AAD impedem trocar o conteúdo cifrado entre anexos.
- PNG/JPEG/PDF até 3 MB, com tipo declarado e assinatura de arquivo compatíveis; leitura limitada também por prazo. Imagens são decodificadas com limite de pixels e regravadas sem EXIF/XMP. PDF conserva os bytes para análise humana de original/assinatura; assinatura de formato não atesta a validade clínica ou criptográfica do documento.
- Cota persistida por cliente, serializada no PostgreSQL: até dez tentativas em 24 horas e três anexos ainda não associados. Tentativas inválidas também consomem a cota. Origem, sessão, conta ativa, carrinho e tamanho são validados pelo servidor.
- A associação exige o mesmo cliente, carrinho/produtos/quantidades, envio e prazo, sob locks. Um anexo não serve a outro pedido. A repetição idempotente de pedido criado conserva o vínculo mesmo após o prazo de aceitação de anexos órfãos. Alterações no carrinho invalidam o vínculo anterior.
- Arquivo e identificador do anexo ficam apenas na memória do checkout. O rascunho do formulário deixa de ser persistido quando o carrinho contém antimicrobiano. Download é exclusivo de ADMIN ativo, revalidado no banco, com auditoria sem conteúdo clínico, `private, no-store`, `nosniff`, CSP sandbox e disposição de download.
- Checkout e cobrança revalidam as classes atuais sob locks ordenados. Um pedido antigo de receita comum não pode iniciar cobrança automática depois de o produto virar antimicrobiano sem anexo vinculado ao próprio pedido/cliente. Controlados continuam impedidos; a homologação Asaas não recebe antimicrobianos sem esse fluxo.
- Manifesto v1 aceita `ANTIMICROBIAL` explícito, com receita verdadeira, identidade/classificação documentadas, princípio ativo e teto. Legado continua receita comum; controlados são rejeitados. O importador preserva a classificação existente e recusa mudança ORDINARY/ANTIMICROBIAL implícita. Nenhum produto real recebeu a nova classe nesta entrega.
- Ilustrações leves e transparentes identificam “Antibiótico” ou “Medicamento controlado” pelo tipo explícito, sem alterar classe genérico/similar/ético, preço, estoque ou elegibilidade. Fotos originais são preservadas. A identificação visual não comprova conformidade integral com as regras de publicidade de medicamentos.

Anexos órfãos têm prazo limitado; anexos de pedidos não são apagados automaticamente como se fossem temporários. A guarda legal deve preservar a documentação regulatória e suas evidências. A retenção da cópia no site não substitui os registros obrigatórios do estabelecimento nem o original físico/digital válido. A política pública de privacidade informa finalidade, dados sensíveis, acesso e conservação.

Limpeza: no próximo envio do próprio cliente, órfãos expirados são removidos. Para os demais, `scripts/cleanup-prescription-uploads.ts --actor-id <ADMIN ativo>` é dry-run; `--apply` elimina até cem órfãos expirados, com lock, releitura e auditoria por contagem. Não apaga anexo vinculado, não usa a expiração de aceitação para encurtar guarda legal e não tem agendador novo habilitado. A expiração de 24 horas bloqueia associação; não promete eliminação automática nesse instante. Manter a limpeza operacional e uma política de descarte legal dos vinculados é obrigação pendente da operação.

Esta etapa não comprova licença sanitária, AFE/AE, habilitação de responsável técnico, escrituração SNGPC, assinatura eletrônica, viabilidade de envio ou regularidade integral da publicidade. Esses requisitos devem ser atendidos pela operação farmacêutica antes da dispensação. Nenhuma nova promessa de frete ou fluxo de venda de controlados foi autorizado pelo código.

## Fontes oficiais consultadas em 19/10/2026

- [RDC 471/2021 consolidada — antimicrobianos](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00000471&orgao=RDC/DC/ANVISA/MS&seqAto=000&tipo=RDC&valorAno=2021).
- [RDC 812/2023 — entrega remota e vedação de venda de controlados pela internet](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=detalharAto&numeroAto=00000812&orgao=RDC/DC/ANVISA/MS&seqAto=000&tipo=RDC&valorAno=2023).
- [RDC 44/2009 — solicitação remota e estabelecimento](https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2009/rdc0044_17_08_2009.html).
- [FAQ Anvisa da RDC 1.000/2025 — assinaturas, questões 36–40](https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/medicamentos/controlados/perguntas-e-respostas-rdc-1000-2025-1-ed.pdf/@@download/file).
- [Nova etapa SNCR a partir de 30/09/2026](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/inicio-de-nova-etapa-do-sncr-o-que-muda-a-partir-de-30-de-setembro).
- [LGPD — arts. 5º, 6º, 11, 16 e 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).

## Verificação

Inventário CSV/JSON reconciliado por código e globalmente; planilha com onze abas reaberta para conferir tipos, zeros, textos e totais, com prévias renderizadas. A renderização de prévia de planilha pode apresentar identificadores como números; o arquivo original foi conferido com códigos e GTINs como texto, inclusive zeros à esquerda. Publicação comercial depende da próxima conferência autenticada.

Validação local: 763/763 testes gerais e 341/341 de segurança; lint sem erros, com um aviso antigo em auxiliar privado de outra tarefa, TypeScript, Prisma validate e build aprovados. Auditoria de produção sem vulnerabilidades; auditoria completa mantém cinco high conhecidos na cadeia de desenvolvimento ESLint (`braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next`), sem atualização forçada fora do escopo. Revisão independente aprovou após corrigir a reclassificação de pedidos antes da cobrança, os locks/releituras e o diagnóstico da limpeza. Os testes focados independentes foram de lógica/rotas isoladas; não são prova de concorrência real PostgreSQL ou de layout interativo.

Backup produtivo privado validado, sem exportar dados para o Git. A migração, integração PostgreSQL isolada e conferência da aplicação publicada ainda precisam ser registradas ao concluir a implantação desta entrega. Nenhum novo EAN comercial ou receita real foi publicado/enviado nesta etapa de validação.
