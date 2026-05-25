"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SiteNavItem = {
  href: string;
  label: string;
};

export function SiteNav({ items }: { items: SiteNavItem[] }) {
  const pathname = usePathname() || "/";

  return (
    <nav className="hidden border-t border-line bg-white lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-8 py-2.5">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 font-body text-sm font-bold text-ink transition duration-300 hover:-translate-y-0.5 hover:bg-brand-soft hover:text-brand",
                isActive &&
                  "bg-brand text-white shadow-[0_10px_24px_rgba(200,16,46,0.18)] hover:bg-brand hover:text-white",
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
