# Cotador, histórico de custo e preparo

O pedido continua disponível a qualquer hora. Para itens de distribuidora com oferta comercial elegível, a modalidade é sob encomenda. Saldo desconhecido, saldo zero observado ou conferência vencida não pausam essa modalidade. Uma falta nova do Cotador entra no histórico sem substituir a última oferta elegível. Produto sem preço válido, com oferta retirada manualmente ou bloqueado pelas regras de receita, teto, fiscal ou logística mantém as restrições existentes. Estoque físico da loja segue a disponibilidade cadastrada.

## Preço de distribuidora

- O custo final confirmado continua na oferta do fornecedor. O custo-base fica vinculado ao EAN e entra no cálculo do preço com o acréscimo configurado. O teto de venda vigente continua obrigatório nos casos aplicáveis.
- A primeira revisão parte do custo usado na venda. Uma redução de R$ 50 para R$ 48 entra no histórico e mantém a base de R$ 50. A faixa de 15% identifica oscilações. Quedas acima da faixa e quedas persistentes também preservam a base. Promoção do fornecedor fica no histórico para eventual decisão comercial manual.
- Aumento comum confirmado pode elevar a base quando altera o custo usado na venda. Aumento de pelo menos 30% junto com R$ 0,50 por unidade, ou de R$ 15 por unidade independentemente do percentual, exige revisão do administrador. De R$ 1 para R$ 3 por unidade exige confirmação.
- Uma reserva de pagamento em andamento adia atualização da oferta. A observação continua disponível para análise e uma nova cotação permite reaplicar a regra após a liberação. Pedidos já feitos conservam os valores contratados.
- Em **Admin → Produtos / Catálogo → Comparar ofertas**, o histórico de cada EAN reúne custo, fornecedor, situação e data de captura. A mediana é a dos menores custos regulares dos dias com cotação nos últimos 30 dias, depois de cinco dias com dados. O histórico pode ser consultado por ADMIN na mesma API privada da comparação.

## Preparo de encomendas

O corte é às **17h, horário de Brasília**, inclusive. Antes desse horário, o pagamento confirmado entra na fila do dia. Às 17h ou depois, entra na próxima janela. O recebimento de fornecedores ocorre de terça a sábado. A previsão de itens da distribuidora combina a próxima data de recebimento com o fechamento às 18h30. A tela de entrega indica a data se o pagamento fosse confirmado naquele momento. O sistema recalcula na primeira confirmação reconhecida e preserva a data nas reentregas do webhook. A previsão de preparo antecede o trânsito da transportadora e pode passar do dia seguinte. O cálculo segue o calendário semanal e ainda não usa calendário de feriados.

## Importação da conferência

Usar a parte original `schemaVersion: 2` do Cotador, em lote de até 50 produtos. `--accounts` identifica as contas de fornecedor aprovadas para o piloto em arquivo privado. As impressões digitais e a identidade de cada item devem coincidir com o relatório e o cadastro. A captura só vale por cinco minutos. Uma oferta prévia do mesmo fornecedor é necessária para preservar o código, a condição comercial, a alocação e o teto de venda conferido. O resumo acumulado do Cotador não substitui a parte original. Validar com amostra pequena e ler as decisões antes de autorizar gravação.

```powershell
node --import tsx scripts/import-cotador-observations.ts --report parte-original.json --accounts contas-aprovadas.json
```

O comando acima é somente leitura. Com `--apply`, grava observações e atualizações elegíveis. Pode-se incluir `--sha256` com o hash obtido na origem para verificar a integridade do arquivo. Erros de sessão, ambiguidade, resposta sem identificação, condição incompatível e falta de evidência para o preço ficam para revisão. Importar conferência é uma operação de catálogo. Compra de fornecedor, pedido de cliente e cobrança seguem seus fluxos existentes.

A publicação requer a migração aditiva `20261126120000_supplier_quote_observations` antes de iniciar a nova imagem. O importador usa o banco interno. O site público e a chamada privada da loja não precisam de sessão nos portais das distribuidoras.
