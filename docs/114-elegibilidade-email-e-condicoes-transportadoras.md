# 114 — Elegibilidade de e-mail e condições das transportadoras

## E-mail — revisão de 27/10/2026

A recomendação inicial de Resend em [112](112-react-email-modelos.md) ficou condicionada à elegibilidade da atividade. A política consultada em 27/10, atualizada em 13/10/2026, inclui produtos farmacêuticos e suplementos entre os conteúdos proibidos. Não foi localizada exceção expressa para avisos transacionais de farmácias. A autorização do lojista para cadastro gratuito pelo Google foi recebida, mas o cadastro e a integração aguardam esclarecimento desse ponto material; não houve login Google concluído, conta criada, credencial gerada ou envio pelo Resend.

Brevo também exige avaliação: sua política restringe determinados produtos e prevê análise prévia de setores sensíveis. Não presumir que mensagem genérica elimina a restrição da atividade. Em 27/10 foram enviadas, pelo Gmail da Wimifarma e com autorização específica do lojista, consultas a **support@resend.com** e **contact@brevo.com**. Ambas identificam a farmácia e perguntam sobre pedidos, pagamento e atendimento, com conteúdo mínimo e sem dados de clientes, receitas, diagnósticos ou lista de medicamentos. Os envios foram relidos na pasta Enviados; resposta comercial ainda pendente no momento deste registro.

React Email permanece utilizável independentemente do transportador de e-mail; não envia mensagens nem substitui a aprovação do serviço. Não foi necessário alterar os modelos implantados. SES é alternativa a avaliar: política geral e seção SES dos termos consultados não apresentam proibição genérica de farmácia legal, mas isso não comprova aprovação. Produção é regional e depende de análise AWS, autenticação do domínio, eventos, supressão e operação segura. Nenhuma conta/plano AWS foi contratado.

Fontes: [Resend — Uso Aceitável](https://resend.com/legal/acceptable-use), [Brevo — política antispam](https://www.brevo.com/legal/antispampolicy/), [AWS — Uso Aceitável](https://aws.amazon.com/aup/), [termos AWS, seção 15](https://aws.amazon.com/service-terms/), [produção SES](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).

## E-mail — retorno conferido em 01/11/2026

A thread do Gmail da Wimifarma contém uma resposta humana do Resend, recebida em **27/10/2026 às 14h51, horário de Brasília**. O serviço informou que não atende farmácias. Como a pergunta já descrevia avisos transacionais mínimos, não há autorização para tratar esses avisos como exceção. Resend foi descartado para esta operação; a biblioteca React Email pode continuar renderizando os modelos independentemente dele.

Na Brevo, a thread contém somente a consulta enviada em **27/10 às 10h37**. A busca ampliada em todas as pastas, desde 26/10, incluindo Brevo, Sendinblue e elegibilidade, não localizou resposta. Isso mantém a situação como **aguardando avaliação**, sem presumir aprovação. O plano gratuito consultado continua com 300 envios por dia, sem acumular e com marca Brevo; a cota não resolve a pendência de elegibilidade.

Resposta e consulta conferidas no Gmail da Wimifarma; a evidência permanece privada, fora do Git. Fontes públicas atuais: [Resend](https://resend.com/legal/acceptable-use), [Brevo](https://www.brevo.com/legal/antispampolicy/), [limites Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).

Esta revisão foi somente leitura dos e-mails e das fontes públicas. Não houve resposta, reenvio, contratação, criação de conta, geração de credencial, configuração de DNS ou disparo de e-mail.

## Frete — condições confirmadas

Melhor Envio continua sendo a integração existente. Correios direto, Frenet e Rodonaves são candidatos pesquisados; não estão cadastrados, homologados ou ativos por esta entrega. Plataforma de cotação adicional pode repetir transportadoras e não aumenta automaticamente a aceitação de cargas.

### Correios direto

- Clube/à vista e contrato convencional a faturar têm condições distintas. APIs preço/prazo exigem contrato a faturar e habilitação **38202/38210**; cadastro à vista não basta.
- Clube anuncia ausência de mínimo mensal; pacotes/coleta podem ter contrapartidas. Comparar proposta real, sem presumir tarifa menor que Melhor Envio.
- PPN distingue agências Correios Atende no Clube e SARA/Correios Atende no convencional. Existência de agência não confirma compatibilidade com contrato.
- Localizador retornou AC Ivaté, AC Douradina, AC Umuarama e AGF Caiuas. Limites publicados de postagem: **11h15, 10h25, 14h05 e 12h30**, respectivamente. Confirmar operacionalmente; não são horários garantidos de abertura. Não foi comprovado o atributo Correios Atende dessas unidades.
- Medicamentos comuns têm condições próprias; aerossóis inflamáveis são proibidos e não inflamáveis sofrem restrições. Não há comprovação de cadeia fria no serviço comum.

Fontes: [manual PPN](https://www.correios.com.br/atendimento/developers/manual-do-usuario-ppn), [FAQ PPN](https://www.correios.com.br/ppn/perguntas-frequentes), [agências](https://buscaagencia.correios.com.br/app/index.php), [preço](https://www.correios.com.br/atendimento/developers/manuais/manual-api-preco-1), [prazo](https://www.correios.com.br/atendimento/developers/manuais/manual-api-prazo), [restrições](https://www.correios.com.br/enviar/proibicoes-e-restricoes).

### Frenet

Integração com plataforma própria é documentada. Entrada usa contratos Frenet; contratos próprios e recursos adicionais têm condições específicas. Página consultada exibiu **R$85/mês** no cartão Profissional, enquanto resultado indexado mostrava R$99. Cadastro não confirmou preço final/renovação; nenhum dos valores está contratado. Loggi via Frenet proíbe medicamentos nas regras consultadas.

Fontes: [planos](https://frenet.com.br/planos-e-precos/), [plataforma própria](https://ajuda.frenet.com.br/knowledge-base/tenho-plataforma-propria-consigo-integrar-a-frenet-em-minha-plataforma/), [regras Loggi](https://ajuda.frenet.com.br/knowledge-base/regras-de-postagem-loggi/).

### Rodonaves

Localizador identificou **unidade 720 de Umuarama**, Rua Paulino Fontana, 2853, Jardim Alto da Boa Vista; **(44) 3361-5300**, **RTE720@RTE.COM.BR**. Aparece vinculada a Ivaté, Douradina e Umuarama. Indicadores coleta/entrega Express positivos, mas balcão indisponível: confirmar antes de levar encomendas.

Há solução dedicada a farmacêuticos, sem comprovação de pequenos volumes Express/fracionado nas mesmas condições. Regra geral não oferece manutenção térmica e exclui certas cargas perigosas. Canal publicado: **farmaceuticos@rte.com.br**. Faltam proposta, aceite por carga/SKU, mínimo faturável, coleta e documentação. Nenhuma consulta foi enviada à transportadora nesta entrega.

Fontes: [unidades](https://rodonaves.com.br/unidades), [cargas especiais](https://rodonaves.com.br/especiais), [regras](https://rodonaves.com.br/sobre-envio), [atendimento](https://rodonaves.com.br/fale-conosco), [API](https://dev.rodonaves.com.br/).

## Evidência e limites

Fontes, datas e perguntas comerciais: `outputs/servicos-email-frete-2026-10-27/confirmed-conditions.json`. Textos/comprovantes dos e-mails: `outputs/email-eligibility-2026-10-27/`. Ambos privados, fora do Git. Nenhuma alteração de DNS, SPF, MX, domínio de envio, taxa ou contrato de frete. Evidências físicas e receitas têm contrato em [115](115-evidencias-logisticas-e-receitas.md).
