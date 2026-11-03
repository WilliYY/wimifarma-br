"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { readShoppingContext, shoppingListHref, SHOPPING_CONTEXT_KEY, SHOPPING_RETURN_KEY } from "@/features/products/shopping-context";

function storedContext() {
  try { return readShoppingContext(sessionStorage.getItem(SHOPPING_CONTEXT_KEY)); } catch { return null; }
}

export function ShoppingNavigationTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    try {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const internal = document.referrer && new URL(document.referrer).origin === location.origin;
      if (navigation?.type === "navigate" && internal && sessionStorage.getItem(SHOPPING_CONTEXT_KEY) === null) {
        const source = new URL(document.referrer);
        const href = shoppingListHref(source.pathname + source.search);
        // Modern noopener tabs do not inherit sessionStorage; their same-origin referrer still identifies the list.
        if (href) sessionStorage.setItem(SHOPPING_CONTEXT_KEY, JSON.stringify({ href, scrollY: 0, savedAt: Date.now() }));
      }
      if (navigation?.type === "navigate" && !internal && !shoppingListHref(location.pathname + location.search)) {
        sessionStorage.removeItem(SHOPPING_CONTEXT_KEY);
        sessionStorage.removeItem(SHOPPING_RETURN_KEY);
      }
    } catch { /* Storage is optional. */ }
  }, []);

  useEffect(() => {
    const href = shoppingListHref(location.pathname + location.search);
    if (!href) {
      // A new visit to account/home or another module must not reuse an old list.
      if (!/^\/(produto\/[^/]+|carrinho|checkout(?:\/.*)?)$/.test(pathname)) {
        try { sessionStorage.removeItem(SHOPPING_CONTEXT_KEY); sessionStorage.removeItem(SHOPPING_RETURN_KEY); } catch { /* Optional. */ }
      }
      return;
    }
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let restoring = false;
    const save = () => {
      if (restoring || location.pathname + location.search !== href) return;
      try { sessionStorage.setItem(SHOPPING_CONTEXT_KEY, JSON.stringify({ href, scrollY: window.scrollY, savedAt: Date.now() })); } catch { /* Optional. */ }
    };
    const finish = () => { restoring = false; observer?.disconnect(); cancelAnimationFrame(frame); if (timer) clearTimeout(timer); save(); };
    try {
      const pending = readShoppingContext(sessionStorage.getItem(SHOPPING_RETURN_KEY));
      sessionStorage.removeItem(SHOPPING_RETURN_KEY);
      if (pending?.href === href && Date.now() - pending.savedAt < 10_000) {
        restoring = true;
        const restore = () => {
          window.scrollTo({ top: pending.scrollY, behavior: "instant" });
          if (Math.abs(window.scrollY - pending.scrollY) < 2) finish();
        };
        frame = requestAnimationFrame(() => { frame = requestAnimationFrame(restore); });
        observer = new ResizeObserver(restore);
        observer.observe(document.body);
        timer = setTimeout(finish, 2000);
      }
    } catch { /* A blocked storage must not interrupt navigation. */ }
    save();
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("click", save, true);
    window.addEventListener("wheel", finish, { passive: true, once: true });
    window.addEventListener("touchstart", finish, { passive: true, once: true });
    window.addEventListener("keydown", finish, { once: true });
    return () => {
      observer?.disconnect(); cancelAnimationFrame(frame); if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", save); window.removeEventListener("pagehide", save);
      document.removeEventListener("click", save, true);
      window.removeEventListener("wheel", finish); window.removeEventListener("touchstart", finish); window.removeEventListener("keydown", finish);
    };
  }, [pathname, search]);
  return null;
}

export function ContinueShoppingLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const router = useRouter();
  const [href, setHref] = useState("/catalogo");
  useEffect(() => { setHref(storedContext()?.href ?? "/catalogo"); }, []);
  return <Link {...props} href={href} scroll={href === "/catalogo" ? undefined : false} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const context = storedContext();
    if (!context && href !== "/catalogo") { event.preventDefault(); router.push("/catalogo"); return; }
    try {
      if (context?.href === href) sessionStorage.setItem(SHOPPING_RETURN_KEY, JSON.stringify({ ...context, savedAt: Date.now() }));
      else sessionStorage.removeItem(SHOPPING_RETURN_KEY);
    } catch { /* Navigate normally without storage. */ }
  }} />;
}
