# Segurança da Wimifarma BR

## Padrão de entrega

Antes de publicar mudanças, executar `npm run test:security` e `npm audit --omit=dev --audit-level=high`, além de lint, typecheck e validações do projeto. Rodar também a auditoria completa; uma vulnerabilidade de desenvolvimento não deve ser escondida por excluir dependências do relatório.

O workflow `.github/workflows/security.yml` contém essas verificações para pull requests, push em `main`, execução manual e revisão semanal. CI não substitui análise de autorização, regras financeiras, infraestrutura e comportamento real. Execução no serviço GitHub deve ser confirmada por seu histórico de runs.

Mudanças em autenticação/permissões, pagamentos, webhooks, uploads, IA, credenciais ou dados privados exigem revisão independente, regressões de abuso e registro em `docs/07-historico-de-decisoes.md`. Nunca testar cobranças, envios ou exclusões reais para demonstrar proteção.

Dependências de produção com alertas high/critical bloqueiam a entrega até correção ou análise explícita documentada. Alertas conhecidos de desenvolvimento continuam registrados com fonte, alcance e revisão de versão; não usar `npm audit fix --force` para esconder alertas com downgrade incompatível.

## Reportar uma falha

Contate a equipe pelo canal oficial informado em `https://wimifarma.com.br/contato`. Informe caminho afetado, descrição, impacto e passos usando dados fictícios. Combine um canal privado antes de fornecer evidência sensível. Não publique senhas, tokens, dados de clientes, recibos ou exploração ativa em issues públicas.

Não há certificação ou garantia de site invulnerável. A revisão documenta seu escopo e limitações em `docs/42-revisao-de-seguranca.md`.
