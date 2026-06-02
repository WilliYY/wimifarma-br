import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3001";
const outputDir = process.env.AUDIT_OUTPUT_DIR || "artifacts/browser-audit";

const routes = [
  "/",
  "/farmacia-popular",
  "/delivery",
  "/sobre",
  "/contato",
  "/login",
  "/robots.txt",
  "/sitemap.xml",
];

const viewports = [
  { height: 900, name: "desktop", width: 1440 },
  { height: 900, name: "tablet", width: 768 },
  { height: 812, isMobile: true, name: "mobile", width: 375 },
];

function safeRouteName(route) {
  return route === "/" ? "home" : route.replaceAll("/", "-").replace(/^-/, "");
}

async function auditRoute(browser, viewport, route) {
  const context = await browser.newContext({
    isMobile: viewport.isMobile,
    viewport: { height: viewport.height, width: viewport.width },
  });
  const page = await context.newPage();
  const issues = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      issues.push({
        text: message.text(),
        type: `console:${message.type()}`,
      });
    }
  });
  page.on("pageerror", (error) => {
    issues.push({ text: error.message, type: "pageerror" });
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText || "";

    if (errorText.includes("net::ERR_ABORTED")) {
      return;
    }

    issues.push({
      text: `${request.method()} ${request.url()} - ${errorText}`,
      type: "requestfailed",
    });
  });

  let response = null;

  try {
    response = await page.goto(`${baseUrl}${route}`, {
      timeout: 20_000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => null);
    await page.screenshot({
      fullPage: true,
      path: `${outputDir}/${viewport.name}-${safeRouteName(route)}.png`,
    });
  } catch (error) {
    issues.push({
      text: error instanceof Error ? error.message : String(error),
      type: "navigation",
    });
  }

  await context.close();

  return {
    issues,
    route,
    status: response?.status() ?? null,
    viewport: viewport.name,
  };
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const results = [];

for (const viewport of viewports) {
  for (const route of routes) {
    results.push(await auditRoute(browser, viewport, route));
  }
}

await browser.close();

const failures = results.filter(
  (result) =>
    !result.status ||
    result.status >= 400 ||
    result.issues.some((issue) => issue.type !== "console:warning"),
);

console.log(JSON.stringify({ baseUrl, failures, results }, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
