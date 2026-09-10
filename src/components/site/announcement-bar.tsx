"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Gift, HeartPulse, Pause, Pill, Play, Plus, Truck } from "lucide-react";
import styles from "./announcement-bar.module.css";

const announcements = [
  {
    theme: "delivery",
    icon: Truck,
    title: "Frete grátis em Ivaté-PR",
    detail: "Seu cuidado chega até você",
    action: "Ver entrega",
    href: "/delivery",
    badge: "",
  },
  {
    theme: "popular",
    icon: HeartPulse,
    title: "Farmácia Popular",
    detail: "Consulte documentos e disponibilidade com a equipe",
    action: "Saiba mais",
    href: "/farmacia-popular",
    badge: "",
  },
  {
    theme: "cashback",
    icon: Gift,
    title: "Cashback Wimifarma",
    detail: "Estamos preparando novidades para você",
    action: "Fale com a gente",
    href: "/contato",
    badge: "Em breve",
  },
] as const;

export function AnnouncementBar() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const pausedBeforePointer = useRef(false);
  const rotating = !paused && !hovered && !reducedMotion && visible;
  const announcement = announcements[active];
  const Icon = announcement.icon;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setReducedMotion(media.matches);
    onMotionChange();
    media.addEventListener("change", onMotionChange);
    return () => media.removeEventListener("change", onMotionChange);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % announcements.length);
    }, 6_000);
    return () => window.clearInterval(timer);
  }, [rotating]);

  function move(direction: number) {
    setPaused(true);
    setActive((current) => (current + direction + announcements.length) % announcements.length);
  }

  return (
    <section
      aria-label="Destaques da Wimifarma"
      aria-roledescription="carrossel"
      className={styles.bar}
      data-theme={announcement.theme}
      onFocusCapture={() => setPaused(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div aria-hidden="true" className={styles.decoration}>
        <Pill className={styles.pill} />
        <Plus className={styles.cross} />
        <HeartPulse className={styles.heart} />
      </div>
      <div className={styles.inner}>
        <button
          aria-label={paused || reducedMotion ? "Iniciar rotação dos avisos" : "Pausar rotação dos avisos"}
          className={`${styles.control} ${styles.rotation}`}
          disabled={Boolean(reducedMotion)}
          onPointerDown={() => { pausedBeforePointer.current = paused; }}
          onClick={(event) => {
            // Pointer focus pauses first; preserve the intent of the clicked control.
            if (event.detail > 0) setPaused(!pausedBeforePointer.current);
            else setPaused((current) => !current);
          }}
          title={reducedMotion ? "Rotação automática desativada pela preferência de movimento reduzido" : paused ? "Iniciar rotação" : "Pausar rotação"}
          type="button"
        >
          {paused || reducedMotion ? <Play /> : <Pause />}
        </button>
        <button aria-label="Aviso anterior" className={styles.control} onClick={() => move(-1)} title="Aviso anterior" type="button">
          <ChevronLeft />
        </button>
        <div aria-atomic="true" aria-live={rotating ? "off" : "polite"} className={styles.viewport}>
          <Link className={styles.slide} href={announcement.href} key={announcement.theme}>
            <span aria-hidden="true" className={styles.icon}><Icon /></span>
            <span className={styles.copy}>
              <strong>{announcement.title}</strong>
              {announcement.badge && <span className={styles.badge}>{announcement.badge}</span>}
              <span className={styles.detail}>{announcement.detail}</span>
            </span>
            <span className={styles.action}>{announcement.action}<ArrowUpRight aria-hidden="true" /></span>
          </Link>
        </div>
        <button aria-label="Próximo aviso" className={styles.control} onClick={() => move(1)} title="Próximo aviso" type="button">
          <ChevronRight />
        </button>
        <div aria-hidden="true" className={styles.dots}>
          {announcements.map((item, index) => <span data-active={index === active} key={item.theme} />)}
        </div>
      </div>
    </section>
  );
}
