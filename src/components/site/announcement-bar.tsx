"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Coins, Gift, HeartPulse, Pill, Plus, Sparkles, Truck } from "lucide-react";
import styles from "./announcement-bar.module.css";

const announcements = [
  {
    theme: "delivery",
    title: "Frete grátis em Ivaté-PR",
    detail: "Em compras a partir de",
    highlight: "R$ 99,90",
    action: "Confira a entrega",
    href: "/delivery",
  },
  {
    theme: "popular",
    title: "Farmácia Popular",
    detail: "Cuidado mais perto de você",
    highlight: "Consulte a equipe",
    action: "Saiba mais",
    href: "/farmacia-popular",
  },
  {
    theme: "cashback",
    title: "Seu cuidado rende cashback",
    detail: "Em produtos selecionados",
    highlight: "Confira seu saldo",
    action: "Minha conta",
    href: "/minha-conta",
  },
] as const;

function AnimatedScene({ theme }: { theme: typeof announcements[number]["theme"] }) {
  return (
    <span aria-hidden="true" className={styles.scene}>
      {theme === "delivery" ? (
        <>
          <span className={styles.speedLines}><i /><i /><i /></span>
          <span className={styles.truck} data-animation="truck"><Truck strokeWidth={1.8} /></span>
          <span className={styles.road} />
          <Plus className={styles.truckCross} />
        </>
      ) : theme === "popular" ? (
        <>
          <span className={styles.healthIcon}><HeartPulse strokeWidth={1.7} /></span>
          <Plus className={styles.healthCross} />
          <Sparkles className={styles.twinkle} />
        </>
      ) : (
        <>
          <span className={styles.gift}><Gift strokeWidth={1.8} /></span>
          <Coins className={styles.coins} />
          <Sparkles className={styles.twinkle} />
        </>
      )}
    </span>
  );
}

export function AnnouncementBar() {
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const rotating = !focused && !hovered && !reducedMotion && visible;
  const announcement = announcements[active];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setReducedMotion(media.matches);
    const onVisibilityChange = () => setVisible(!document.hidden);
    onMotionChange();
    onVisibilityChange();
    media.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      media.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % announcements.length), 7_000);
    return () => window.clearInterval(timer);
  }, [rotating]);

  return (
    <section
      aria-label="Destaques da Wimifarma"
      className={styles.bar}
      data-motion={rotating ? "running" : "paused"}
      data-theme={announcement.theme}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onFocusCapture={() => setFocused(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div aria-hidden="true" className={styles.decoration}>
        <Pill className={styles.pill} />
        <Plus className={styles.cross} />
        <HeartPulse className={styles.heart} />
        <Sparkles className={styles.sparkle} />
      </div>
      <div aria-live="off" className={styles.inner}>
        {/* Stable link preserves keyboard focus while automatic content changes. */}
        <Link className={styles.slide} href={announcement.href}>
          <AnimatedScene key={announcement.theme} theme={announcement.theme} />
          <span className={styles.copy} data-copy key={announcement.title}>
            <strong>{announcement.title}</strong>
            <span className={styles.offer}>
              <span className={styles.detail}>{announcement.detail}</span>
              <span className={styles.highlight} data-amount>{announcement.highlight}</span>
            </span>
          </span>
          <span className={styles.action}>{announcement.action}<ArrowUpRight aria-hidden="true" /></span>
        </Link>
      </div>
      <span aria-hidden="true" className={styles.progress} key={announcement.theme} />
    </section>
  );
}
