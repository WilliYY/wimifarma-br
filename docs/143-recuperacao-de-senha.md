# Recuperação de senha de clientes

Em **Entrar → Esqueci minha senha**, o cliente informa o e-mail. A resposta pública é igual para e-mails existentes e desconhecidos. O botão no e-mail abre a área para colar o código e escolher outra senha. O código dura 15 minutos e funciona uma vez.

Clientes que já usam senha local confirmam antes o endereço em **Minha conta → Segurança**, com a senha atual e o código recebido naquele endereço. O cadastro antigo, por si só, não prova posse do endereço. A recuperação vale para o endereço exato confirmado. Contas exclusivamente Google recuperam o acesso pelo Google. Usuários da equipe seguem o processo administrativo existente.

Os códigos são aleatórios e separados por finalidade. O banco guarda somente o hash. O envio tem intervalo de 15 minutos por cadastro. O middleware limita solicitações por IP e o servidor revalida conta, endereço e credencial ao consumir o código. A redefinição não inicia sessão automaticamente. O código é texto selecionável no e-mail. O botão usa uma URL fixa da Wimifarma sem o segredo.

## Homologação e ativação

1. Aplique a migração `20261112120000_customer_password_recovery` antes de publicar o app correspondente.
2. Configure o remetente autenticado `pedidos@emails.wimifarma.com.br` com nome `Wimifarma`. Guarde a chave da Brevo na configuração privada do servidor. O modo de recuperação começa em `disabled`.
3. Para uma amostra com código fictício, use `BREVO_EMAIL_MODE=internal_test`, `BREVO_TEST_RECIPIENT=wimifarma@gmail.com` e `npm exec -- tsx scripts/send-password-recovery-test-email.ts --send`. Confira a caixa de entrada em desktop e celular. Confirme a logo oficial, o botão e a ausência de marca visual da Brevo no e-mail entregue.
4. Depois da amostra, use `PASSWORD_RECOVERY_EMAIL_MODE=enabled` em homologação para confirmar e redefinir a senha de uma conta exclusiva de teste. Valide o novo login e a rejeição do código usado. A tela pública e a confirmação em Minha conta aparecem quando o app está com o modo ativo e o remetente configurado.

O HTML e o texto gerados trazem somente a identidade Wimifarma. A documentação comercial da Brevo prevê marca no plano gratuito. A aparência após entrega depende da conta e deve ser conferida no destino. A API recebe um pedido para suprimir o pixel. A aplicação desse pedido depende da configuração da Brevo. A aceitação pela API não comprova entrega.

Se o envio falhar, a reserva de 15 minutos continua para limitar novas chamadas. Os logs operacionais registram a finalidade e o status da resposta sem incluir endereço, código ou chave.
