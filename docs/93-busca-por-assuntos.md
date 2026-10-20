# Busca por assuntos — 20/10/2026

## Comportamento

Autocomplete e `/busca?q=...` compartilham consulta parametrizada e paginada no PostgreSQL. Além de nome, marca, EAN, SKU, composição e dose, reconhecem `grip`/`gripe`/`influenza`, dor, febre, cabeça/cefaleia, pressão/hipertensão, diabete/diabetes, colesterol e azia/refluxo. Sem IA externa, envio de buscas a terceiros, novos cadastros ou alteração de estoque/preços.

O mapa revisado fica em `src/features/products/search-topics.ts`. As relações usam identidades completas dos princípios ativos cadastrados em medicamentos. Classificação explícita prevalece sobre categoria; Medicamento/Medicamentos é fallback quando não há classificação. Também encontra assuntos escritos no nome e termos de busca explícitos, com correspondência integral do termo cadastrado. Descrição, advertência ou contraindicação não produzem indicação por assunto. `grip` é um fragmento controlado de nome de medicamento para recuperar o Cimegrip existente; não pressupõe sua composição.

Novos produtos entram automaticamente se tiverem princípio ativo revisado, nome explícito do assunto ou termo de busca correspondente. Ativos/assuntos novos precisam de revisão. Não há correção ortográfica arbitrária ou inferência clínica por semelhança de letras. Na leitura inicial havia 594 ativos e apenas dois com termos de busca preenchidos; apenas acrescentar sinônimos às palavras-chave não resolveria o catálogo.

## Precisão e limites

- Frase específica prevalece: pressão baixa não recebe o grupo de hipertensão; tipo 1, gestacional, pré-diabetes e hipoglicemia não recebem o grupo genérico de diabetes/tipo 2; colesterol baixo e resfriado permanecem distintos de colesterol alto e gripe.
- `Pressão` e `diabetes` genéricos recuperam respectivamente o grupo revisado de hipertensão e diabetes tipo 2. Convenção de navegação, sem classificar a saúde de quem pesquisa.
- Outros termos continuam obrigatórios, incluindo fabricante, apresentação e dose. O número de `tipo 2` não vira dose. Comparação com o nome original preserva `5mg` versus `2,5mg`/`12,5mg` e ponto/vírgula decimal.
- SKU completo tem correspondência exata por campo, inclusive quando contém palavra de assunto, sem depender de formato de código.
- Contextos de negação, alergia, gravidez e crianças não recebem expansão clínica. A busca não é orientação de saúde; ausência de resultado não significa ausência de tratamento.
- Assuntos escritos juntos são requisitos cumulativos. Não acrescenta sugestões por ingrediente fora desses filtros; a busca literal conserva outras marcas/apresentações.
- Rx encontrados por assunto aparecem como relação neutra de nome/apresentação, composição cadastrada, marca e preço vigente. Sem imagem, preço riscado, Pix, cashback, frete, botão de compra ou destaque de mais vendidos nessa relação. A busca literal conserva a apresentação anteriormente autorizada. Exigências de receita, conferência farmacêutica e compra permanecem.

## Fontes do mapa

Verificação em 20/10/2026, apenas para relação de busca, sem importar escolha individual ou posologia:

- Dor/febre: dipirona monoidratada, [bula EMS](https://www.ems.com.br/arquivos/produtos/bulas/bula_dipirona_sodica_10012_1410.pdf). Cefaleia: apoio do [MS, CAB 28 v. II, 2013, p. 36](https://bvsms.saude.gov.br/bvs/publicacoes/acolhimento_demanda_espontanea_queixas_comuns_cab28v2.pdf); fonte antiga, usada apenas no vínculo nominal.
- Hipertensão: losartana potássica, maleato de enalapril, atenolol, besilato de anlodipino, carvedilol, hidroclorotiazida, espironolactona e furosemida no [PCDT/MS de 23/07/2025, pp. 72–74](https://www.gov.br/saude/pt-br/assuntos/pcdt/h/hipertensao-arterial-sistemica.pdf/@@download/file). Valsartana na [bula Diovan/Novartis](https://portal.novartis.com.br/medicamentos/wp-content/uploads/2021/10/Bula-DIOVAN-Comprimido-Revestido-Medico.pdf); clortalidona no [fabricante EMS](https://www.ems.com.br/medicamentos/clortalidona/).
- Diabetes tipo 2: [metformina/cloridrato — EMS](https://www.ems.com.br/arquivos/produtos/bulas/bula_cloridrato_de_metformina_10376_1278.pdf), [glibenclamida — Geolab](https://www.geolab.com.br/produtos/glibenclamida/), [glimepirida — Eurofarma](https://eurofarma.com.br/productos/prospecto/healthcare/es/bula-glimepirida.pdf), [fosfato de sitagliptina, inclusive monoidratado — MSD](https://www.msd.com.br/wp-content/uploads/sites/86/2025/10/nimegon_pac.pdf) e [vildagliptina — Novartis](https://portal.novartis.com.br/medicamentos/wp-content/uploads/2021/10/Bula-GALVUS-Comprimido-Medico.pdf). Limitar expansão a tipo 2 não significa que um ativo nunca possa ter outra indicação específica.
- Colesterol alto: [atorvastatina — EMS](https://www.ems.com.br/medicamentos/atorvastatina-calcica/), [rosuvastatina — EMS](https://www.ems.com.br/medicamentos/rosuvastatina-calcica-2/), [sinvastatina — EMS](https://www.ems.com.br/arquivos/produtos/bulas/bula_sinvastatina_10117_1007.pdf) e [ezetimiba — EMS](https://www.ems.com.br/medicamentos/ezetimiba-2/). Dislipidemia é mais ampla e não foi tratada como sinônimo exato.
- Azia/refluxo: [omeprazol — EMS](https://www.ems.com.br/arquivos/produtos/bulas/bula_omeprazol_10118_1139.pdf). Pantoprazol não incluído: indicação conferida depende de apresentação/sal específicos.
- Gripe/influenza e distinção de resfriado: [Ministério da Saúde](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/g/gripe-influenza). Expansão por nome não confirma eficácia contra influenza.

O [art. 54 da RDC 44/2009, §§ 1º–2º](https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2009/rdc0044_17_08_2009.html) restringe publicidade/imagens de Rx e delimita os campos da relação de preços. Apresentação neutra reduz elementos promocionais; não foi localizada autorização explícita para agrupamento público por doença/sintoma. Revisão do responsável técnico permanece necessária; esta entrega não certifica conformidade sanitária integral. Não inventar registro Anvisa/detentor ausentes no cadastro. Fonte é reprodução oficial, sem auditoria de consolidação completa de alterações posteriores.

## Verificação

Regressões cobrem assuntos, contexto, nomes, identificadores, doses, SQL parametrizado, paginação e relação neutra de Rx. Conferência adicional executou o SQL gerado em PostgreSQL real com 31 cenários sintéticos via `jsonb_to_recordset` e 13 consultas do catálogo, em transação `READ ONLY`, sem criar tabelas/produtos. Exemplos iniciais: gripe 1, dor/febre/cabeça 3, pressão 114, diabete/tipo 2 27, colesterol 63; pressão baixa e tipo 1 retornaram zero. Números refletem o catálogo conferido, não disponibilidade garantida.

Evidências locais: `outputs/search-intelligence-2026-10-20/`. Sem migração, importação, reindexação ou alteração de dados comerciais.

Validação antes da publicação: 24 testes de busca/SQL passaram; sete regressões de UI passaram, incluindo apresentação neutra e teclado do autocomplete. Os 442 testes de segurança, lint, typecheck e Prisma passaram. Revisão independente aprovou após corrigir a preservação de SKU por campo. Auditoria de produção sem vulnerabilidades; auditoria completa mantém cinco alertas high preexistentes de desenvolvimento, zero critical, sem alteração de dependências. Build e conferência publicada são registrados após a ativação.
