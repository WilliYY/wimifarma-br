# 62 — Presença no Google e identidade da Wimifarma

## Diagnóstico em 11/10/2026

O lojista mostrou uma busca por `wimifarma` corrigida pelo Google para `imifarma`, com resultados de outra empresa. Isso é uma decisão da busca, não um redirecionamento do site.

O Search Console da propriedade HTTPS confirmou que a homepage está indexada, com último rastreamento em 06/10/2026 às 19:56, por Googlebot Smartphone. Rastreamento e indexação são permitidos; busca da página teve êxito e a canônica escolhida corresponde à inspecionada. O relatório geral ainda processa dados e mostra zero cliques. Em inspeção HTTP atual, home, robots e sitemap respondem 200; sitemap contém 15 URLs.

Na busca normal da conta consultada, o Google reproduziu a correção para `imifarma`. Ao selecionar “Em vez disso, pesquisar por wimifarma”, mostrou o domínio oficial `wimifarma.com.br`, sua página Farmácia Popular e a ficha local. O site antigo `wimifarma.com` também apareceu nessa busca; pertence a outro projeto e não foi alterado. Resultados personalizados de uma sessão não comprovam posição universal.

A conta pessoal inicialmente aberta mostra uma ficha `Wimifarma rua maringa` como **Cópia**, não verificada. O lojista esclareceu que a empresa correta está em outro perfil Google e se dispôs a abri-lo. Essa ficha duplicada não foi alterada, excluída nem usada para concluir a situação do perfil correto.

## Ajustes do site

- Título e descrição institucionais consistentes, com marca, município e endereço reais, reutilizados nos metadados e compartilhamento.
- Um H1 estável e visível na home identifica `Farmácia Wimifarma em Ivaté-PR`; campanhas passam a H2, preservando estilos e interação.
- Nó `Pharmacy` preservado, enriquecido com razão social, CNPJ, descrição e CEP conhecidos. Logo oficial completa em WebP; telefone e localização preservados.
- Um único nó `WebSite`, vinculado à farmácia, com nome `Wimifarma` e alternativas `Wimifarma Ivaté` e `wimifarma.com.br`.
- Sem notas agregadas dos depoimentos editoriais, horários inventados, palavras-chave repetidas, novas dependências ou mudanças comerciais.

## Operação e limites

Após publicar, conferir HTML público, canonical, JSON-LD, logo e layout em desktop/celular. Testar a URL publicada no Search Console e solicitar novo rastreamento da home. Não repetir solicitações para tentar acelerar a fila.

No Perfil da Empresa correto, conferir nome real, site `https://wimifarma.com.br/`, endereço, telefone e situação de verificação. Não criar outra ficha nem substituir dados de um perfil sem confirmar sua identidade. Aprovação, verificação e concessão de acesso continuam sendo estados externos.

A indexação já existente não garante destaque por marca. Nenhum ajuste do site controla a autocorreção, o painel de conhecimento ou a posição dos resultados. O Google pode levar dias ou semanas para rastrear mudanças e decide sua apresentação.

## Fontes oficiais

- [Nomes de sites](https://developers.google.com/search/docs/appearance/site-names?hl=pt-br).
- [Empresa local](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=pt-br).
- [Inspeção de URL](https://support.google.com/webmasters/answer/9012289?hl=pt-BR).
- [Solicitar novo rastreamento](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=pt-br).
- [Ortografia na Pesquisa](https://support.google.com/websearch/answer/134479?hl=pt-BR).

## Validação

- `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run build`: passaram.
- `npm.cmd run test:security`: 267 testes passaram. Teste existente de metadados: 1 passou.
- `npm.cmd audit --omit=dev --audit-level=high`: zero vulnerabilidades. Auditoria completa: 5 alertas high na cadeia de desenvolvimento permanecem; sem alteração de dependências nesta tarefa.
- Revisão independente aprovada, sem achados no escopo. Sem API, autenticação, banco, pagamento ou dados privados alterados.
- Publicação e conferência pública ainda pendentes durante a implementação. Registrar os resultados comprovados ao concluir.
