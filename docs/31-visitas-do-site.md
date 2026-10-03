# 31 - Visitantes do site

## Contagem

O dashboard apresenta `Visitantes únicos do site`: total de registros `SiteVisit`, um por identidade persistente de navegador. A descricao mostra quantos desses navegadores estiveram ativos nas ultimas 24 horas, usando `lastSeenAt`. F5, abrir novamente o site, navegar entre paginas e repetir visitas nao criam outro registro enquanto a identidade puder ser recuperada.

Essa medida nao identifica pessoas fisicas. Outro navegador, perfil, dispositivo ou dados do site totalmente limpos podem representar um novo visitante. Abas anonimas compartilham identidade apenas enquanto o navegador mantiver seus dados. Nao ha fingerprinting, vinculo com conta, deduplicacao por IP ou sessao de acesso com prazo de inatividade. `views` representa requisicoes de visualizacao; recargas e chamadas repetidas podem aumenta-lo sem aumentar visitantes.

## Identidade e persistencia

- O identificador local `wimifarma_visit_session_id` permanece no localStorage ate remocao dos dados do site. IDs existentes, inclusive o formato legado `visit-...`, sao preservados.
- O cookie `wimi-visitor` e HttpOnly, SameSite=Lax, caminho `/`, Secure em HTTPS, assinado com `AUTH_SECRET`. Sua duracao de 365 dias e renovada em cada registro. A assinatura rejeita adulteracoes, tokens futuros e expirados.
- Um cookie valido prevalece sobre o corpo da requisicao. A resposta restaura o identificador correto no armazenamento local quando possivel. Limpar apenas localStorage, com cookie ainda valido, nao cria visitante novo.
- Na primeira visita, sem cookie, o servidor aproveita o identificador aleatorio local valido para preservar o historico. Se localStorage estiver bloqueado, gera uma identidade e envia o cookie; retornos seguintes usam esse cookie.
- Web Locks coordena a criacao local entre abas simultaneas nos navegadores que disponibilizam essa API. O identificador unico e o upsert nativo de `SiteVisit.sessionId` deduplicam chamadas concorrentes da mesma identidade no PostgreSQL.

Sem armazenamento local nem cookies nao e possivel reconhecer retornos. Primeiras chamadas simultaneas antes do cookie, com localStorage bloqueado ou sem suporte a Web Locks, podem produzir identidades diferentes. O sistema nao recorre a dados pessoais para eliminar essa limitacao.

## API e dados

`POST /api/visitas` exige origem igual a `AUTH_URL` (ou origem da requisicao se nao configurada) e `AUTH_SECRET`. Recebe caminho, referencia e identificador local opcional. Retorna `ok` e `visitorId`, sem cache, e o cookie assinado. Sem segredo configurado, retorna 503 e nao grava visitas. Falhas de rede ou armazenamento nao interrompem a navegacao.

O servidor salva caminho sem query string ou fragmento e somente a origem da referencia. Nao grava novos IPs, hashes de IP nem user-agents. Colunas e dados historicos permanecem preservados; nenhum registro e apagado ou reagrupado. IDs locais continuam sendo aceitos na transicao e nao comprovam uma identidade humana nem protegem contra automacao deliberada.

O tracker continua restrito ao layout publico. Nao existe filtro novo de robos nem exclusao de colaboradores que naveguem no site publico. A politica publica em `/privacidade` descreve o armazenamento e a duracao; esta alteracao nao cria uma interface de consentimento nem afirma que o usuario concedeu consentimento.

## Validacao

`node node_modules/tsx/dist/cli.mjs --test src/features/analytics/*.test.ts` verifica recarga, retorno, abas concorrentes, legado, cookie prioritario, assinatura, expiracao, armazenamento bloqueado, restauracao da identidade e separacao de navegadores. A suite da API usa fixture de banco; o teste concorrente comprova a chave e as chamadas de upsert, sem substituir uma verificacao PostgreSQL real ou em producao.

Na auditoria de 03/10/2026, Chromium executou o componente real com a API real e banco simulado: seis acessos, incluindo F5, outra aba, fechamento/reabertura, remocao apenas de localStorage e remocao apenas do cookie, conservaram um visitante. Confirmou cookie HttpOnly/Secure e restauracao do identificador local. Essa evidencia e local, sem consultar ou alterar a contagem de producao.
