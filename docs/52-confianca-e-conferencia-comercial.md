# 52 — Confiança e conferência comercial

## Marca Anvisa e prova de regularidade — consulta em 29/10/2026

A AFE comprova autorização de funcionamento, mas não concede selo promocional nem direito de usar a logomarca da agência no site. A [Política de Comunicação da Anvisa, Portaria 830/2025](https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/gestao/comunicacao/politica-de-comunicacao-da-anvisa.pdf/@@download/file), arts. 15–16, restringe o uso para fins particulares/comerciais e exige análise e autorização formal da área de comunicação. A exigência de autorização não constitui exceção automática à restrição comercial. Não foi localizado programa oficial de concessão de selo promocional a drogarias.

A rota prática é conferir o número da AFE e suas atividades, licença sanitária e regularidade técnica do CRF antes de publicar dados verificáveis da farmácia. A agência disponibiliza [consulta pública de empresas](https://consultas.anvisa.gov.br/#/empresas/empresas/) e [Certificado de AFE](https://www.gov.br/anvisa/pt-br/setorregulado/regularizacao/farmacias-e-drogarias/autorizacao-de-funcionamento-afe-ou-autorizacao-especial-ae/certificado-de-afe/certificado-de-afe). O certificado é documento de autorização, não selo publicitário. A consulta concreta da Wimifarma não foi concluída nesta rodada: o portal retornou 403 à ferramenta de pesquisa. Não se afirma autorização inexistente nem situação sanitária irregular.

Se faltar a AFE, seguir o [procedimento oficial](https://www.gov.br/anvisa/pt-br/setorregulado/regularizacao/farmacias-e-drogarias/autorizacao-de-funcionamento-afe-ou-autorizacao-especial-ae/solicitacao-de-afe-ou-ae/solicitacao-de-afe-farmacias-e-drogarias): cadastro da empresa/porte, Solicita, assunto 733, checklist/documento Orientações e GRU. Conferir autorização existente antes de pedir nova concessão. AE não é exigida simplesmente por dispensar controlados industrializados: a orientação da agência a vincula à manipulação de substâncias sujeitas a controle especial. Dúvidas de uso da marca podem ser encaminhadas ao [Fale Conosco oficial](https://www.gov.br/anvisa/pt-br/canais_atendimento/formulario-eletronico), solicitando orientação da Ascom; não foi localizado serviço específico de concessão de selo comercial.

Nenhum cadastro, petição, contato externo, certificação ou selo foi criado nesta consulta. A informação institucional do rodapé permanece, sem a logomarca da Anvisa ou alegação de endosso.

## Verificação em 08/10/2026

Consulta somente leitura em produção, sem criar pedidos, cobrar, comprar etiquetas, alterar produtos ou enviar mensagens comerciais.

- Mercado Pago: produção, habilitado, revisão 4. Há dois pagamentos locais `PAID` já conciliados. A interface pública apresenta Pix/cartão. Esta conferência não criou novo pagamento: não comprova uma nova geração/recebimento Pix em produção nem um novo cartão aprovado.
- Asaas: integração Sandbox, revisão 2, cobrança pública desabilitada. Cartão sintético confirmado por API/webhook e QR de duas horas gerado; recebimento Pix, expiração, recusa de cartão e estornos ainda em homologação. Comparador de tarifas não troca automaticamente o gateway. Contrato e evidências no documento 51.
- Melhor Envio: produção, habilitado, revisão 5, origem 87525-000, PAC/SEDEX e um dia útil de preparação.
- Quatro produtos ativos, com preço, estoque e perfil de envio habilitado/revisado: Cimegrip, Kit Kat, Losartana Teuto e óleo Dove. Losartana está classificada como receita comum; carrinho/pagamento não substituem a conferência farmacêutica antes da dispensação. Controlados, classificação pendente e Farmácia Popular continuam com atendimento assistido.

## Cotações reais

Uma unidade de cada produto, destino 01001-000. Todas as consultas retornaram HTTP 200, na ordem de preço crescente; prazo desempata preços iguais.

| Produto | PAC | SEDEX |
| --- | --- | --- |
| Cimegrip | R$21,70 / até 9 dias úteis | R$24,68 / até 5 dias úteis |
| Kit Kat | R$21,70 / até 9 dias úteis | R$24,68 / até 5 dias úteis |
| Losartana | R$21,70 / até 9 dias úteis | R$24,68 / até 5 dias úteis |
| Dove | R$23,36 / até 9 dias úteis | R$26,99 / até 5 dias úteis |

Cesta com uma unidade dos quatro, destino 87501-070: PAC R$88,46/até 8 dias úteis e SEDEX R$101,03/até 4 dias úteis. Os prazos incluem preparação e os preços são do momento da consulta, sem garantia de cobertura para todo CEP.

No Chrome, preencher 01001-000 no checkout com Kit Kat disparou a consulta sem clicar em botão e exibiu PAC/SEDEX. Os CEPs 87525-000 (Ivaté) e 87485-000 (Douradina) exibiram entrega local gratuita. Nenhum pedido foi finalizado; os campos do endereço foram restaurados ao estado anterior. A entrega local gratuita segue os CEPs previstos no contrato; transportadora é gratuita ao cliente a partir de R$99,90 em produtos após descontos, onde houver serviço disponível.

### Limites das medidas

Todos os quatro perfis usam estimativas autorizadas: C20,8 × L20,8 × A21,6 cm, peso pronto estimado de 500 g para Cimegrip/Kit Kat/Losartana e 800 g para Dove. Cada unidade gera um volume separado. A API calcular corretamente esses volumes não comprova medidas físicas nem consolidação em uma única caixa. Carrinhos mistos podem ficar mais caros; futuras revisões devem usar a embalagem externa real, proteção e peso total, sem apresentar estimativas como medições comprovadas.

## Indicadores e selos

O rodapé destaca HTTPS, CNPJ/loja física e acompanhamento de pedidos com links úteis. São indicadores próprios. RA/Ebit exigem aprovação e integração oficial; nenhum selo externo foi acrescentado sem concessão comprovada.

Para farmácias, priorizar identificação real do responsável técnico/CRF, horário, licença sanitária, AFE e AE quando aplicável. Esses dados não foram inventados. Fontes oficiais consultadas:

- [RDC 44/2009 consolidada, arts. 53–54](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00000044&tipo=RDC&orgao=RDC/DC/ANVISA/MS&valorAno=2009): identificação no site e regras de venda remota/publicidade.
- [Anvisa — entrega remota de controlados](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2023/medicamentos-controlados-poderao-continuar-a-ser-entregues-de-forma-remota): entrega regulamentada não autoriza compra/venda desses produtos pela internet.
- [RA1000](https://blog.reclameaqui.com.br/o-que-e-o-selo-ra1000/) e [RA Verificada](https://manual.reclameaqui.com.br/brand-page): concessão própria; cadastro gratuito não concede certificação.
- [Adesão Ebit](https://ebit.zendesk.com/hc/pt-br/articles/360011020013-Como-posso-cadastrar-minha-loja-virtual-na-Ebit): análise da loja e integração do selo oficial após aprovação.

Não houve alteração de regras comerciais, pagamentos, permissões, dados de clientes ou transporte nesta revisão visual.

## Validação do incremento

Revisão independente aprovada, sem defeitos confirmados. `npm.cmd run test:security`: 175 testes; `npm.cmd run test:shipping`: 52 testes. Lint, typecheck e build locais aprovados. Auditoria `--omit=dev --audit-level=high` sem vulnerabilidades; auditoria completa continua com cinco alertas high na cadeia de desenvolvimento `braces`/`micromatch`/`fast-glob`/ESLint, sem aplicar correção forçada incompatível.

Publicação `a039549`: build Linux/Docker aprovado, somente app recriado, sem migration ou alterações de credenciais. Imagem `sha256:415723914e20aacb733102c4d53eb312a849999417f461a4b5d3e512ad8fe639`, container saudável, zero reinícios, health e checkout HTTP 200. Recuperação preservada em `wimifarma-br-app:pre-trust-a039549`. Nova consulta somente leitura confirmou integrações, estoque/preços e perfis preservados.

Conferência visual em Chrome: viewport de 390 px, largura útil/rolável 375/375 px; viewport restaurado de 1920 px, largura útil/rolável 1905/1905 px. Sem transbordamento horizontal; 128 bolhas presentes. Capturas locais `outputs/rodape-confianca-celular-20261008.png` e `outputs/rodape-confianca-publicado-20261008.png`, fora do Git. O viewport foi restaurado após a inspeção. Nenhum selo RA/Ebit/Anvisa foi publicado.
