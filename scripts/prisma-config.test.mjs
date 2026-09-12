import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const configPath = require.resolve("@prisma/config");
// Resolve the exact dependency loaded by Prisma, including scoped overrides.
const prismaRequire = createRequire(configPath);
const { deepmerge, deepmergeInto } = await import(
  pathToFileURL(prismaRequire.resolve("deepmerge-ts")).href
);

test("Prisma's merger preserves ordinary nested configuration", () => {
  const defaults = { migrations: { path: "prisma/migrations" }, flags: ["a"] };
  const override = { migrations: { seed: "tsx prisma/seed.ts" }, flags: ["b"] };

  assert.deepEqual(deepmerge(defaults, override), {
    migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
    flags: ["a", "b"],
  });
  assert.deepEqual(defaults.flags, ["a"]);
});

test("Prisma's merger handles cyclic records without exhausting the stack", () => {
  const left = { first: true };
  const right = { second: true };
  left.self = left;
  right.self = right;

  const result = deepmerge(left, right);
  assert.equal(result.first, true);
  assert.equal(result.second, true);
  assert.equal(result.self, result);
});

test("the in-place merger handles cyclic records without exhausting the stack", () => {
  const target = { first: true };
  const source = { second: true };
  target.self = target;
  source.self = source;

  deepmergeInto(target, source);
  assert.equal(target.first, true);
  assert.equal(target.second, true);
  assert.equal(target.self, target);
});

test("Prisma's merger does not pollute Object.prototype", () => {
  const input = JSON.parse('{"__proto__":{"pollutedByMerge":true}}');
  const result = deepmerge({}, input);

  assert.equal(Object.prototype.pollutedByMerge, undefined);
  assert.equal(Object.getPrototypeOf(result).pollutedByMerge, undefined);
});

test("Prisma loads the project config without connecting to a database", async () => {
  const { loadConfigFromFile } = await import(pathToFileURL(configPath).href);
  const originalUrl = process.env.DATABASE_URL;
  const testUrl = "postgresql://config_test:synthetic@127.0.0.1:1/config_test";
  process.env.DATABASE_URL = testUrl;

  try {
    const result = await loadConfigFromFile({ configRoot: root });
    assert.equal(result.error, undefined);
    assert.equal(result.config.schema, path.join(root, "prisma", "schema.prisma"));
    assert.equal(result.config.migrations.path, path.join(root, "prisma", "migrations"));
    assert.equal(result.config.migrations.seed, "tsx prisma/seed.ts");
    assert.equal(result.config.datasource.url, testUrl);
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  }
});
