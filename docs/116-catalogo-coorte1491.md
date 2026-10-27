# Coorte de pesquisa 1491 — primeira publicação

Em 27/10/2026 foram incluídos **2 produtos novos**, com **2 fotos reais** e **4 auditorias**, dentro da coorte de pesquisa de 1.491 candidatos. As etapas técnicas continuam limitadas a 50 itens; a coorte não foi apresentada como integralmente publicada.

| EAN | Produto |
| --- | --- |
| 07896004713366 | Acetilcisteína EMS 40 mg/mL, xarope adulto 120 mL |
| 07896112127338 | Cloridrato de ambroxol Teuto 15 mg/5 mL, xarope pediátrico 120 mL |

Ambos foram classificados documentalmente como genéricos isentos de prescrição. A descrição de ambroxol preserva a exigência de prescrição para menores de dois anos. Os cadastros recebem cashback de 1%, preço promocional nulo e WimiCoins desabilitado. Não foi inventado preço anterior para anunciar desconto. As regras existentes de Pix permanecem aplicáveis.

## Verificação e operação

- Pesquisa das quatro fontes documentada; a oferta elegível selecionada veio da ANB. Quantidade exata da distribuidora não foi fabricada. Os cadastros usam disponibilidade de distribuidora com cota interna limitada.
- Identidade, apresentação, bula, teto conservador CMED e fotos foram revisados. A revisão não foi atribuída a um clique humano nem apresentada como consulta transacional individual de registro Anvisa.
- Os 485 testes de segurança e 111 de fornecedores passaram na execução final. As auditorias de produção e completa mantiveram um alerta moderado em `fast-uri`, com zero alto/crítico.
- QA PostgreSQL isolado criou e conferiu os dois produtos, duas fotos e quatro auditorias, incluindo cashback de 1% e `promotionalPrice:null` no modelo real.
- Antes do sucesso, um preflight recusou a versão APP anterior, e uma QA recusou o campo inexistente `Product.originalPrice`. A tentativa foi preservada, com zero dos dois EANs cadastrados nesse banco. O importador foi corrigido e confrontado com os campos reais de Product antes da nova QA.
- OPS imutável `cb2b395` conservou seu mapa de 1.002 arquivos e a fundação histórica, sem renovar datas ou afirmar um novo build completo do APP. A compatibilidade com APP `2bfea326` foi limitada aos 14 arquivos de logística revisados e à imagem observada. A nova coluna logística é nullable; o antigo rowhash do OPS não foi apresentado como cobertura dessa coluna adicional.
- ADMIN ativo, deduplicação incluindo registros inativos/excluídos, predecessores físicos, mutex/CAS, concessão exclusiva, backup, baseline, simulação com duas ações CREATE, aplicação única e conferência pública foram comprovados. Produtos anteriores e as oito tabelas protegidas foram preservados.
- As duas páginas e as duas imagens responderam HTTP 200 com os hashes esperados. A janela `chat5-mip2-stage01-v1-20261027-155048` terminou `completed_released`, sem concessão ativa. Os dois bancos QA próprios foram removidos após conferência de identidade; registros das tentativas e backups foram mantidos.

Esta frente fez inclusão de catálogo e documentação, sem implantar aplicação, executar migração produtiva, comprar de distribuidora ou alterar pedidos, pagamentos e carteiras.

## Continuidade

A coorte mantém seus 1.491 candidatos e os arquivos originais de pesquisa. **2 inclusões foram comprovadas; 1.489 candidatos continuam em conferência**, sem aprovação coletiva de preço, foto, estoque ou classificação. O histórico privado de publicação está em `outputs/catalogo-lotes200-2026-10-26/lotes1000-v1-20261027/publication-ledger-v1.json`.
