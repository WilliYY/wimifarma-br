"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { siteConfig } from "@/lib/site";
import styles from "./perfumery-carousel.module.css";

const campaigns = [
  {
    brand: "Dove",
    theme: "dove",
    category: "Seu momento de cuidado",
    description: "Cuidados para pele e cabelos, do banho à sua rotina de beleza.",
    image: "/banners/dove-care.webp",
    alt: "Produtos Dove Original para cuidados pessoais",
  },
  {
    brand: "Rexona",
    theme: "rexona",
    category: "Cuidado em movimento",
    description: "Desodorantes para acompanhar seu dia. Consulte fragrâncias e versões.",
    image: "/banners/rexona-care.webp",
    alt: "Desodorante antitranspirante Rexona Bamboo 150 ml",
  },
  {
    brand: "NIVEA",
    theme: "nivea",
    category: "Carinho com a sua pele",
    description: "Hidratantes e cuidados corporais para o seu ritual de todos os dias.",
    image: "/banners/nivea-care.webp",
    alt: "Loção hidratante corporal NIVEA Milk 400 ml",
  },
] as const;

export function PerfumeryCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const frame = useRef<HTMLDivElement>(null);
  const pausedBeforePointer = useRef(false);
  const gesture = useRef({ id: -1, x: 0, y: 0, moved: false });
  const campaign = campaigns[active];
  const rotating = inView && visible && !paused && !hovered && !reducedMotion;
  const whatsappUrl = `https://wa.me/${siteConfig.phone}?text=${encodeURIComponent(
    `Olá, gostaria de consultar os produtos ${campaign.brand} disponíveis na Wimifarma.`,
  )}`;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 });
    updateMotion();
    updateVisibility();
    if (frame.current) observer.observe(frame.current);
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % campaigns.length), 7_000);
    return () => window.clearInterval(timer);
  }, [rotating]);

  function select(index: number) {
    setPaused(true);
    setActive((index + campaigns.length) % campaigns.length);
  }

  function finishGesture(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1));
    start.id = -1;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section className={styles.section}>
      <div
        aria-label="Perfumaria e cuidados pessoais"
        aria-roledescription="carrossel"
        className={styles.frame}
        data-theme={campaign.theme}
        onFocusCapture={() => setPaused(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        ref={frame}
        role="region"
      >
        <div
          className={styles.surface}
          onDragStart={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
          }}
          onPointerMove={(event) => {
            const start = gesture.current;
            if (start.id !== event.pointerId || Math.abs(event.clientX - start.x) <= 8) return;
            start.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={finishGesture}
          onPointerCancel={() => { gesture.current.id = -1; gesture.current.moved = false; }}
          onClickCapture={(event) => {
            if (gesture.current.moved && event.detail > 0) {
              event.preventDefault();
              event.stopPropagation();
            }
            gesture.current.moved = false;
          }}
        >
          <div className={styles.art} key={campaign.image}>
            <Image
              alt={campaign.alt}
              className={styles.image}
              draggable={false}
              fill
              sizes="(max-width: 639px) 210px, (max-width: 1023px) 50vw, 650px"
              src={campaign.image}
            />
          </div>
          <div aria-atomic="true" aria-live={rotating ? "off" : "polite"} className={styles.copy}>
            <span className={styles.eyebrow}>{campaign.category}</span>
            <h2>{campaign.brand}</h2>
            <p>{campaign.description}</p>
            <a aria-label={`Consultar ${campaign.brand} pelo WhatsApp`} className={styles.cta} href={whatsappUrl} rel="noreferrer" target="_blank">
              Consultar {campaign.brand}<ArrowUpRight aria-hidden="true" size={16} />
            </a>
          </div>
        </div>
        <div className={styles.footer}>
          <span className={styles.availability}>Consulte as opções disponíveis</span>
          <div aria-label="Marcas de perfumaria" className={styles.indicators}>
            {campaigns.map((item, index) => (
              <button aria-label={`Mostrar ${item.brand}`} aria-pressed={active === index} key={item.brand} onClick={() => select(index)} title={item.brand} type="button"><span /></button>
            ))}
          </div>
          <div className={styles.controls}>
            <button aria-label="Marca anterior" onClick={() => select(active - 1)} title="Marca anterior" type="button"><ChevronLeft /></button>
            <button aria-label="Próxima marca" onClick={() => select(active + 1)} title="Próxima marca" type="button"><ChevronRight /></button>
            <button
              aria-label={paused || reducedMotion ? "Iniciar banners de perfumaria" : "Pausar banners de perfumaria"}
              disabled={reducedMotion}
              onPointerDown={() => { pausedBeforePointer.current = paused; }}
              onClick={(event) => setPaused(event.detail > 0 ? !pausedBeforePointer.current : !paused)}
              title={reducedMotion ? "Rotação automática desativada por movimento reduzido" : paused ? "Iniciar banners" : "Pausar banners"}
              type="button"
            >{paused || reducedMotion ? <Play /> : <Pause />}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
