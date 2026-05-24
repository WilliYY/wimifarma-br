import Link from "next/link";
import Image from "next/image";
import { LogIn, LogOut, MessageCircle, Search, UserRound } from "lucide-react";
import { auth, signOut } from "@/features/auth/auth";
import { publicNavItems, siteConfig } from "@/lib/site";

export async function SiteHeader() {
  const session = await auth();
  const displayName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "Cliente";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-white/96 shadow-[0_10px_30px_rgba(17,24,39,0.08)] backdrop-blur-md">
      <div className="bg-brand px-4 py-1.5 font-body text-xs font-semibold text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 overflow-hidden">
          <span aria-hidden="true" className="delivery-truck-lane">
            <Image
              alt=""
              className="delivery-truck-run h-7 w-9 object-contain"
              height={28}
              src="/brand/delivery-truck.gif"
              unoptimized
              width={34}
            />
          </span>
          <span className="delivery-pull-copy inline-block whitespace-nowrap sm:hidden">
            Pedidos pelo WhatsApp em Ivate
          </span>
          <span className="delivery-pull-copy hidden whitespace-nowrap sm:inline-block">
            Atendimento local em Ivate: cuidado e pedidos pelo WhatsApp
          </span>
        </div>
      </div>

      <div className="relative flex items-center gap-2 bg-[#121820] px-4 py-1.5 sm:gap-3 sm:px-6 lg:gap-4 lg:px-8">
        <Link
          aria-label="Wimifarma"
          className="flex h-20 w-56 shrink-0 items-center justify-start overflow-hidden sm:h-24 sm:w-80 lg:w-[18rem] xl:w-80"
          href="/"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="h-full w-full origin-left scale-[1.2] object-contain object-left"
            height={96}
            priority
            src="/brand/logo-animada.gif"
            unoptimized
            width={384}
          />
        </Link>

        <Link
          aria-label="Farmacia Popular"
          className="hidden h-20 w-20 shrink-0 items-center justify-center overflow-hidden lg:flex xl:h-[5.5rem] xl:w-[5.5rem]"
          href="/farmacia-popular"
        >
          <Image
            alt="Aqui tem Farmacia Popular"
            className="h-full w-full object-contain"
            height={320}
            priority
            src="/brand/farmacia-popular.webp"
            width={320}
          />
        </Link>

        <div className="ml-3 flex items-center gap-2 md:hidden">
          {session?.user ? (
            <>
              <Link
                aria-label="Abrir minha conta"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:border-brand hover:text-brand"
                href="/minha-conta"
                title={displayName}
              >
                <UserRound className="h-4 w-4 text-brand" />
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  aria-label="Sair"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:border-brand hover:text-brand"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <Link
              aria-label="Login ou cadastro"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:border-brand hover:text-brand"
              href="/login"
            >
              <LogIn className="h-4 w-4" />
            </Link>
          )}
        </div>

        <form
          action="/ofertas"
          className="mx-auto hidden h-14 w-full max-w-3xl flex-1 items-center gap-3 rounded-full border border-line bg-white py-1.5 pl-4 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_28px_rgba(17,24,39,0.06)] md:flex"
        >
          <Search className="h-5 w-5 shrink-0 text-[#5f6f88]" />
          <input
            aria-label="Buscar produtos e servicos"
            className="h-full min-w-0 flex-1 bg-transparent font-body text-base text-ink outline-none placeholder:text-[#70809a]"
            name="q"
            placeholder="Buscar produtos e servicos"
            type="search"
          />
          <button
            className="soft-breathe flex h-11 items-center rounded-full bg-brand px-7 font-body text-sm font-bold text-white shadow-[0_10px_24px_rgba(200,16,46,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-strong"
            type="submit"
          >
            Buscar
          </button>
        </form>

        <div className="ml-auto hidden min-w-0 shrink-0 justify-end md:flex">
          <a
            className="soft-breathe hidden items-center gap-2 rounded-full bg-[#25d366] px-5 py-3 font-body text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,211,102,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1ebe57] lg:inline-flex"
            href={siteConfig.whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp
            <MessageCircle className="h-4 w-4" />
          </a>
          {session?.user ? (
            <div className="ml-2 flex min-w-0 items-center gap-2">
              <Link
                aria-label="Abrir minha conta"
                className="inline-flex h-11 w-11 min-w-0 items-center justify-center rounded-full border border-line bg-white font-body text-sm font-bold text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand sm:h-auto sm:w-auto sm:max-w-[11rem] sm:justify-start sm:gap-2 sm:px-4 sm:py-3 lg:max-w-[13rem]"
                href="/minha-conta"
                title={displayName}
              >
                <UserRound className="h-4 w-4 shrink-0 text-brand" />
                <span className="hidden truncate sm:inline">{displayName}</span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  aria-label="Sair"
                  className="inline-flex h-11 w-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-white font-body text-sm font-bold text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
                  type="submit"
                >
                  <span className="hidden sm:inline">Sair</span>
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : (
            <Link
              aria-label="Login ou cadastro"
              className="ml-2 inline-flex h-11 w-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-white font-body text-sm font-bold text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
              href="/login"
            >
              <span className="hidden sm:inline">Login / Cadastrar</span>
              <LogIn className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <nav className="hidden border-t border-line bg-white lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-8 py-2.5">
          {[{ href: "/", label: "Home" }, ...publicNavItems].map((item) => (
            <Link
              className="rounded-full px-4 py-2 font-body text-sm font-bold text-ink transition duration-300 hover:-translate-y-0.5 hover:bg-brand-soft hover:text-brand"
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
