import Link from "next/link";
import Image from "next/image";
import {
  LogIn,
  LogOut,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { auth, signOut } from "@/features/auth/auth";
import { SiteNav } from "@/components/site/site-nav";
import { SiteSearch } from "@/components/site/site-search";
import { CartHeaderButton } from "@/components/site/cart-header-button";
import { publicNavItems, siteConfig } from "@/lib/site";

function getCompactAccountName(displayName: string, role?: string) {
  const roleLabels: Record<string, string> = {
    ADMIN: "Admin",
    MANAGER: "Gerente",
    STAFF: "Equipe",
  };

  if (role && roleLabels[role]) {
    return roleLabels[role];
  }

  const firstName = displayName.trim().split(/\s+/)[0];

  if (!firstName) {
    return "Cliente";
  }

  return firstName.length > 16 ? `${firstName.slice(0, 13)}...` : firstName;
}

export async function SiteHeader() {
  const session = await auth();
  const displayName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "Cliente";
  const compactDisplayName = getCompactAccountName(
    displayName,
    session?.user?.role,
  );
  const userImage = session?.user?.image;

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
              width={36}
            />
          </span>
          <span className="delivery-pull-copy inline-block whitespace-nowrap sm:hidden">
            Frete grátis em Ivaté-PR
          </span>
          <span className="delivery-pull-copy hidden whitespace-nowrap sm:inline-block">
            Frete grátis em Ivaté-PR / Frete grátis acima de 99,90 em todo Brasil
          </span>
        </div>
      </div>

      <div className="relative flex items-center gap-2 bg-[#121820] px-4 py-1.5 sm:gap-3 sm:px-6 lg:gap-4 lg:px-8">
        <Link
          aria-label="Wimifarma"
          className="relative flex h-20 w-40 shrink-0 items-center justify-start overflow-hidden sm:h-24 sm:w-64 xl:w-72"
          href="/"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="object-contain object-left"
            fill
            priority
            sizes="(min-width: 1280px) 288px, (min-width: 640px) 256px, 224px"
            src="/brand/logo-animada.svg"
            unoptimized
          />
        </Link>

        <Link
          aria-label="Farmacia Popular"
          className="hidden h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden xl:flex"
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

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <CartHeaderButton />
          {session?.user ? (
            <>
              <Link
                aria-label="Abrir minha conta"
                className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-line bg-white text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:border-brand hover:text-brand"
                href="/minha-conta"
                title={displayName}
              >
                {userImage ? (
                  <Image
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                    height={32}
                    referrerPolicy="no-referrer"
                    src={userImage}
                    unoptimized
                    width={32}
                  />
                ) : (
                  <UserRound className="h-4 w-4 text-brand" />
                )}
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

        <SiteSearch />

        <div className="ml-auto hidden min-w-0 shrink-0 justify-end md:flex">
          <a
            aria-label="Abrir localizacao da Wimifarma no Google Maps"
            className="soft-breathe mr-2 hidden min-h-14 max-w-[15.75rem] items-center gap-3 rounded-full border border-white/80 bg-white px-3.5 py-2 font-body text-xs font-black text-ink shadow-[0_14px_34px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-[#fff7f8] hover:text-brand 2xl:inline-flex"
            href={siteConfig.mapsUrl}
            rel="noreferrer"
            target="_blank"
            title={siteConfig.address}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_6px_18px_rgba(17,24,39,0.12)] ring-1 ring-line">
              <Image
                alt=""
                aria-hidden="true"
                className="h-8 w-8 object-contain"
                height={32}
                src="/brand/maps-pin-icon.svg"
                width={32}
              />
            </span>
            <span className="flex min-w-0 flex-col leading-tight text-left">
              <span className="text-[0.68rem] uppercase tracking-[0.12em] text-brand">
                Como chegar
              </span>
              <span className="truncate text-[0.8rem] text-ink">
                Av. Minas Gerais, 2263
              </span>
            </span>
          </a>
          <a
            aria-label="Falar com a Wimifarma pelo WhatsApp"
            className="soft-breathe hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#22d365_0%,#14b85a_52%,#0f9f4f_100%)] font-body text-sm font-black text-white shadow-[0_16px_36px_rgba(34,211,101,0.28),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-white/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(34,211,101,0.34),inset_0_1px_0_rgba(255,255,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ff0be] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121820] lg:inline-flex xl:w-auto xl:gap-3 xl:px-5"
            href={siteConfig.whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <span className="hidden xl:inline">WhatsApp</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/30">
              <MessageCircle className="h-4 w-4 stroke-[2.6]" />
            </span>
          </a>
          <CartHeaderButton />
          {session?.user ? (
            <div className="ml-2 flex min-w-0 items-center gap-2">
              <Link
                aria-label={`Abrir conta de ${displayName}`}
                className="inline-flex h-11 min-w-0 max-w-[9rem] items-center justify-start gap-2 rounded-full border border-line bg-white py-2 pl-2 pr-3 font-body text-sm font-bold text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand xl:max-w-[11rem] xl:pr-4"
                href="/minha-conta"
                title={displayName}
              >
                {userImage ? (
                  <Image
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-brand/12"
                    height={32}
                    referrerPolicy="no-referrer"
                    src={userImage}
                    unoptimized
                    width={32}
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                    <UserRound className="h-4 w-4 text-brand" />
                  </span>
                )}
                <span className="min-w-0 truncate">{compactDisplayName}</span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  aria-label="Sair"
                  className="inline-flex h-11 w-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-white font-body text-sm font-bold text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand xl:w-auto xl:gap-2 xl:px-5"
                  type="submit"
                >
                  <span className="hidden xl:inline">Sair</span>
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : (
            <Link
              aria-label="Login ou cadastro"
              className="ml-2 inline-flex h-11 w-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-white font-body text-sm font-bold text-ink shadow-[0_10px_24px_rgba(17,24,39,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand xl:w-auto xl:gap-2 xl:px-5"
              href="/login"
            >
              <span className="hidden xl:inline">Login / Cadastrar</span>
              <LogIn className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <SiteNav items={[{ href: "/", label: "Home" }, ...publicNavItems]} />
    </header>
  );
}
