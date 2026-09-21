# Delivery: experiencia visual e consulta de entrega

## Escopo - 2026-09-21

Renovar `/delivery` com cena de pessoas em contexto residencial, hierarquia clara, chamadas para catalogo/WhatsApp, consulta de CEP existente, passos do pedido e perguntas expansiveis. Remover textos de planejamento interno da pagina publica. Sem nova dependencia, migration ou mudanca financeira.

## Interface e comportamento

- Hero com entregador e cliente, cores da Wimifarma, imagem responsiva 4:3 sem cortar rostos. Texto e botoes permanecem HTML. Imagem identificada como ilustrativa, sem representar a equipe real.
- `DeliveryEstimator` reutiliza a faixa de CEP ja existente. O resultado positivo informa disponibilidade, com condicao de frete gratis de R$ 99,90 visivel; consultar CEP nao comprova gratuidade, estoque ou prazo. Nenhuma alteracao no calculo do checkout.
- Perguntas usam `details/summary` nativos, com teclado e sem JavaScript adicional. Ancora para consulta, catalogo, WhatsApp e mapa existentes.
- Metadados sociais usam a nova imagem; canonical e BreadcrumbList preservam `/delivery`. A pagina e renderizada no servidor; apenas o consultor de CEP exige interacao cliente.

## Imagem

- `public/banners/delivery-em-casa.webp`: 1280 x 960, **122.176 bytes**, WebP qualidade 82. Next Image entrega tamanhos adaptados; proporcao reservada evita salto de layout.
- Criada pelo recurso integrado `image_gen`, com pessoas adultas e cenario residencial, conforme correcao do lojista. A primeira proposta de scooter isolada foi descartada e nao integra o site.
- IPTC DigitalSourceType `trainedAlgorithmicMedia` gravado no arquivo de origem. Otimizacao reproduzivel: `node scripts/prepare-delivery-image.mjs <imagem-original.png>`. A fonte gerada fica fora do Git; somente o WebP final e versionado.
- Prompt final: "Create a high-end photorealistic editorial lifestyle photograph for the delivery page of Wimifarma, a local pharmacy in Ivaté, Paraná, Brazil. Landscape 4:3 aspect ratio. Scene: a friendly adult Brazilian delivery courier around 30 years old wearing a neat deep crimson red polo shirt hands a white pharmacy paper bag with crimson handles to a smiling adult woman around 40 at the doorway of her modest, attractive Brazilian home. Both full faces visible in natural three-quarter poses, authentic warm interaction, hands anatomically realistic and clearly exchanging the bag. Two people only, not staring into the camera. Courier stands on left, customer on right, waist-up or three-quarter framing, enough context and margins. The setting matters: covered veranda, cream plaster wall, natural wooden door, lush potted tropical plants, small sunlit residential street in the softly blurred background, a parked delivery motorcycle with crimson cargo box subtly visible to the far left. Soft morning daylight, realistic Brazilian everyday neighborhood, premium commercial photography but candid and approachable, natural skin texture, gently blurred background, rich yet restrained colors. Deep crimson #c8102e accents on uniform and bag harmonize with warm neutral architecture and greenery. Bag front displays a small simple crimson pharmacy plus only, no lettering. No drug packages, no pills, no medical promises, no hospital, no text overlays, no prices, no watermarks, no extra limbs, no exaggerated smiles, no artificial studio background. Keep essential faces and the bag within the central 75% so responsive mobile cropping remains safe. This is an illustrative promotional scene, not a documentary image of actual staff."

## Validacao

`scripts/delivery-ui-audit.mjs` usa Chromium com movimento reduzido e bloqueia escritas de APIs: verifica 320/390/768/1440 px, imagem carregada, overflow, canonical/social, links, CEP invalido/local/externo e FAQ por teclado. `AUDIT_BASE_URL` permite repetir a verificacao no site publicado. Capturas ficam em `artifacts/delivery-qa/`, fora do Git.

Validacao local aprovada: 137 testes da suite, lint e typecheck; 9 testes de detalhes/CEP repetidos apos ajuste de texto. Build final aprovado (`/delivery`: 4,3 kB de rota). Auditoria Chromium passou nas quatro larguras, incluindo distancia do cabecalho fixo e ancora sem sobreposicao. Servidor temporario encerrado e porta 3017 liberada. Sem gravacao de pedidos, clientes ou dados comerciais.
