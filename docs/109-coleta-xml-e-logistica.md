# Coleta local de XML para revisão logística

Implementação de 25/10/2026. O lojista autorizou procurar documentos reais em suas contas para preparar o catálogo para envio. Esta entrega acrescenta uma ferramenta offline de extração e cruzamento; não é importação de estoque, preço, custo vigente, nota fiscal contábil ou perfil logístico no banco.

## Uso

`scripts/extract-nfe-logistics.py` usa somente a biblioteca padrão do Python 3. O aplicativo Next.js, suas dependências e o container não passam a depender de Python. Execute no computador de trabalho, com documentos e saída em diretório privado, fora do Git:

```text
python -B scripts/extract-nfe-logistics.py --xml documento.xml --catalog catalogo.json --output privado/fila.json
python -B scripts/extract-nfe-logistics.py --xml-dir privado/xml --catalog privado/catalogo.json --output privado/fila.json
python -B scripts/extract-nfe-logistics.test.py
```

`--xml` pode ser repetido. `--xml-dir` lê apenas arquivos XML diretamente nessa pasta, sem busca recursiva, downloads ou extração de ZIP. O snapshot opcional do catálogo é um array JSON ou `{ "products": [...] }`, com identificadores e EANs textuais. A pasta de saída deve existir. Um arquivo existente só pode ser substituído com `--overwrite`; os XML e o snapshot de entrada não podem ser sobrescritos, inclusive por hardlink.

## Evidência e limites comerciais

- Aceita NFe/nfeProc no namespace oficial, com identificação da nota/emissor, itens e localizadores. Registra arquivo, tamanho e SHA-256. Não extrai dados pessoais do destinatário.
- Preserva cEAN/cEANTrib e unidades/quantidades comerciais e tributárias. Valida tamanho/dígito e normaliza GTIN como texto de 14 dígitos. EAN numérico no catálogo e identidades conflitantes ficam explicitamente pendentes.
- Correspondência comercial, correspondência somente tributária e ambiguidade ficam distintas. Igualdade de GTIN não comprova autenticidade, caixa master, equivalência de unidade nem embalagem de expedição.
- Volumes, peso bruto e peso líquido de `transp/vol` são dados do transporte da nota. Nunca são rateados entre os itens. Não há conversão de ml para g, inferência de dimensões ou uso do peso da nota como peso individual.
- Campos físicos por item permanecem nulos e `shippingReady` é sempre falso. A ferramenta não verifica assinatura digital, status SEFAZ atual ou cancelamentos. Compra antiga não comprova preço/custo/estoque atual.
- O resultado é uma fila revisável de fontes, não habilitação para frete. Referência comercial e pacote protegido da farmácia continuam sujeitos às conferências dos documentos [29](29-cadastro-logistica-ia.md), [89](89-consolidacao-embalagens.md), [99](99-auditoria-frete-checkout-seguranca.md) e [107](107-frete-cep-e-contribuicao.md).

## Segurança e operação

Somente UTF-8/BOM, com rejeição de NUL, DOCTYPE e ENTITY antes do parser. Limites: 5 MiB por XML, 1.000 itens por nota, 100 arquivos por lote, 10.000 referências de candidatos no lote e saída de até 8 MiB. A serialização é limitada antes de abrir o destino; excesso é rejeitado sem truncar correspondências silenciosamente. Falhas retornam JSON em stderr com código seguro, tipo e índice do arquivo, sem conteúdo privado ou caminhos.

Não há acesso a e-mail, rede, banco, credenciais ou APIs neste script. Originais, snapshot e filas contêm dados comerciais privados e devem permanecer fora do versionamento. Salve a proveniência do e-mail separadamente, sem links assinados de download, senhas ou tokens.

Validação: 16 testes sintéticos cobrem namespace, UTF-8/DTD/NUL, limites, GTIN com zeros, separação comercial/tributária, ambiguidade, volumes sem rateio, ausência de dados físicos, idempotência, proteção dos arquivos e diagnósticos sem dados pessoais. Revisão independente é necessária para alterações no parser ou nos limites de segurança.
