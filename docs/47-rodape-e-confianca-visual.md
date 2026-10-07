# 47 - Rodapé e confiança visual

## Decisão — 06/10/2026

O rodapé público reúne informações úteis à compra e à identificação da loja. Direção visual institucional: fundo escuro, assinatura oficial completa, detalhe vermelho, espaçamento consistente e textos legíveis. Mantidos a fonte Barlow e os tokens existentes. Viabilidade visual: impacto 4, adequação 4, implementação 4, desempenho 4, risco de inconsistência 3; DFII 13 (avaliação interna, sem métrica de conversão).

## Comportamento

- Marca oficial, CNPJ e razão social informados pelo lojista e conferidos no fluxo empresarial anterior. Endereço, telefone e mapa reutilizam a configuração pública; não publicar telefone privado do titular.
- Navegação para catálogo, atendimento, conta/pedidos, entrega, cashback e privacidade. Links de contato utilizam WhatsApp, telefone e mapa existentes.
- HTTPS é descrito como criptografia da conexão, sem alegação de certificação, auditoria externa ou invulnerabilidade. Pix/cartão são apresentados com consulta das condições no checkout, sem prometer bandeiras ou parcelas não confirmadas.
- Link “Encontre a Wimifarma no Google” aponta ao mapa da loja já usado no site. Não significa que a solicitação de administração do perfil foi aprovada.
- Reclame AQUI, RA1000 e Ebit/Diamante continuam fora do rodapé até confirmação da página empresarial e concessão/integração dos respectivos selos. Search Console é ferramenta administrativa e não selo para consumidores. Andamento no documento 46.
- A remoção das bolhas nessa entrega foi revertida a pedido do lojista em 07/10/2026: preservar permanentemente as 128 bolhas, os tempos, trajetórias, filtro SVG e fundo de marca originais. A organização e os links úteis abaixo da animação permanecem. Animação original da logo do cabeçalho preservada. Não há novo JavaScript de cliente, biblioteca ou script externo.
- Layout empilha no celular, usa duas colunas no tablet e quatro no desktop. Links com alvo mínimo de 44px, foco de teclado visível e ícones decorativos ocultos da leitura assistiva.

## Arquivos

- `src/components/site/site-footer.tsx`: rodapé, navegação e informações de compra.
- `src/lib/site.ts`: CNPJ e razão social públicos.
- `src/app/globals.css`: estilos originais das bolhas restaurados em 07/10/2026.

## Próximas melhorias que dependem de dados reais

Fotos reais da fachada e da equipe, horários confirmados, política operacional de trocas/devoluções e identificação sanitária vigente fortalecem a confiança. Não inventar horários, responsáveis, licenças, avaliações ou certificações. Avaliações de compras verificadas já têm espaço na página inicial. Selos externos entram após aprovação, por links e integrações oficiais.

## Validação

Lint, typecheck e build locais passaram; 92 testes de segurança passaram. Auditoria de produção sem vulnerabilidades; auditoria completa mantém cinco alertas high nas ferramentas de desenvolvimento. Revisão independente aprovou os três arquivos de implementação, sem defeitos confirmados. A primeira coleta conjunta excedeu o tempo da ferramenta; build repetido com log próprio retornou código zero. Esta mudança não modifica pagamentos, frete, regras de medicamentos, dados de clientes ou permissões.

Publicação: `git pull --ff-only`, `docker compose build app` e `docker compose up -d --no-deps app`, sem migrations ou recriação de dependências. Imagem anterior preservada em `wimifarma-br-footer-rollback:20261006`. Nova imagem `sha256:ae545d577ad56a6cc5f98ebc5a2cf1cb6999fbc8f3b4498d8733b2450ae00ec6`, container saudável. Homepage e `/api/health` retornaram HTTP 200; metatag de verificação Google preservada.

Conferência no Chrome da página pública `/privacidade`: textos, CNPJ, links e marca presentes; logo carregada; 16 links no rodapé. Em viewport efetivo de 1428px, largura útil/rolável de 1406px, sem conteúdo excedendo a tela. A inspeção responsiva permanece limitada: a ferramenta aceitou a largura de 375px, mas a página continuou informando 1428px; não considerar o celular visualmente aprovado. Captura normal e recorte do rodapé falharam por timeout do `Page.captureScreenshot`; nenhum comprovante visual foi fabricado. O tamanho temporário foi restaurado. Breakpoints mobile/tablet/desktop foram revisados no código, mas a renderização em telas menores e a captura devem ser conferidas quando a ferramenta voltar a funcionar.
