"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { PIX_DISCOUNT_PERCENT } from "@/features/payments/pix-discount";
import styles from "./pix-discount-banner.module.css";

export function PixDiscountBanner() {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    let inView = false;
    const updateVisibility = () => {
      card.dataset.motion = inView && !document.hidden ? "active" : "paused";
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateVisibility();
    });
    observer.observe(card);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return (
    <section aria-labelledby="pix-discount-title" className={styles.section}>
      <div className={styles.card} data-motion="paused" ref={cardRef}>
        <div aria-hidden="true" className={styles.art}>
          <span className={styles.diamond} />
          <span className={styles.diamondSmall} />
          <span className={styles.pixMark}>
            <Image alt="" src="/payments/pix-symbol.svg" width={48} height={48} />
          </span>
        </div>
        <span aria-hidden="true" className={styles.sheen} />
        <span className={styles.brand}>
          <Image alt="Wimifarma" src="/brand/logo-wimifarma.svg" width={724} height={171} className={styles.logo} />
        </span>
        <div className={styles.offer}>
          <h2 aria-label={`${PIX_DISCOUNT_PERCENT}% de desconto no Pix`} className={styles.title} id="pix-discount-title">
            <span className={styles.amount}>{PIX_DISCOUNT_PERCENT}<span>%</span></span>
            <span className={styles.message}><span className={styles.off}>OFF</span><span className={styles.method}>no Pix<span className={styles.period}>.</span></span></span>
          </h2>
          <p className={styles.conditions}>Escolha Pix no checkout. Frete à parte.</p>
        </div>
        <Link href="/catalogo?ordem=preco-asc" className={styles.action}>Aproveitar <ArrowRight aria-hidden="true" size={18} /></Link>
      </div>
    </section>
  );
}
