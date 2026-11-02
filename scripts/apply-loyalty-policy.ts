import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants, realpathSync } from "node:fs";
import { open, realpath, mkdir, lstat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getPrisma } from "../src/lib/prisma";
import {
  applyLoyaltyPolicyPlan, createLoyaltyPolicyPlan, LoyaltyPolicyError, loyaltyPolicyPlanSha,
  parseLoyaltyPolicyPlan, serializeLoyaltyPolicyPlan, type LoyaltyPolicyKind,
} from "../src/features/club/policy-migration";

// The tools-image bundle must pin this constant with esbuild --define to the exact build SHA40.
declare const __LOYALTY_POLICY_SOURCE_SHA__: string | undefined;

type Options = { kind: LoyaltyPolicyKind; actorId: string; sourceSha: string; planPath: string; apply: boolean; expectedSha?: string };
type CliStage = "ARGUMENTS" | "SOURCE_PROVENANCE" | "PLAN_PATH" | "LOAD_PLAN" | "CONNECT_DATABASE" | "APPLY_PLAN" | "CREATE_PLAN" | "SAVE_PLAN" | "DISCONNECT_DATABASE";

export class LoyaltyPolicyOperationError extends Error {
  constructor(public readonly stage: CliStage, public readonly originalError: unknown) {
    super("Loyalty policy operation failed.");
    this.name = "LoyaltyPolicyOperationError";
  }
}

export function sanitizeLoyaltyPolicyFailure(input: unknown): { stage: CliStage | "UNKNOWN"; errorClass: string; errorCode: string } {
  const error = input instanceof LoyaltyPolicyOperationError ? input.originalError : input;
  const stage = input instanceof LoyaltyPolicyOperationError ? input.stage : "UNKNOWN";
  const record = error && typeof error === "object" ? error as { name?: unknown; code?: unknown } : {};
  const allowedClasses = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "PrismaClientKnownRequestError", "PrismaClientUnknownRequestError", "PrismaClientInitializationError", "PrismaClientRustPanicError", "PrismaClientValidationError"]);
  const allowedCodes = new Set(["EACCES", "EPERM", "ENOENT", "EEXIST", "ELOOP", "EIO", "EMFILE", "ENFILE", "ENOSPC", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH", "EPIPE", "40001", "40P01", "23503", "23505", "28P01", "08006", "08001", "53300", "57P01", "57014", "42P01", "42703"]);
  return {
    stage,
    errorClass: typeof record.name === "string" && allowedClasses.has(record.name) ? record.name : "Error",
    errorCode: typeof record.code === "string" && (allowedCodes.has(record.code) || /^P\d{4}$/.test(record.code)) ? record.code : "UNKNOWN",
  };
}

/** Only allowlisted diagnostic fields are persisted. Messages, stack, paths and inputs are omitted. */
export async function reportLoyaltyPolicyFailure(error: unknown, directory = path.join(os.homedir(), ".wimifarma", "loyalty-policy-diagnostics")) {
  const diagnostic = { diagnosticId: randomUUID(), recordedAt: new Date().toISOString(), ...sanitizeLoyaltyPolicyFailure(error) };
  const diagnosticFile = `loyalty-policy-diagnostic-${diagnostic.diagnosticId}.json`;
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform !== "win32" && ((stat.mode & 0o077) !== 0 || (typeof process.getuid === "function" && stat.uid !== process.getuid())))) throw new Error("Private diagnostic directory required.");
    const handle = await open(path.join(directory, diagnosticFile), "wx", 0o600);
    try { await handle.writeFile(JSON.stringify(diagnostic, null, 2) + "\n", "utf8"); await handle.sync(); } finally { await handle.close(); }
    return { ...diagnostic, diagnosticSaved: true, diagnosticFile };
  } catch (writeError) {
    return { ...diagnostic, diagnosticSaved: false, diagnosticFile: undefined, diagnosticWriteCode: sanitizeLoyaltyPolicyFailure(writeError).errorCode };
  }
}

export function parseLoyaltyPolicyArgs(args: string[]): Options {
  const flags = new Map<string, string>();
  let apply = false;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === "--apply") {
      if (apply) throw new LoyaltyPolicyError("Argumento duplicado.");
      apply = true; continue;
    }
    if (!["--kind", "--actor", "--source", "--plan", "--expected-sha"].includes(flag) || flags.has(flag) || !args[index + 1] || args[index + 1].startsWith("--")) throw new LoyaltyPolicyError("Use --kind customers|cashback --actor ID --source SHA40 --plan PATH [--apply --expected-sha SHA256]. Dry run é o padrão.");
    flags.set(flag, args[++index]);
  }
  const kind = flags.get("--kind");
  const actorId = flags.get("--actor") ?? "";
  const sourceSha = flags.get("--source") ?? "";
  const planPath = flags.get("--plan") ?? "";
  const expectedSha = flags.get("--expected-sha");
  if ((kind !== "customers" && kind !== "cashback") || !/^[A-Za-z0-9_-]{1,128}$/.test(actorId) || !/^[a-f0-9]{40}$/.test(sourceSha) || !path.isAbsolute(planPath) ||
    (apply ? !expectedSha || !/^[a-f0-9]{64}$/.test(expectedSha) : expectedSha !== undefined)) throw new LoyaltyPolicyError("Declare kind, ADMIN, SHA40 e caminho absoluto; apply exige --expected-sha SHA256.");
  return { kind, actorId, sourceSha, planPath, apply, expectedSha };
}

export function currentLoyaltyPolicySourceSha(): string {
  const pinned = typeof __LOYALTY_POLICY_SOURCE_SHA__ === "undefined" ? undefined : __LOYALTY_POLICY_SOURCE_SHA__;
  let source: string;
  if (pinned) source = pinned;
  else {
    // Resolve the checkout containing this executable, independently of the operator's cwd.
    const root = realpathSync(path.resolve(path.dirname(realpathSync(__filename)), ".."));
    try {
      const gitRoot = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (realpathSync(gitRoot) !== root) throw new Error("Unexpected Git root.");
      execFileSync("git", ["-C", root, "ls-files", "--error-unmatch", "--", "scripts/apply-loyalty-policy.ts", "src/features/club/policy-migration.ts"], { stdio: ["ignore", "pipe", "ignore"] });
      source = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    }
    catch { throw new LoyaltyPolicyError("Revisão do executável indisponível; use bundle com SHA40 fixado no build."); }
    if (execFileSync("git", ["-C", root, "status", "--porcelain", "--untracked-files=normal"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()) throw new LoyaltyPolicyError("A revisão do executável exige checkout sem alterações.");
  }
  if (!/^[a-f0-9]{40}$/.test(source)) throw new LoyaltyPolicyError("Revisão do executável inválida.");
  return source;
}

/** Runtime plans must remain outside the Git worktree, even in an ignored directory. */
async function privatePlanPath(planPath: string) {
  const parent = await realpath(path.dirname(planPath));
  const resolved = path.join(parent, path.basename(planPath));
  let repository: string | undefined;
  try { repository = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* Bundled tools images may omit Git. */ }
  // The working directory is also protected when the image has no Git metadata.
  const roots = [await realpath(process.cwd()), ...(repository ? [await realpath(repository)] : [])];
  for (const root of roots) {
    const relative = path.relative(root, resolved);
    if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) throw new LoyaltyPolicyError("Salve o plano privado fora do projeto e do Git.");
  }
  try {
    if (execFileSync("git", ["-C", parent, "rev-parse", "--is-inside-work-tree"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "true") throw new LoyaltyPolicyError("Salve o plano privado fora do projeto e do Git.");
  } catch (error) { if (error instanceof LoyaltyPolicyError) throw error; }
  return resolved;
}

async function readPrivatePlan(planPath: string): Promise<string> {
  // Open first, then inspect the descriptor to avoid replacing the checked file with a symlink.
  const handle = await open(planPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024 || stat.nlink !== 1 ||
      (process.platform !== "win32" && ((stat.mode & 0o077) !== 0 || (typeof process.getuid === "function" && stat.uid !== process.getuid())))) throw new LoyaltyPolicyError("Plano deve ser arquivo privado regular do operador, sem links e com até 8 MiB.");
    return await handle.readFile("utf8");
  } finally { await handle.close(); }
}

export async function runLoyaltyPolicyCli(args: string[]) {
  let stage: CliStage = "ARGUMENTS";
  try {
    const options = parseLoyaltyPolicyArgs(args);
    stage = "SOURCE_PROVENANCE";
    if (options.sourceSha !== currentLoyaltyPolicySourceSha()) throw new LoyaltyPolicyError("--source diverge da revisão do executável.");
    stage = "PLAN_PATH";
    const planPath = await privatePlanPath(options.planPath);
    // Validate the original reviewed bytes before opening a database connection.
    let reviewedPlan;
    if (options.apply) {
      stage = "LOAD_PLAN";
      const bytes = await readPrivatePlan(planPath);
      try { reviewedPlan = parseLoyaltyPolicyPlan(JSON.parse(bytes)); }
      catch { throw new LoyaltyPolicyError("Arquivo de plano inválido."); }
      if (bytes !== serializeLoyaltyPolicyPlan(reviewedPlan) || createHash("sha256").update(bytes).digest("hex") !== options.expectedSha) throw new LoyaltyPolicyError("Arquivo original ou hash de revisão foi alterado.");
      if (reviewedPlan.kind !== options.kind) throw new LoyaltyPolicyError("Tipo do plano diverge de --kind.");
    }
    stage = "CONNECT_DATABASE";
    const db = getPrisma();
    let operationFailed = false;
    try {
      if (reviewedPlan) {
        stage = "APPLY_PLAN";
        const result = await applyLoyaltyPolicyPlan(db, reviewedPlan, { actorId: options.actorId, sourceSha: options.sourceSha, expectedSha: options.expectedSha! });
        console.log(JSON.stringify({ mode: "apply", kind: options.kind, planSha: options.expectedSha, ...result }));
      } else {
        stage = "CREATE_PLAN";
        const plan = await createLoyaltyPolicyPlan(db, options);
        // Exclusive creation prevents a dry run from overwriting the reviewed file.
        stage = "SAVE_PLAN";
        const handle = await open(planPath, "wx", 0o600);
        try { await handle.writeFile(serializeLoyaltyPolicyPlan(plan), "utf8"); await handle.sync(); } finally { await handle.close(); }
        console.log(JSON.stringify({ mode: "dry-run", kind: plan.kind, count: plan.targets.length, planSha: loyaltyPolicyPlanSha(plan), expiresAt: plan.expiresAt, marginReviewed: false }));
      }
    } catch (error) { operationFailed = true; throw error; }
    finally {
      try { await db.$disconnect(); }
      catch (error) { if (!operationFailed) { stage = "DISCONNECT_DATABASE"; throw error; } }
    }
  } catch (error) {
    if (error instanceof LoyaltyPolicyError) throw error;
    throw new LoyaltyPolicyOperationError(stage, error);
  }
}

if (typeof require !== "undefined" && require.main === module) {
  runLoyaltyPolicyCli(process.argv.slice(2)).catch(async error => {
    if (error instanceof LoyaltyPolicyError) console.error(error.message);
    else console.error(JSON.stringify({ error: "LOYALTY_POLICY_OPERATION_FAILED", ...await reportLoyaltyPolicyFailure(error) }));
    process.exitCode = 1;
  });
}
