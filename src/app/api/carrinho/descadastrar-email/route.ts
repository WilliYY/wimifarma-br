import { cartReminderUnsubscribeSchema, unsubscribeCartEmailReminder } from "@/features/communications/cart-email-reminder";
import { readLimitedBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store", "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

function page(content: string, status = 200) {
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lembrete de carrinho</title></head><body><main><h1>Lembrete de carrinho</h1>${content}<p><a href="/carrinho">Voltar ao carrinho</a></p></main></body></html>`, { status, headers });
}

export function GET(request: Request) {
  const parsed = cartReminderUnsubscribeSchema.safeParse({ chave: new URL(request.url).searchParams.get("chave") });
  if (!parsed.success) return page("<p>Use o link de descadastro do e-mail.</p>");
  return page(`<p>Confirme para desligar este lembrete por e-mail.</p><form method="post" action="/api/carrinho/descadastrar-email"><input type="hidden" name="chave" value="${parsed.data.chave}"><button type="submit">Desligar lembrete</button></form>`);
}

export async function POST(request: Request) {
  try {
    const body = new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, { maxBytes: 256 })));
    const parsed = cartReminderUnsubscribeSchema.safeParse(Object.fromEntries(body));
    if (parsed.success) await unsubscribeCartEmailReminder(parsed.data.chave);
  } catch { return page("<p>Não foi possível concluir. Tente novamente pelo link do e-mail.</p>", 503); }
  return page("<p>O lembrete associado ao link está desativado.</p>");
}
