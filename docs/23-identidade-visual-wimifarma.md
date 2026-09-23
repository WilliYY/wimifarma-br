# Identidade visual: logo completa da Wimifarma

## Diretriz do lojista - 2026-09-21

Usar sempre a logo oficial completa, inclusive em banners. A farmacia nao deve ser identificada somente por uma cruz generica. Aplicar tambem a sacolas, uniformes e veiculos de cenas ilustrativas. A regra foi adicionada ao `AGENTS.md` do projeto.

## Arquivos e aplicacoes

- Original preservado: `public/brand/logo-wimifarma.svg` (214.158 bytes). Derivacao leve: `public/brand/logo-wimifarma-compact.webp`, 640 x 151, **18.980 bytes**. Letras e contorno vieram diretamente do original, sem redesenho por IA. `node scripts/prepare-official-logo.mjs` reproduz a conversao.
- `src/components/site/brand-signature.tsx` oferece assinatura reutilizavel com logo completa, contraste e proporcao preservados. Um mesmo arquivo/cache e usado nas campanhas.
- Cabeçalho usa a animação original de montagem reenviada pelo lojista em 2026-09-23, transparente e otimizada sem alteração dos pixels. Essa referência substitui a flutuação/brilho de 2026-09-22. Movimento reduzido, rodapé e banners mantêm a assinatura completa estática. Sem GIF adicional; contrato em `docs/26-logo-animada-original.md`.
- Assinatura nos tres banners principais e nas tres campanhas de perfumaria; marcas e embalagens dos fabricantes preservadas. Perfumaria reserva uma faixa propria para a logo, sem encobrir produtos.
- Banners institucionais de Sobre e Contato, Farmacia Popular e Delivery recebem a assinatura oficial. O selo do programa Farmacia Popular continua separado da identidade da loja.
- `public/banners/delivery-wimifarma.webp` substitui `delivery-em-casa.webp`, que foi retirado dos assets ativos. A nova cena usa a logo completa na sacola, camisa e bau. 1280 x 960, **118.154 bytes**, WebP qualidade 82, IPTC DigitalSourceType de IA. URL nova evita manter imagem antiga no cache.

## Edicao da cena

Ferramenta integrada `image_gen`, com a cena existente como alvo e renderizacao da logo oficial como referencia. Pessoas, poses, maos, casa e iluminacao preservadas. Resultado conferido visualmente antes da conversao: `node scripts/prepare-delivery-image.mjs <imagem-editada.png>`.

Prompt final: "Edit ONLY branding in the FIRST image, the existing residential pharmacy delivery photograph. Preserve exactly the same two adults, faces, poses, hands, bag position, house, plants, motorcycle, lighting, 4:3 composition and realistic photographic quality. SECOND image is the OFFICIAL WimiFarma logo reference, not a scene to blend in. Logo has a rounded capsule outline with a plus and thin vertical divider on left, exact distinctive lettering 'WimiFarma' and small TM. Preserve its exact lettering, proportions and design, do not substitute a generic cross. Replace the solitary red plus on the front of the WHITE PAPER BAG with the COMPLETE official logo from the reference, printed in deep crimson red, clear and legible, around 75% of the bag width, natural paper perspective. Replace the solitary white plus on the RED DELIVERY BOX on the motorcycle at far left with the COMPLETE official logo in white, naturally smaller with perspective. Add a small complete white official logo embroidered on the courier's left chest of the red polo, without changing shirt. Do not add a new floating logo or text overlay. Do not put a red rectangular background behind the bag logo; reference background is only for showing logo shape. No other modifications. The user requires their real Wimifarma brand instead of generic pharmacy symbols."

## Validacao

`node scripts/brand-ui-audit.mjs`: cinco paginas, quatro larguras (320/390/768/1440), marca do cabecalho carregada mesmo com movimento reduzido, seis campanhas com logo, imagens e ausencia de overflow. `AUDIT_BASE_URL` permite repetir em producao. Scripts bloqueiam escritas de APIs durante a auditoria. Capturas ficam em `artifacts/brand-qa/`, sem versionamento. Repetir `scripts/delivery-ui-audit.mjs` para conferir CEP, FAQ e imagem social apos a troca de URL.

Validacao local aprovada: ambas as auditorias Chromium nas quatro larguras, 137 testes, lint, typecheck e build. A home local usa o componente real com catalogo vazio em memoria, pois o PostgreSQL do Docker nao e acessivel pelo processo Windows; as outras quatro paginas usam o Next local. Nenhuma fixture foi criada no banco. O servidor temporario foi encerrado apos a verificacao.

## Publicacao e conferencia externa

Codigo `5e1e475` enviado ao GitHub, recebido por fast-forward no VPS e publicado por build/recriacao do app. Container `healthy`. Imagem anterior preservada em `wimifarma-br-app:pre-brand-3115506`; sem migration ou nova dependencia.

Ambas as auditorias passaram com `AUDIT_BASE_URL=https://wimifarma.com.br`: Home, Delivery, Sobre, Contato e Farmacia Popular em 320/390/768/1440 px; seis campanhas com assinatura oficial, cabecalho com logo completa, imagem nova/social de delivery, CEP/FAQ e zero overflow ou erros de navegador. Em producao a home foi verificada com o catalogo real, somente por leitura. Nenhuma pendencia tecnica identificada.
