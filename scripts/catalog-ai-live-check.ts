import assert from "node:assert/strict";
import { suggestProductData } from "../src/features/products/ai-suggestions";

async function main() {
  assert.ok(process.env.GEMINI_API_KEY, "Gemini must be configured on this server");
  const queries = [
    { name: "Sabonete Dove Original 90 g", brand: "Dove", ean: "", knownCategories: ["Higiene pessoal"] },
    { name: "Oleo de Banho Dove Glicerinado 240ml", brand: "Dove", ean: "4005808808281", knownCategories: ["Higiene pessoal"] },
  ];
  for (const input of queries) {
    const result = await suggestProductData(input, { apiKey: process.env.GEMINI_API_KEY!, model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
    if (input.ean) assert.notEqual(result.confidence, "high", "The conflicting example must require human verification");
    if (result.confidence === "high") { assert.equal(result.identityMatch, "exact"); assert.ok(result.evidenceSourceIndexes.length); }
    console.log(JSON.stringify({ query: input.name, confidence: result.confidence, identityMatch: result.identityMatch, evidenceSourceIndexes: result.evidenceSourceIndexes, name: result.name, brand: result.brand, description: result.description, warnings: result.warnings, sources: result.sources.map(source => source.title) }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Live AI check failed"); process.exitCode = 1; });
