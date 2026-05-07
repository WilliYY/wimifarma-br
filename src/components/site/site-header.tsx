import Link from "next/link";
import { Menu, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicNavItems, siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-lg font-black text-white">
            W
          </span>
          <span className="leading-tight">
            <span className="block text-base font-black text-ink">
              Wimifarma
            </span>
            <span className="block text-xs font-semibold text-muted">
              Ivate-PR
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {publicNavItems.map((item) => (
            <Link
              className="text-sm font-semibold text-muted transition hover:text-brand"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex" size="sm">
            <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
          <Button
            aria-label="Abrir menu"
            className="lg:hidden"
            size="icon"
            type="button"
            variant="secondary"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
