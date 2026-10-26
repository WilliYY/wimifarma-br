"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type SiteHeaderShellProps = {
  announcement: ReactNode;
  children: ReactNode;
  navigation: ReactNode;
};

export function SiteHeaderShell({ announcement, children, navigation }: SiteHeaderShellProps) {
  const headerRef = useRef<HTMLElement>(null);
  const compactRef = useRef(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const root = document.documentElement;
    const previousOffset = root.style.getPropertyValue("--site-header-offset");
    let frame = 0;
    let lastHeight = 0;

    function refresh() {
      frame = 0;
      const focusedControl = header!.contains(document.activeElement)
        && document.activeElement?.closest("[data-header-collapsible], [data-header-popular], [data-header-maps]");
      const next = window.scrollY <= 8 ? false : window.scrollY > 72 && !focusedControl ? true : compactRef.current;
      if (next !== compactRef.current) {
        compactRef.current = next;
        setCompact(next);
      }
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(refresh);
    }

    const observer = new ResizeObserver(([entry]) => {
      const height = Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height) + 16;
      if (height !== lastHeight) {
        lastHeight = height;
        root.style.setProperty("--site-header-offset", `${height}px`);
      }
    });
    observer.observe(header);
    window.addEventListener("scroll", schedule, { passive: true });
    header.addEventListener("focusin", schedule);
    header.addEventListener("focusout", schedule);
    refresh();

    return () => {
      window.removeEventListener("scroll", schedule);
      header.removeEventListener("focusin", schedule);
      header.removeEventListener("focusout", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      if (previousOffset) root.style.setProperty("--site-header-offset", previousOffset);
      else root.style.removeProperty("--site-header-offset");
    };
  }, []);

  return (
    <header ref={headerRef} data-compact={compact} className="site-header fixed inset-x-0 top-0 z-50 border-b border-line bg-white/96 shadow-[0_10px_30px_rgba(17,24,39,0.08)] backdrop-blur-md">
      <div className="site-header-band" data-header-collapsible inert={compact} aria-hidden={compact || undefined}>
        <div>{announcement}</div>
      </div>
      {children}
      <div className="site-header-band" data-header-collapsible inert={compact} aria-hidden={compact || undefined}>
        <div>{navigation}</div>
      </div>
    </header>
  );
}
