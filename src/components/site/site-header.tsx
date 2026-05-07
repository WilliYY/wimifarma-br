import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Menu } from "lucide-react";
import { publicNavItems, siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:px-8 lg:px-16">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <Link
          aria-label="Wimifarma BR"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_24px_rgba(0,0,0,0.18)]"
          href="/"
        >
          <Image
            alt="Wimifarma"
            className="h-full w-full object-contain"
            height={32}
            priority
            src="/brand/logo-wimifarma.svg"
            width={32}
          />
        </Link>

        <nav className="liquid-glass hidden items-center gap-1 rounded-full px-1.5 py-1.5 lg:flex">
          {[{ href: "/", label: "Home" }, ...publicNavItems.slice(0, 4)].map((item) => (
            <Link
              className="rounded-full px-3 py-2 font-body text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <a
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 font-body text-sm font-semibold text-black"
            href={siteConfig.whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            Chamar no WhatsApp
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </nav>

        <div className="flex h-12 w-12 items-center justify-center">
          <button
            aria-label="Abrir menu"
            className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full text-white lg:hidden"
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
