import "dotenv/config";
import { sendPasswordRecoveryTestEmail } from "../src/features/communications/password-recovery-email";

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--send") {
    console.error("Use --send para enviar uma amostra fictícia à caixa interna da Wimifarma.");
    process.exitCode = 1;
    return;
  }

  const result = await sendPasswordRecoveryTestEmail();
  console.log(JSON.stringify(result));
  if (result.status !== "accepted") process.exitCode = 1;
}

main().catch(() => {
  console.error("Falha local ao preparar o teste de recuperação de senha.");
  process.exitCode = 1;
});
