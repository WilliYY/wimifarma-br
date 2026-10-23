"use client";

import { productImageAlt } from "@/features/products/image-placeholder";

import Image from "next/image";
import { ProductImagePlaceholder } from "@/components/site/product-image-placeholder";
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
import type { Session } from "next-auth";
import { claimMiaubyNotice, miaubyRouteTip, safeMiaubyFirstName } from "@/features/miauby/greetings";

type MiaubyProduct = {
  catalogClassification?: unknown;
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
  source?: "local" | "catalog" | "fallback" | "gemini";
};

const initialMessage: ChatMessage = {
  id: "miauby-welcome",
  role: "assistant",
  text: "Oi! Sou a Miauby. Posso ajudar a encontrar produtos e explicar entrega, retirada e Farmácia Popular.",
};

const quickQuestions = [
  "Consultar preço de um produto",
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

type MiaubyViewer = { key: string; name: string } | null;

export function FloatingWhatsApp({ viewer = null }: { viewer?: MiaubyViewer }) {
  return <SynchronizedMiauby key={viewer?.key ?? "anonymous"} viewer={viewer} />;
}

function SynchronizedMiauby({ viewer }: { viewer: MiaubyViewer }) {
  const [currentViewer, setCurrentViewer] = useState(viewer);
  const [sessionReady, setSessionReady] = useState(true);
  const [conversationVersion, setConversationVersion] = useState(0);

  useEffect(() => {
    setCurrentViewer(viewer);
    setSessionReady(true);
    let refreshTimer: number | undefined;
    let deadlineTimer: number | undefined;
    let synchronization = 0;
    // Auth.js v5 uses this channel for session changes in other tabs.
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("next-auth");
    const suspendConversation = () => {
      synchronization++;
      setSessionReady(false);
      window.clearTimeout(refreshTimer);
      window.clearTimeout(deadlineTimer);
    };
    const discardConversation = () => {
      setCurrentViewer(null);
      setConversationVersion(current => current + 1);
    };
    const revalidate = () => {
      suspendConversation();
      if (document.visibilityState !== "visible") return;
      const version = synchronization;
      // Coalesce focus/visibility/pageshow events from one return to the tab.
      refreshTimer = window.setTimeout(async () => {
        deadlineTimer = window.setTimeout(() => {
          if (synchronization !== version) return;
          synchronization++;
          discardConversation();
          setSessionReady(true);
        }, 5_000);
        try {
          // Read the standard Auth.js endpoint directly: getSession() collapses
          // network failures and anonymous sessions into null, losing that distinction.
          const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
          if (!response.ok) throw new Error("Sessão indisponível");
          const session = await response.json() as Session | null;
          const id = session?.user?.id;
          let freshViewer: MiaubyViewer = null;
          if (id && session.expires && Date.parse(session.expires) > Date.now()) {
            const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`miauby:${id}`));
            freshViewer = {
              key: Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("").slice(0, 24),
              name: safeMiaubyFirstName(session.user.name) ?? "",
            };
          }
          if (synchronization !== version) return;
          if (!freshViewer && session !== null) discardConversation();
          setCurrentViewer(freshViewer);
          setSessionReady(true);
        } catch {
          if (synchronization === version) {
            discardConversation();
            setSessionReady(true);
          }
        } finally {
          if (synchronization === version) window.clearTimeout(deadlineTimer);
        }
      }, 80);
    };
    const sessionChanged = (event: MessageEvent) => {
      if (event.data?.event === "session") {
        discardConversation();
        revalidate();
      }
    };
    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    window.addEventListener("pageshow", revalidate);
    window.addEventListener("pagehide", suspendConversation);
    channel?.addEventListener("message", sessionChanged);
    return () => {
      synchronization++;
      window.clearTimeout(refreshTimer);
      window.clearTimeout(deadlineTimer);
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("pageshow", revalidate);
      window.removeEventListener("pagehide", suspendConversation);
      channel?.close();
    };
  }, [viewer]); // Only the minimal server identity crosses this boundary.

  // Suspend before fetching so old names, drafts and replies cannot flash on return.
  return <div hidden={!sessionReady} inert={!sessionReady}><FloatingMiauby active={sessionReady} key={`${currentViewer?.key ?? "anonymous"}:${conversationVersion}`} viewer={currentViewer} /></div>;
}

function FloatingMiauby({ viewer, active }: { viewer: MiaubyViewer; active: boolean }) {
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [purchasePosition, setPurchasePosition] = useState<"before" | "visible" | "after">("before");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(false);
  const attemptedNotices = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestTimeoutRef = useRef<number | undefined>(undefined);
  const isProductPage = pathname.startsWith("/produto/");
  const isHiddenRoute = pathname === "/login" || pathname.startsWith("/minha-conta") || pathname.startsWith("/carrinho") || pathname.startsWith("/checkout");

  useEffect(() => {
    if (active) return;
    requestRef.current?.abort();
    requestRef.current = null;
    window.clearTimeout(requestTimeoutRef.current);
    setIsLoading(false);
    setNotice(null);
  }, [active]);

  useEffect(() => {
    const updateVisibility = () => {
      setIsTabVisible(document.visibilityState === "visible");
      if (document.visibilityState !== "visible") setNotice(null);
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    setNotice(null);
    if (!active || isOpen || isHiddenRoute || !isTabVisible) return;
    const identity = viewer?.key ?? "anonymous";
    const name = safeMiaubyFirstName(viewer?.name);
    const welcome = { key: "welcome", text: name ? `Bem-vindo, ${name}! Sou a Miauby. Posso ajudar?` : "Bem-vindo! Sou a Miauby. Posso ajudar?" };
    const candidates = [welcome, miaubyRouteTip(pathname)].filter((candidate) => candidate !== null);
    let hideTimer: number | undefined;
    const showTimer = window.setTimeout(() => {
      for (const candidate of candidates) {
        if (attemptedNotices.current.has(candidate.key)) continue;
        attemptedNotices.current.add(candidate.key);
        try {
          if (!claimMiaubyNotice(window.sessionStorage, identity, candidate.key)) continue;
        } catch { continue; }
        setNotice(candidate.text);
        hideTimer = window.setTimeout(() => setNotice(null), 7_000);
        break;
      }
    }, 1_200);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, [active, isHiddenRoute, isOpen, isTabVisible, pathname, viewer?.key, viewer?.name]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    setPurchasePosition("before");
    if (!isProductPage || !("IntersectionObserver" in window)) return;
    let active = true;
    let observer: IntersectionObserver | null = null;
    // Route content can arrive after the persistent site layout has mounted.
    const pendingContent = new MutationObserver(connectPurchasePanel);
    function connectPurchasePanel() {
      const panel = document.querySelector("[data-product-purchase-panel]");
      if (!panel || observer) return;
      pendingContent.disconnect();
      observer = new IntersectionObserver(([entry]) => {
        if (active) setPurchasePosition(entry.isIntersecting ? "visible" : entry.boundingClientRect.bottom <= 0 ? "after" : "before");
      });
      observer.observe(panel);
    }
    connectPurchasePanel();
    if (!observer) pendingContent.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => { active = false; pendingContent.disconnect(); observer?.disconnect(); };
  }, [isProductPage, pathname]);

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
      requestRef.current = null;
      window.clearTimeout(requestTimeoutRef.current);
    },
    [],
  );

  if (isHiddenRoute) {
    return null;
  }

  async function askMiauby(rawQuestion: string) {
    const question = rawQuestion.trim();
    if (!active || !question || isLoading || requestRef.current) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: question,
    };
    const history = messages.slice(-6).map(({ role, text }) => ({ role, text }));

    setInput("");
    setIsLoading(true);
    setMessages((current) => [...current, userMessage].slice(-20));

    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 16_000);
    requestTimeoutRef.current = timeout;

    try {
      const response = await fetch("/api/miauby", {
        body: JSON.stringify({ history, message: question }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const payload = (await response.json()) as MiaubyResponse;
      if (requestRef.current !== controller) return;

      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Resposta indisponivel");
      }
      const reply = payload.message;

      setMessages((current) => ([
        ...current,
        {
          id: `miauby-${Date.now()}`,
          products: Array.isArray(payload.products) ? payload.products.slice(0, 4) : [],
          role: "assistant",
          text: reply,
        },
      ] satisfies ChatMessage[]).slice(-20));
    } catch {
      if (requestRef.current !== controller) return;
      setMessages((current) => ([
        ...current,
        {
          id: `miauby-error-${Date.now()}`,
          role: "assistant",
          text: "Não consegui responder agora. Você pode tentar novamente ou falar diretamente com a equipe pelo WhatsApp.",
        },
      ] satisfies ChatMessage[]).slice(-20));
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        requestTimeoutRef.current = undefined;
        setIsLoading(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askMiauby(input);
  }

  return (
    <div
      className={`fixed right-3 z-50 flex-row items-end gap-2 sm:right-5 sm:flex-col sm:gap-3 ${isProductPage && purchasePosition === "visible" && !isOpen ? "hidden sm:flex" : "flex"} ${
        isProductPage && purchasePosition === "after" && !isOpen ? "bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:bottom-24" : isProductPage ? "bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-24" : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-5"
      }`}
    >
      {notice && !isOpen ? (
        <aside aria-label="Dica da Miauby" className="absolute bottom-[calc(100%+0.75rem)] right-0 flex w-[min(18rem,calc(100vw-1.5rem))] items-start gap-1 rounded-lg border border-[#f2c14e]/60 bg-[#fff8e8] p-3 text-sm text-ink shadow-lg sm:right-20 sm:bottom-auto sm:top-0">
          <p aria-live="polite" className="min-w-0 flex-1 py-1">{notice}</p>
          <button aria-label="Ocultar dica da Miauby" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => setNotice(null)} type="button"><X className="h-4 w-4" /></button>
        </aside>
      ) : null}
      {isOpen ? (
        <section
          aria-label="Conversa com a Miauby"
          className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] top-[max(0.75rem,env(safe-area-inset-top))] flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:absolute sm:inset-x-auto sm:bottom-[calc(100%+0.75rem)] sm:right-0 sm:top-auto sm:max-h-[min(68dvh,34rem)] sm:min-h-[24rem] sm:w-[min(23rem,calc(100vw-1.5rem))]"
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
                src="/brand/miauby-avatar.webp"
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              onClick={() => setIsOpen(false)}
              title="Fechar"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <a
            className="flex min-h-11 shrink-0 items-center justify-center gap-2 border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 sm:hidden"
            href={siteConfig.whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <WhatsAppLogo />
            Falar com a equipe no WhatsApp
          </a>

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
                                alt={productImageAlt(product.name, product.imageUrl)}
                                className="h-full w-full object-contain"
                                height={72}
                                src={product.imageUrl}
                                width={72}
                              />
                            ) : (
                              <ProductImagePlaceholder catalogClassification={product.catalogClassification} category={product.category} requiresPrescription={product.requiresPrescription} isPopularPharmacy={product.isPopularPharmacy} className="h-full w-full" />
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
                Consultando a Miauby...
              </div>
            ) : null}
          </div>

          <form className="border-t border-line bg-white p-3" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="miauby-question">
                Pergunte para a Miauby
              </label>
              <input
                className="h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-base text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15 sm:text-sm"
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
        className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-[#fff8e8] shadow-[0_16px_40px_rgba(0,0,0,0.22)] ring-2 ring-[#f2c14e]/60 transition hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:h-16 sm:w-16"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="absolute right-[calc(100%+0.75rem)] hidden whitespace-nowrap rounded-md bg-ink px-3 py-2 text-xs font-bold text-white shadow-lg sm:group-hover:block sm:group-focus-visible:block">
          Pergunte à Miauby
        </span>
        <span className="relative h-9 w-9 overflow-hidden rounded-full sm:h-14 sm:w-14">
          <Image
            alt=""
            className="h-full w-full object-contain"
            height={112}
            src="/brand/miauby-avatar.webp"
            width={112}
          />
        </span>
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white shadow-md sm:h-6 sm:w-6">
          <Bot className="h-3.5 w-3.5" />
        </span>
      </button>

      <a
        aria-label="Chamar Wimifarma no WhatsApp"
        className="hidden h-11 w-11 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition hover:scale-105 hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:flex sm:h-16 sm:w-16"
        href={siteConfig.whatsappUrl}
        rel="noreferrer"
        target="_blank"
      >
        <WhatsAppLogo />
      </a>
    </div>
  );
}
