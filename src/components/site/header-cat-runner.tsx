"use client";

import { useEffect, useRef, useState } from "react";

const phrases = [
  "Super ofertas!",
  "Achadinhos por aqui!",
  "Vem ver as novidades!",
  "Cuidado com carinho!",
  "Passeie pelo catálogo!",
  "Seu cuidado por aqui!",
  "Olha essas ofertas!",
  "Mais carinho pra você!",
  "Sua rotina em dia!",
  "Escolha seu favorito!",
] as const;

export function HeaderCatRunner({ compact = false, searchActive = false }: { compact?: boolean; searchActive?: boolean }) {
  const laneRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const directionRef = useRef(1);
  const [direction, setDirection] = useState("right");
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [phrase, setPhrase] = useState<number | null>(null);
  const active = ready && !compact && !blocked && !searchActive;

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lane = laneRef.current;
    const header = lane?.closest<HTMLElement>(".site-header");
    function refresh() {
      setReady(!reducedMotion.matches && Boolean(lane?.clientWidth && lane.clientHeight));
      setBlocked(document.hidden || header?.dataset.compact === "true" || Boolean(document.querySelector('dialog[open], [role="dialog"][aria-modal="true"], [role="dialog"][data-state="open"]')));
    }
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "data-state", "aria-modal"] });
    if (header) observer.observe(header, { attributes: true, attributeFilter: ["data-compact"] });
    const visibilityObserver = new ResizeObserver(refresh);
    if (lane) visibilityObserver.observe(lane);
    document.addEventListener("visibilitychange", refresh);
    reducedMotion.addEventListener("change", refresh);
    refresh();
    return () => {
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      reducedMotion.removeEventListener("change", refresh);
    };
  }, []);

  useEffect(() => {
    const lane = laneRef.current;
    const runner = runnerRef.current;
    if (!active || !lane || !runner) return;
    let animation: Animation | null = null;
    let startX = positionRef.current;
    let targetX = startX;
    let duration = 1;
    let maxX = 0;

    function stop() {
      if (animation) {
        const progress = Math.min(1, Math.max(0, Number(animation.currentTime ?? 0) / duration));
        positionRef.current = startX + (targetX - startX) * progress;
        animation.onfinish = null;
        animation.cancel();
        animation = null;
      }
      runner!.style.transform = `translate3d(${positionRef.current}px, 0, 0)`;
    }

    function travel(nextDirection: number) {
      stop();
      positionRef.current = Math.min(maxX, Math.max(0, positionRef.current));
      directionRef.current = nextDirection;
      setDirection(nextDirection > 0 ? "right" : "left");
      startX = positionRef.current;
      targetX = nextDirection > 0 ? maxX : 0;
      duration = Math.max(100, Math.abs(targetX - startX) / 40 * 1000);
      if (maxX <= 0) return;
      animation = runner!.animate([
        { transform: `translate3d(${startX}px, 0, 0)` },
        { transform: `translate3d(${targetX}px, 0, 0)` },
      ], { duration, easing: "linear", fill: "forwards" });
      animation.onfinish = () => travel(-nextDirection);
    }

    function measure() {
      stop();
      maxX = Math.max(0, lane!.clientWidth - runner!.offsetWidth);
      travel(directionRef.current);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(lane);
    measure();
    return () => {
      observer.disconnect();
      stop();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    let timer = 0;
    let index = 0;
    function show() {
      setPhrase(index);
      index = (index + 1) % phrases.length;
      timer = window.setTimeout(() => {
        setPhrase(null);
        timer = window.setTimeout(show, 5000);
      }, 3000);
    }
    show();
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <div aria-hidden="true" className="header-cat-lane" data-header-cat-lane data-paused={!active || undefined}>
      <div className="header-cat-track" ref={laneRef}>
        <div className="header-cat-runner" data-header-cat-runner data-direction={direction} ref={runnerRef}>
          <span aria-hidden="true" className="header-cat-bubble" data-header-cat-bubble data-visible={active && phrase !== null}>
            {phrase === null ? "" : phrases[phrase]}
          </span>
          <span className="header-cat-figure">
            {active ? <span className="header-cat-sprite" aria-hidden="true">
              {/* The original GIF is small; blending removes its white rectangle without a canvas loop. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="header-cat-image" decoding="async" draggable={false} height={500} src="/media/header/gato-correndo.gif" width={500} />
            </span> : null}
          </span>
        </div>
      </div>
    </div>
  );
}
