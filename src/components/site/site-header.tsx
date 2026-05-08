import Link from "next/link";
import Image from "next/image";
import { LogIn, MessageCircle, Search } from "lucide-react";
import { publicNavItems, siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-white/96 shadow-[0_10px_30px_rgba(17,24,39,0.08)] backdrop-blur-md">
      <div className="bg-brand px-4 py-2 text-center font-body text-xs font-semibold text-white">
        Atendimento local em Ivate: ofertas, delivery e pedidos pelo WhatsApp
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          aria-label="Wimifarma"
          className="flex h-12 w-36 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.08),0_8px_24px_rgba(0,0,0,0.08)] sm:h-14 sm:w-44"
          href="/"
        >
          <Image
            alt="Wimifarma"
            className="h-full w-full scale-[2.25] object-contain"
            height={48}
            priority
            src="/brand/logo-wimifarma.svg"
            width={48}
          />
        </Link>

        <form
          action="/ofertas"
          className="mx-auto hidden h-12 w-full max-w-2xl items-center gap-3 rounded-full border border-line bg-surface-subtle px-4 md:flex"
        >
          <Search className="h-5 w-5 shrink-0 text-muted" />
          <input
            aria-label="Buscar produtos e ofertas"
            className="h-full min-w-0 flex-1 bg-transparent font-body text-sm text-ink outline-none placeholder:text-muted"
            name="q"
            placeholder="Buscar ofertas, produtos e servicos"
            type="search"
          />
          <button
            className="rounded-full bg-brand px-4 py-2 font-body text-xs font-bold text-white transition hover:bg-brand-strong"
            type="submit"
          >
            Buscar
          </button>
        </form>

        <div className="flex justify-self-end">
          <a
            className="hidden items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 font-body text-sm font-bold text-white shadow-sm transition hover:bg-[#1ebe57] lg:inline-flex"
            href={siteConfig.whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp
            <MessageCircle className="h-4 w-4" />
          </a>
          <Link
            className="ml-2 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 font-body text-sm font-bold text-ink shadow-sm transition hover:border-brand hover:text-brand"
            href="/admin/login"
          >
            Login
            <LogIn className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <nav className="hidden border-t border-line bg-white lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-8 py-2">
          {[{ href: "/", label: "Home" }, ...publicNavItems].map((item) => (
            <Link
              className="rounded-full px-4 py-2 font-body text-sm font-bold text-ink transition hover:bg-brand-soft hover:text-brand"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
