import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import childProcess from "node:child_process";
import { realpathSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import { currentLoyaltyPolicySourceSha, parseLoyaltyPolicyArgs, runLoyaltyPolicyCli, reportLoyaltyPolicyFailure, sanitizeLoyaltyPolicyFailure, LoyaltyPolicyOperationError } from "./apply-loyalty-policy";

const args = ["--kind", "customers", "--actor", "synthetic-admin", "--source", "a".repeat(40), "--plan", path.resolve("../private-loyalty-plan.json")];

test("CLI exige declarações explícitas e usa dry run por padrão", () => {
  const parsed = parseLoyaltyPolicyArgs(args);
  assert.equal(parsed.apply, false); assert.equal(parsed.kind, "customers");
  assert.equal(parsed.expectedSha, undefined);
  assert.equal(parseLoyaltyPolicyArgs([...args, "--apply", "--expected-sha", "b".repeat(64)]).apply, true);
});

test("CLI rejeita flags desconhecidas, repetidas, hash ausente ou argumentos ambíguos", () => {
  for (const invalid of [[], [...args, "--apply"], [...args, "--expected-sha", "b".repeat(64)], [...args, "--kind", "cashback"], [...args, "--unknown"], [...args, "--apply", "--apply"], [...args.slice(0, -1), "relative.json"], [...args.slice(0, 5), "not-a-sha", ...args.slice(6)], [...args, "--apply", "--expected-sha", "secret-input"]]) assert.throws(() => parseLoyaltyPolicyArgs(invalid));
});

test("CLI recusa fonte divergente antes de abrir banco ou tocar plano", async t => {
  const root = realpathSync(path.resolve(__dirname, ".."));
  t.mock.method(childProcess, "execFileSync", (_command: unknown, input: unknown) => {
    const command = input as string[];
    if (command.includes("--show-toplevel")) return root;
    if (command.includes("HEAD")) return "a".repeat(40);
    return "";
  });
  await assert.rejects(runLoyaltyPolicyCli([...args.slice(0, 5), "0".repeat(40), ...args.slice(6)]), /revisão do executável/);
});

test("fonte Git pertence à raiz física do script e não ao cwd do operador", t => {
  const root = realpathSync(path.resolve(__dirname, ".."));
  const calls: string[][] = [];
  t.mock.method(childProcess, "execFileSync", (_command: unknown, input: unknown) => {
    const command = input as string[];
    calls.push(command);
    assert.deepEqual(command.slice(0, 2), ["-C", root]);
    if (command.includes("--show-toplevel")) return root;
    if (command.includes("HEAD")) return "c".repeat(40);
    return "";
  });
  assert.equal(currentLoyaltyPolicySourceSha(), "c".repeat(40));
  assert.ok(calls.some(command => command.includes("status")));
});

test("diagnóstico preserva etapa, classe e código sem mensagens, stack ou entradas privadas", () => {
  const error = Object.assign(new Error("postgres://private-user:private-password@host/database token=private-token"), { code: "ECONNREFUSED" });
  const diagnostic = sanitizeLoyaltyPolicyFailure(new LoyaltyPolicyOperationError("CONNECT_DATABASE", error));
  assert.deepEqual(diagnostic, { stage: "CONNECT_DATABASE", errorClass: "Error", errorCode: "ECONNREFUSED" });
  assert.doesNotMatch(JSON.stringify(diagnostic), /private|postgres|token|password|stack/);
  assert.equal(sanitizeLoyaltyPolicyFailure(Object.assign(new Error("private"), { code: "private-token", name: "private-user" })).errorCode, "UNKNOWN");
});

test("referência de diagnóstico corresponde a arquivo privado realmente persistido", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "loyalty-diagnostic-"));
  const failure = new LoyaltyPolicyOperationError("LOAD_PLAN", Object.assign(new Error("private-file-path"), { code: "ENOENT" }));
  const reference = await reportLoyaltyPolicyFailure(failure, directory);
  assert.equal(reference.diagnosticSaved, true);
  assert.equal(reference.stage, "LOAD_PLAN"); assert.equal(reference.errorCode, "ENOENT");
  const files = await readdir(directory);
  assert.ok(files.includes(reference.diagnosticFile!));
  const bytes = await readFile(path.join(directory, reference.diagnosticFile!), "utf8");
  assert.doesNotMatch(bytes + JSON.stringify(reference), /private-file-path|password|token|stack/);
  assert.equal(JSON.parse(bytes).diagnosticId, reference.diagnosticId);
});

test("falha real de filesystem recebe etapa e código sem propagar caminho da entrada", async t => {
  const root = realpathSync(path.resolve(__dirname, ".."));
  t.mock.method(childProcess, "execFileSync", (_command: unknown, input: unknown) => {
    const command = input as string[];
    if (command.includes("--show-toplevel")) return root;
    if (command.includes("HEAD")) return "a".repeat(40);
    return "";
  });
  const invalidPlan = path.join(os.tmpdir(), `loyalty-missing-parent-${randomUUID()}`, "private-plan.json");
  await assert.rejects(runLoyaltyPolicyCli([...args.slice(0, -1), invalidPlan]), error => {
    assert.ok(error instanceof LoyaltyPolicyOperationError);
    assert.deepEqual(sanitizeLoyaltyPolicyFailure(error), { stage: "PLAN_PATH", errorClass: "Error", errorCode: "ENOENT" });
    return true;
  });
});

test("falha ao persistir diagnóstico informa ausência sem anunciar arquivo inexistente", async () => {
  const reference = await reportLoyaltyPolicyFailure(Object.assign(new Error("private-input"), { code: "ECONNRESET" }), __filename);
  assert.equal(reference.diagnosticSaved, false);
  assert.equal(reference.diagnosticFile, undefined);
  assert.equal(reference.errorCode, "ECONNRESET");
  assert.doesNotMatch(JSON.stringify(reference), /private-input|apply-loyalty-policy\.test/);
});
