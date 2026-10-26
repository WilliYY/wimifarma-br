"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function FooterBubbles({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let nearby = false;
    const update = () => setActive(nearby && !document.hidden);
    // Warm the original effect before its tallest bubbles enter the viewport.
    const observer = new IntersectionObserver(entries => {
      nearby = entries[0]?.isIntersecting ?? false;
      update();
    }, { rootMargin: "200px 0px" });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return <div aria-hidden="true" className="site-gooey-footer__bubbles" data-animating={active} ref={ref}>{children}</div>;
}
