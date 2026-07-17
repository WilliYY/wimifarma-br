"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";
import { siteConfig } from "@/lib/site";

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
  const pathname = usePathname();
  const news = miaubyNews[0];

  if (pathname === "/login" || pathname.startsWith("/minha-conta")) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-5 sm:right-5 sm:gap-3">
      <div
        aria-label="Miauby"
        className="group relative hidden h-16 w-16 cursor-default items-center justify-center rounded-full bg-white shadow-[0_16px_40px_rgba(0,0,0,0.22)] ring-2 ring-brand/15 sm:flex"
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
      </div>

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
