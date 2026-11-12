import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const auditScript = fileURLToPath(new URL("./audit-accessibility.mjs", import.meta.url));

async function serve(t, handleRequest) {
  const server = createServer(handleRequest);
  t.after(() => server[Symbol.asyncDispose]());
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("auditoria detecta violações, bloqueia redirecionamentos de recursos e identifica erro do Next.js", async (t) => {
  let externalRequests = 0;
  const externalOrigin = await serve(t, (_request, response) => {
    externalRequests += 1;
    response.end("fixture");
  });

  let redirectedResources = 0;
  const origin = await serve(t, (request, response) => {
    if (request.url === "/image.png") {
      redirectedResources += 1;
      response.writeHead(302, { Location: `${externalOrigin}/image.png` });
      response.end();
      return;
    }

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    if (request.url === "/error") {
      response.end('<!doctype html><html id="__next_error__"><body>Erro da aplicação</body></html>');
      return;
    }
    response.end(`<!doctype html><html lang="pt-BR"><head><title>Fixture</title></head>
      <body><main><h1>Fixture</h1><img alt="Exemplo" src="/image.png"><button></button></main></body></html>`);
  });

  await assert.rejects(
    run(process.execPath, [auditScript, "--base-url", origin, "--route", "/", "--route", "/error"], { timeout: 120_000 }),
    (error) => {
      assert.equal(error.code, 2, error.stderr);
      assert.match(error.stdout, /desktop 1440/);
      assert.match(error.stdout, /mobile 390/);
      assert.match(error.stdout, /button-name/);
      assert.doesNotMatch(error.stdout, /\/error \|/);
      assert.match(error.stderr, /O Next\.js exibiu uma página de erro/);
      return true;
    },
  );
  assert.equal(redirectedResources, 2);
  assert.equal(externalRequests, 0);
});
