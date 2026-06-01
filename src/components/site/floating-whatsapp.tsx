"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Bot, Send, X } from "lucide-react";
import { siteConfig } from "@/lib/site";

type MiaubyMessage = {
  role: "assistant" | "user";
  text: string;
};

const miaubyNews = [
  "Hoje a Miauby esta de olho no Festival do Bebe.",
  "Tem campanha de genericos para conferir com a equipe.",
  "Farmacia Popular: confirme documentos e disponibilidade pelo WhatsApp.",
];

function WhatsAppLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="currentColor"
      viewBox="0 0 32 32"
    >
      <path d="M16.02 3.2A12.73 12.73 0 0 0 5.2 22.65L3.6 28.8l6.3-1.58A12.72 12.72 0 1 0 16.02 3.2Zm0 22.9a10.1 10.1 0 0 1-5.14-1.4l-.37-.22-3.72.94.99-3.61-.24-.38A10.12 10.12 0 1 1 16.02 26.1Zm5.75-7.58c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.16-.2.31-.82 1.02-1 1.23-.18.2-.37.23-.68.08-.31-.16-1.32-.49-2.51-1.55-.93-.83-1.56-1.85-1.74-2.16-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.25-.61-.51-.52-.71-.53h-.6c-.2 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.2 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.45.2 1.99.12.61-.09 1.86-.76 2.12-1.5.26-.73.26-1.36.18-1.5-.08-.13-.29-.2-.6-.35Z" />
    </svg>
  );
}

export function FloatingWhatsApp() {
  const [isMiaubyOpen, setIsMiaubyOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<MiaubyMessage[]>([
    {
      role: "assistant",
      text: "Oi, eu sou a Miauby. Posso ajudar com ofertas, Festival do Bebe, Farmacia Popular e delivery em Ivate.",
    },
  ]);
  const news = miaubyNews[0];

  async function sendMiaubyMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentMessage = message.trim();

    if (!currentMessage || isSending) {
      return;
    }

    setMessage("");
    setIsSending(true);
    setMessages((current) => [
      ...current,
      { role: "user", text: currentMessage },
    ]);

    try {
      const response = await fetch("/api/miauby", {
        body: JSON.stringify({ message: currentMessage }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      const reply =
        typeof payload.message === "string" && payload.message.trim()
          ? payload.message.trim()
          : "A Miauby nao conseguiu responder agora. Chame a equipe no WhatsApp para confirmar.";

      setMessages((current) => [
        ...current,
        { role: "assistant", text: reply },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "A Miauby ficou sem sinal por aqui. O WhatsApp da Wimifarma continua aberto para atendimento.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isMiaubyOpen ? (
        <div className="mb-1 w-[min(calc(100vw-2rem),23rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_22px_70px_rgba(17,24,39,0.22)]">
          <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white">
                <Image
                  alt="Miauby"
                  className="object-cover"
                  fill
                  sizes="44px"
                  src="/miauby/miauby-novo.jpeg"
                />
              </span>
              <div className="min-w-0">
                <p className="font-black leading-5">Miauby</p>
                <p className="truncate text-xs font-medium text-white/70">
                  Assistente da Wimifarma
                </p>
              </div>
            </div>
            <button
              aria-label="Fechar Miauby"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/18"
              onClick={() => setIsMiaubyOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-line bg-brand-soft px-4 py-3 text-sm font-semibold text-ink">
            {news}
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto bg-surface-subtle px-4 py-4">
            {messages.map((item, index) => (
              <div
                className={
                  item.role === "user"
                    ? "ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-brand px-3 py-2 text-sm font-medium text-white"
                    : "mr-auto max-w-[86%] rounded-2xl rounded-bl-md border border-line bg-white px-3 py-2 text-sm font-medium leading-5 text-ink"
                }
                key={`${item.role}-${index}`}
              >
                {item.text}
              </div>
            ))}
            {isSending ? (
              <div className="mr-auto w-fit rounded-2xl rounded-bl-md border border-line bg-white px-3 py-2 text-sm font-bold text-muted">
                Miauby esta pensando...
              </div>
            ) : null}
          </div>

          <form
            className="flex items-center gap-2 border-t border-line bg-white p-3"
            onSubmit={sendMiaubyMessage}
          >
            <input
              className="h-11 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm font-medium text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Pergunte para a Miauby"
              value={message}
            />
            <button
              aria-label="Enviar mensagem para Miauby"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-strong disabled:opacity-50"
              disabled={isSending}
              type="submit"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          aria-label="Abrir Miauby"
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_16px_40px_rgba(0,0,0,0.22)] ring-2 ring-brand/15 transition hover:-translate-y-1 hover:ring-brand/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => setIsMiaubyOpen(true)}
          type="button"
        >
          <span className="absolute -left-56 top-1/2 hidden w-52 -translate-y-1/2 rounded-xl bg-ink px-3 py-2 text-left text-xs font-semibold leading-4 text-white shadow-xl group-hover:block sm:block">
            {news}
          </span>
          <span className="relative h-14 w-14 overflow-hidden rounded-full">
            <Image
              alt="Miauby"
              className="object-cover"
              fill
              sizes="56px"
              src="/miauby/miauby-novo.jpeg"
            />
          </span>
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow-md">
            <Bot className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      <a
        aria-label="Chamar Wimifarma no WhatsApp"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition hover:scale-105 hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        href={siteConfig.whatsappUrl}
        rel="noreferrer"
        target="_blank"
      >
        <WhatsAppLogo />
      </a>
    </div>
  );
}
