import "dotenv/config";
import { sendBrevoTestEmail } from "../src/features/communications/brevo-email";

async function main() {
  if (process.argv.slice(2).length !== 1 || process.argv[2] !== "--send") {
    console.error("Homologação sintética: use --send para solicitar um único envio ao BREVO_TEST_RECIPIENT configurado.");
    process.exitCode = 1;
    return;
  }
  const result = await sendBrevoTestEmail();
  // This result contains no credentials, addresses, message contents or provider response body.
  console.log(JSON.stringify(result));
  if (result.status !== "accepted") process.exitCode = 1;
}

main().catch(() => {
  console.error("Falha local na homologação. Confira a configuração antes de continuar.");
  process.exitCode = 1;
});
