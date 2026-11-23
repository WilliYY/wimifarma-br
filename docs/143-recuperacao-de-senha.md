# Recuperação de senha de clientes

Em **Entrar → Esqueci minha senha**, o cliente informa o e-mail. A resposta pública é igual para e-mails existentes e desconhecidos. O botão no e-mail abre a área para colar o código e escolher outra senha. Cada novo código de recuperação dura uma hora e funciona uma vez. Códigos já emitidos conservam a data de expiração registrada.

Em **Minha conta → Segurança → Verificar e-mail**, o cliente com senha local pode confirmar o endereço com a senha atual e o código recebido. A confirmação é opcional para cadastro, login, compra e demais funções da conta. Quem escolhe essa etapa habilita a recuperação de senha para o endereço exato confirmado. O código de confirmação vale por 15 minutos. Contas exclusivamente Google recuperam o acesso pelo Google. Usuários da equipe seguem o processo administrativo existente.

Os códigos são aleatórios e separados por finalidade. O banco guarda somente o hash. Cada finalidade permite uma emissão por cadastro dentro da validade do código, incluindo solicitações repetidas e tentativas cujo envio teve resultado incerto. O middleware limita solicitações por IP e o servidor revalida conta, endereço e credencial ao consumir o código. A redefinição não inicia sessão automaticamente. O código é texto selecionável no e-mail. O botão usa uma URL fixa da Wimifarma sem o segredo.

## Homologação e ativação

1. Aplique a migração `20261112120000_customer_password_recovery` antes de publicar o app correspondente.
2. Configure o remetente autenticado `pedidos@emails.wimifarma.com.br` com nome `Wimifarma`. Configure `BREVO_TRANSPORT=smtp`, com `BREVO_SMTP_LOGIN` e `BREVO_SMTP_KEY` na configuração privada do servidor. Use uma chave SMTP dedicada de envio e valide o IP de saída antes de restringir chamadas na Brevo. Consulte [a operação do transporte](141-brevo-homologacao-interna.md#transporte-smtp-14112026). O modo de recuperação começa em `disabled`.
3. Para uma amostra com código fictício, use `BREVO_EMAIL_MODE=internal_test`, `BREVO_TEST_RECIPIENT=wimifarma@gmail.com` e `npm exec -- tsx scripts/send-password-recovery-test-email.ts --send`. Confira a caixa de entrada em desktop e celular. Confirme a logo oficial, o botão e a ausência de marca visual da Brevo no e-mail entregue.
4. Depois da amostra, use `PASSWORD_RECOVERY_EMAIL_MODE=enabled` em homologação para confirmar e redefinir a senha de uma conta exclusiva de teste. Valide o novo login e a rejeição do código usado. A tela pública e a confirmação em Minha conta aparecem quando o app está com o modo ativo e o remetente configurado.

O HTML e o texto gerados trazem a identidade Wimifarma. A aparência após entrega depende da conta e deve ser conferida no destino. No SMTP, confira a política de rastreamento da conta e a mensagem recebida. O botão de recuperação usa uma URL fixa, e o código fica no corpo. A aceitação pelo relay não comprova entrega.

Se o envio falhar, a reserva continua até a expiração do código para limitar novas chamadas. Os logs operacionais registram a finalidade e o status da resposta sem incluir endereço, código ou chave.
