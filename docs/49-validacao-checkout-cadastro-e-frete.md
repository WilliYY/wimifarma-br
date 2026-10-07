# Validação de checkout, cadastro e frete — 07/10/2026

## Correções e preservação

O erro genérico de preço/estoque ao gerar Pix ou cartão foi reproduzido com um pedido sintético de R$7,98. A causa era uma política duplicada que bloqueava qualquer receita, enquanto o checkout já aceita receita comum `ORDINARY` classificada por ADMIN. O pagamento agora reutiliza a política central. Preço, estoque, reserva e confirmação exclusiva pelo gateway permanecem verificados. Se o produto passa a exigir conferência de receita depois de criar o pedido, o pagamento exige refazer o checkout; isso evita perder a conferência farmacêutica registrada no novo pedido.

Identificação, descrição/SEO e logística estão no mesmo formulário, com uma pesquisa central e atalhos. A última orientação do lojista retirou os controles visíveis de exigência/classificação de receita; campos ocultos preservam valores existentes, sem desclassificação automática, mudança de API ou alteração dos padrões de produtos novos. Contrato em [48-cadastro-unificado.md](48-cadastro-unificado.md).

As 128 bolhas, suas trajetórias/tempos, o filtro SVG e o fundo de marca originais do rodapé foram restaurados. `AGENTS.md` registra sua preservação nas próximas entregas. A referência Nissei orienta organização visual, sem transferir RA1000, Ebit, licença sanitária ou outras certificações à Wimifarma. Rodapé mantém marca completa, identificação empresarial, HTTPS informativo, compra, contato e mapa da loja.

## Produtos e cotação real

Consulta produtiva somente de leitura confirmou quatro produtos ativos: Cimegrip, KitKat, Losartana e Dove. Todos têm perfil habilitado e revisado de **estimativa operacional**, com caixa externa C20,8 × L20,8 × A21,6 cm. Pesos: 500 g para os três primeiros e 800 g para Dove, já incluindo a margem operacional de embalagem. Não acrescentar tara novamente nem declarar esses valores como pesagem ou medida exata do fabricante.

Simulação administrativa real no Melhor Envio, em 07/10/2026: origem 87525-000, destino 01001-000, 0,5 kg, dimensões externas acima e mercadoria de R$4,99. Resultado ordenado por preço: **PAC R$21,70 / até 9 dias úteis** e **SEDEX R$24,68 / até 5 dias úteis**, incluindo preparação configurada. Não houve compra de etiqueta, geração de envio, cobrança ou salvamento da configuração. Uma cotação bem-sucedida não comprova cobertura universal, conservação ou aceitação de qualquer mercadoria.

## IA e validação visual

Refinadas estimativas inferiores a 1 cm, reconhecimento de creme dental e separação de fralda adulta/infantil. Referência e estimativa continuam distintas; apresentação, fonte, unidade, público, formato/material e revisão humana continuam obrigatórios. Nenhuma medida foi inferida somente de foto, dose ou ml.

Na prévia sintética isolada, uma pesquisa preencheu descrição e medidas de teste (800 g, 15 × 20 × 30 cm), exibindo fontes e avisos. Trocar a identidade com automação desligada descartou as dimensões copiadas e preservou o peso manual de 950 g. Nenhum produto foi salvo. A geometria do diálogo ficou dentro da tela em 1920 px e 390 px (diálogo de 359 px no celular, página útil de 375 px, sem excesso horizontal). Capturas locais em `outputs/`, fora do Git. Tamanho de navegador restaurado após a inspeção.

## Asaas e limites de homologação

Botão de chave API liberado e tela de criação aberta para o titular, sem saques. Nenhuma nova credencial foi criada pelo agente. Checkout Asaas ainda não está ativo: falta chave segura e homologação própria de sandbox, QR, cartão hospedado, webhook, recusas, expiração e resultado incerto. Pesquisa oficial e plano de integração em [40-asaas-configuracao-e-homologacao.md](40-asaas-configuracao-e-homologacao.md). Não foi contratado gateway adicional ou plano mensal.

## Verificações

- Testes gerais: 203 aprovados; segurança: 98 aprovados; frete: 52 aprovados. Dados sintéticos, sem pagamentos reais.
- Revisão independente encontrou o desvio de reclassificação de receita, corrigido e reproduzido novamente com zero reservas/chamadas ao gateway. Nenhum achado pendente após a correção e a revisão da interface.
- Lint completo, lint final dos arquivos alterados e typecheck final aprovados.
- Auditoria de produção: zero vulnerabilidades. Auditoria completa mantém cinco alertas **high** na cadeia de desenvolvimento (`@next/eslint-plugin-next`, `eslint-config-next`, `fast-glob`, `micromatch`, `braces`); não foram ocultados nem houve alteração de dependências nessa entrega.
- Build local aprovado; publicação registrada abaixo após a conclusão. Testes sintéticos não equivalem a cobrança produtiva Pix/cartão ou homologação Asaas.
