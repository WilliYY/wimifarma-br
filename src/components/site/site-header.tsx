import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { publicNavItems } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-4 sm:px-8 lg:px-16">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3">
        <Link
          aria-label="Wimifarma"
          className="flex h-14 w-32 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_24px_rgba(0,0,0,0.18)] xl:h-16 xl:w-40"
          href="/"
        >
          <Image
            alt="Wimifarma"
            className="h-full w-full scale-[1.65] object-contain"
            height={48}
            priority
            src="/brand/logo-wimifarma.svg"
            width={48}
          />
        </Link>

        <nav className="liquid-glass mx-auto hidden max-w-full items-center gap-1 rounded-full px-1.5 py-1.5 xl:flex">
          {[{ href: "/", label: "Home" }, ...publicNavItems].map((item) => (
            <Link
              className="rounded-full px-3 py-2 font-body text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          className="justify-self-end inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-body text-sm font-semibold text-black shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition hover:bg-white/90"
          href="/admin/login"
        >
          Login
          <LogIn className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
