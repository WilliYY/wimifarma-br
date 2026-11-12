import { parseArgs } from "node:util";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const defaultRoutes = ["/", "/catalogo", "/carrinho", "/contato"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const timeout = 20_000;

function readOptions() {
  const { values } = parseArgs({
    options: {
      "base-url": { type: "string" },
      route: { type: "string", multiple: true },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log("npm run audit:accessibility -- [--base-url URL] [--route /caminho ...]");
    console.log("Padrão: AUDIT_BASE_URL ou http://127.0.0.1:3001.");
    console.log(`Rotas públicas padrão: ${defaultRoutes.join(", ")}.`);
    console.log("Saída: 0 sem violações, 1 com violações, 2 com erro de auditoria.");
    return;
  }

  const base = new URL(values["base-url"] ?? process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3001");
  if (
    !["http:", "https:"].includes(base.protocol)
    || base.username || base.password
    || base.pathname !== "/" || base.search || base.hash
  ) {
    throw new Error("Informe apenas a origem HTTP(S), sem credenciais.");
  }

  const routes = [...new Set(values.route ?? defaultRoutes)];
  for (const route of routes) {
    if (
      !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?)?$/i.test(route)
      || /^\/(?:api|admin|minha-conta)(?:\/|$)/i.test(route)
    ) {
      throw new Error("Informe um caminho de página pública sem parâmetros ou fragmento.");
    }
  }
  return { origin: base.origin, routes };
}

async function auditRoute(browser, origin, path, { name, width, height, isMobile, hasTouch }) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile,
    hasTouch,
    serviceWorkers: "block",
  });

  try {
    const page = await context.newPage();
    let navigationError;

    await context.routeWebSocket("**/*", (socket) => socket.close());
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== origin || !["GET", "HEAD"].includes(request.method())) {
        await route.abort();
        return;
      }

      let response;
      try {
        response = await route.fetch({ maxRedirects: 0, timeout });
        if (response.status() >= 300 && response.status() < 400 && response.status() !== 304) {
          throw new Error(`Redirecionamento HTTP ${response.status()}.`);
        }
        await route.fulfill({ response });
      } catch (error) {
        if (request.isNavigationRequest()) navigationError ??= error;
        await route.abort();
      } finally {
        await response?.dispose();
      }
    });

    const url = new URL(path, origin).href;
    const response = await page.goto(url, { waitUntil: "load", timeout }).catch((error) => {
      throw navigationError ?? error;
    });
    if (!response?.ok()) {
      throw new Error(`HTTP ${response?.status() ?? "sem resposta"}.`);
    }
    if (page.url() !== url || !response.headers()["content-type"]?.includes("text/html")) {
      throw new Error("A rota não retornou o documento HTML solicitado.");
    }

    const { violations, incomplete } = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
    console.log(`${path} | ${name} ${width}×${height} | ${violations.length} violações, ${incomplete.length} regras para revisão manual`);
    for (const { id, impact, nodes, helpUrl } of violations) {
      console.log(`  ${id} (${impact ?? "sem gravidade"}): ${nodes.length} elemento(s). ${helpUrl}`);
      for (const { target } of nodes.slice(0, 3)) {
        console.log(`    ${JSON.stringify(target).slice(0, 240)}`);
      }
    }
    return violations.length > 0 ? 1 : 0;
  } catch (error) {
    console.error(`${path} | ${name} ${width}×${height} | erro: ${error.message.split("\n")[0]}`);
    return 2;
  } finally {
    await context.close();
  }
}

try {
  const options = readOptions();
  if (options) {
    const { origin, routes } = options;
    const browser = await chromium.launch();
    let exitCode = 0;

    try {
      for (const route of routes) {
        for (const viewport of viewports) {
          exitCode = Math.max(exitCode, await auditRoute(browser, origin, route, viewport));
        }
      }
    } finally {
      await browser.close();
    }
    process.exitCode = exitCode;
  }
} catch (error) {
  console.error(`Auditoria de acessibilidade: ${error.message.split("\n")[0]}`);
  process.exitCode = 2;
}
