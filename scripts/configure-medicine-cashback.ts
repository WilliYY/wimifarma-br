import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getPrisma } from "../src/lib/prisma";
import { applyMedicineCashback, planMedicineCashback } from "../src/features/cashback/medicine-activation";

async function main() {
  const args = process.argv.slice(2);
  const option = (key: string) => {
    const index = args.indexOf(key);
    const value = args[index + 1];
    if (index < 0 || !value || value.startsWith("--")) throw new Error(`Informe um valor válido para ${key}.`);
    return value;
  };
  const source = args.includes("--source-commit") ? option("--source-commit") : "";
  if (!/^[a-f0-9]{40}$/.test(source)) throw new Error("Informe --source-commit com o commit verificado da execução.");
  const db = getPrisma();
  try {
    if (!args.includes("--apply")) {
      console.log(JSON.stringify(await db.$transaction(tx => planMedicineCashback(tx, source), { isolationLevel: "RepeatableRead" }), null, 2));
      return;
    }
    if (!args.includes("--plan") || !args.includes("--sha256") || !args.includes("--actor-id")) throw new Error("Aplicação exige --plan, --sha256 e --actor-id. Não repetir uma entrega incerta.");
    const raw = readFileSync(option("--plan"));
    const digest = createHash("sha256").update(raw).digest("hex");
    if (digest !== option("--sha256")) throw new Error("SHA-256 do plano divergente.");
    const result = await db.$transaction(tx => applyMedicineCashback(tx, JSON.parse(raw.toString("utf8")), option("--actor-id"), source), { timeout: 120_000, maxWait: 10_000 });
    console.log(JSON.stringify({ applied: true, rule: "generic-similar-1pct-v1", planSha256: digest, count: result.length, products: result }));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falha ao configurar cashback."); process.exitCode = 1; });
