import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

const fallbackMessages = [
  "Hoje e um bom dia para conferir as campanhas da Wimifarma. Temos destaque para cuidados do bebe, genericos e atendimento pelo WhatsApp.",
  "Posso te ajudar com ofertas, Farmacia Popular, delivery em Ivate e contato com a equipe da Wimifarma.",
  "Recado da Miauby: se estiver procurando preco ou disponibilidade, chame a equipe no WhatsApp para confirmar rapidinho.",
];

function fallbackReply(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("bebe") || normalized.includes("bebê")) {
    return "Hoje a Miauby esta de olho no Festival do Bebe: fraldas, higiene e cuidado com carinho. Para confirmar ofertas e disponibilidade, chama a Wimifarma no WhatsApp.";
  }

  if (normalized.includes("popular")) {
    return "A Wimifarma ajuda com Farmacia Popular. Leve documento, receita quando necessario e confirme pelo WhatsApp antes de ir ate a loja.";
  }

  if (normalized.includes("delivery") || normalized.includes("entrega")) {
    return `Tem delivery local em ${siteConfig.city}. Me diga o que voce precisa ou chame direto no WhatsApp da Wimifarma.`;
  }

  const index = Math.abs(message.length) % fallbackMessages.length;
  return fallbackMessages[index];
}

function cleanReply(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\*\*/g, "")
    .trim()
    .slice(0, 700);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = String(body?.message ?? "").trim().slice(0, 500);

  if (!message) {
    return NextResponse.json(
      { message: "Me manda uma pergunta rapidinha para eu ajudar." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json({
      message: fallbackReply(message),
      source: "fallback",
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: message,
                },
              ],
              role: "user",
            },
          ],
          generationConfig: {
            maxOutputTokens: 180,
            temperature: 0.65,
          },
          systemInstruction: {
            parts: [
              {
                text:
                  "Voce e Miauby, assistente simpatico da Wimifarma em Ivate-PR. Responda em portugues do Brasil, curto, util e comercial. Ajude com ofertas, Farmacia Popular, delivery e atendimento pelo WhatsApp. Nao invente estoque, preco ou promessas medicas. Para disponibilidade, oriente confirmar com a equipe.",
              },
            ],
          },
        }),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini respondeu ${response.status}`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join(" ");
    const reply = cleanReply(text ?? "");

    return NextResponse.json({
      message: reply || fallbackReply(message),
      source: reply ? "gemini" : "fallback",
    });
  } catch (error) {
    console.error("Erro no Miauby Gemini", error);

    return NextResponse.json({
      message: fallbackReply(message),
      source: "fallback",
    });
  }
}
