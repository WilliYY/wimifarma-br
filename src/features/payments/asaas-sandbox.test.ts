import assert from "node:assert/strict";
import test from "node:test";
import { asaasSandboxInput } from "./asaas-sandbox";

test("Sandbox selection requires an explicit ID and rejects credentials and environment overrides", () => {
  assert.equal(asaasSandboxInput.safeParse({ credentialId: "synthetic-id" }).success, true);
  for (const input of [{}, { credentialId: "" }, { credentialId: "x".repeat(129) },
    { credentialId: "synthetic-id", apiKey: "synthetic-secret" },
    { credentialId: "synthetic-id", environment: "production" },
    { credentialId: "synthetic-id", url: "https://untrusted.example" }]) {
    assert.equal(asaasSandboxInput.safeParse(input).success, false);
  }
});
