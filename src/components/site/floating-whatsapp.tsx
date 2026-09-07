"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ExternalLink,
  LoaderCircle,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { siteConfig } from "@/lib/site";

type MiaubyProduct = {
  brand: string | null;
  category: string | null;
  id: string;
  imageUrl: string | null;
  isPopularPharmacy: boolean;
  name: string;
  price: string;
  promotionalPrice: string | null;
  requiresPrescription: boolean;
  slug: string;
};

type ChatMessage = {
  id: string;
  products?: MiaubyProduct[];
  role: "assistant" | "user";
  text: string;
};

type MiaubyResponse = {
  error?: string;
  message?: string;
  products?: MiaubyProduct[];
  source?: "fallback" | "gemini";
};

const initialMessage: ChatMessage = {
  id: "miauby-welcome",
  role: "assistant",
  text: "Oi! Sou a Miauby. Posso ajudar a encontrar produtos e explicar entrega, retirada e Farmácia Popular.",
};

const quickQuestions = [
  "Quero encontrar um produto",
  "Como funciona a entrega?",
  "Como funciona a Farmácia Popular?",
];

function formatPrice(value: string) {
  const price = Number(value);
  if (!Number.isFinite(price)) return "Consulte";

  return price.toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

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
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const isProductPage = pathname.startsWith("/produto/");

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    const log = logRef.current;
    if (isOpen && log) log.scrollTop = log.scrollHeight;
  }, [isLoading, isOpen, messages]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  if (
    pathname === "/login" ||
    pathname.startsWith("/minha-conta") ||
    pathname.startsWith("/carrinho") ||
    pathname.startsWith("/checkout")
  ) {
    return null;
  }

  async function askMiauby(rawQuestion: string) {
    const question = rawQuestion.trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: question,
    };
    const history = messages.slice(-6).map(({ role, text }) => ({ role, text }));

    setInput("");
    setIsLoading(true);
    setMessages((current) => [...current, userMessage]);

    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 16_000);

    try {
      const response = await fetch("/api/miauby", {
        body: JSON.stringify({ history, message: question }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const payload = (await response.json()) as MiaubyResponse;

      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Resposta indisponivel");
      }
      const reply = payload.message;

      setMessages((current) => [
        ...current,
        {
          id: `miauby-${Date.now()}`,
          products: Array.isArray(payload.products) ? payload.products.slice(0, 4) : [],
          role: "assistant",
          text: reply,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `miauby-error-${Date.now()}`,
          role: "assistant",
          text: "Não consegui responder agora. Você pode tentar novamente ou falar diretamente com a equipe pelo WhatsApp.",
        },
      ]);
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askMiauby(input);
  }

  return (
    <div
      className={`fixed right-3 z-50 flex flex-col items-end gap-2 sm:right-5 sm:gap-3 ${
        isProductPage ? "bottom-24" : "bottom-3 sm:bottom-5"
      }`}
    >
      {isOpen ? (
        <section
          aria-label="Conversa com a Miauby"
          className="absolute bottom-[calc(100%+0.75rem)] right-0 flex max-h-[min(68dvh,34rem)] min-h-[24rem] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-line bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          role="dialog"
        >
          <header className="flex items-center gap-3 border-b border-line bg-[#fff8e8] px-4 py-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#f2c14e]">
              <Image
                alt="Miauby"
                className="h-full w-full object-contain"
                height={88}
                priority={false}
                src="/miauby/miauby-avatar-v2.webp"
                width={88}
              />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-ink">Miauby</h2>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Assistente virtual da Wimifarma
              </p>
            </div>
            <button
              aria-label="Fechar conversa"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              onClick={() => setIsOpen(false)}
              title="Fechar"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            aria-live="polite"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-surface-subtle px-3 py-4"
            ref={logRef}
            role="log"
          >
            {messages.map((message) => (
              <div
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                key={message.id}
              >
                <div className="max-w-[88%]">
                  <p
                    className={`rounded-lg px-3 py-2.5 text-sm leading-5 shadow-sm ${
                      message.role === "user"
                        ? "bg-brand text-white"
                        : "border border-line bg-white text-ink"
                    }`}
                  >
                    {message.text}
                  </p>
                  {message.products?.length ? (
                    <div className="mt-2 grid gap-2">
                      {message.products.map((product) => (
                        <Link
                          className="flex items-center gap-2 rounded-lg border border-line bg-white p-2 text-left shadow-sm transition hover:border-brand/40 hover:bg-brand-soft"
                          href={`/produto/${product.slug}`}
                          key={product.id}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                            {product.imageUrl ? (
                              <Image
                                alt=""
                                className="h-full w-full object-contain"
                                height={72}
                                src={product.imageUrl}
                                width={72}
                              />
                            ) : (
                              <Bot className="h-5 w-5 text-muted" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 block text-xs font-black text-ink">
                              {product.name}
                            </span>
                            <span className="mt-0.5 block text-xs font-bold text-brand">
                              {formatPrice(product.promotionalPrice || product.price)}
                            </span>
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {messages.length === 1 ? (
              <div className="grid gap-2">
                {quickQuestions.map((question) => (
                  <button
                    className="rounded-md border border-brand/20 bg-white px-3 py-2 text-left text-xs font-bold text-brand transition hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    key={question}
                    onClick={() => void askMiauby(question)}
                    type="button"
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin text-brand" />
                Miauby está pensando...
              </div>
            ) : null}
          </div>

          <form className="border-t border-line bg-white p-3" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="miauby-question">
                Pergunte para a Miauby
              </label>
              <input
                className="h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
                disabled={isLoading}
                id="miauby-question"
                maxLength={500}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Pergunte sobre produtos ou entrega"
                ref={inputRef}
                value={input}
              />
              <button
                aria-label="Enviar pergunta"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                disabled={isLoading || !input.trim()}
                title="Enviar"
                type="submit"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-muted">
              Não envie dados pessoais ou receitas. Orientações clínicas são confirmadas com um profissional.
            </p>
          </form>
        </section>
      ) : null}

      <button
        aria-expanded={isOpen}
        aria-label="Conversar com a Miauby"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#fff8e8] shadow-[0_16px_40px_rgba(0,0,0,0.22)] ring-2 ring-[#f2c14e]/60 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:h-16 sm:w-16"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="absolute right-[calc(100%+0.75rem)] hidden whitespace-nowrap rounded-md bg-ink px-3 py-2 text-xs font-bold text-white shadow-lg sm:block">
          Pergunte à Miauby
        </span>
        <span className="relative h-12 w-12 overflow-hidden rounded-full sm:h-14 sm:w-14">
          <Image
            alt=""
            className="h-full w-full object-contain"
            height={112}
            src="/miauby/miauby-avatar-v2.webp"
            width={112}
          />
        </span>
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow-md">
          <Bot className="h-3.5 w-3.5" />
        </span>
      </button>

      <a
        aria-label="Chamar Wimifarma no WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition hover:scale-105 hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-16 sm:w-16"
        href={siteConfig.whatsappUrl}
        rel="noreferrer"
        target="_blank"
      >
        <WhatsAppLogo />
      </a>
    </div>
  );
}
