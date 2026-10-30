"use client";

import { useEffect } from "react";

const RED = "#ed1c13";
const FRAME_MS = 80;
const MOTION_MS = 2400;
const REST_MS = 5600;

function progress(time: number, delay: number, duration: number) {
  return Math.max(0, Math.min(1, (time - delay) / duration));
}

// Geometry and colors match public/favicon.svg, including the inverted right “i”.
export function drawFaviconFrame(context: CanvasRenderingContext2D, time: number) {
  const roundedRect = (x: number, y: number, width: number, height: number, radius: number, color: string) => {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
  };

  context.save();
  context.scale(context.canvas.width / 256, context.canvas.height / 256);
  context.fillStyle = RED;
  context.fillRect(0, 0, 256, 256);

  for (const right of [false, true]) {
    const direction = right ? 1 : -1;
    const bodyProgress = progress(time, right ? 180 : 0, 1400);
    const turn = 1 - (bodyProgress * bodyProgress * (3 - 2 * bodyProgress));
    const centerX = right ? 154 : 100;
    const centerY = right ? 99 : 166;
    context.save();
    context.translate(centerX + direction * 18 * turn, centerY);
    context.rotate(direction * turn * Math.PI * 2);
    if (right) {
      roundedRect(-20, -62, 40, 124, 20, "#fff");
      roundedRect(-7, -48, 14, 51, 3, RED);
    } else {
      roundedRect(-20, -53, 40, 106, 20, "#fff");
      roundedRect(-6, -12, 13, 58, 3, RED);
    }
    context.restore();

    const dotProgress = progress(time, right ? 950 : 750, 850);
    const back = 1 + 2.70158 * (dotProgress - 1) ** 3 + 1.70158 * (dotProgress - 1) ** 2;
    context.save();
    context.globalAlpha = Math.min(1, dotProgress * 5);
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(centerX + direction * 30 * (1 - back), (right ? 194 : 86) + direction * 116 * (1 - back), 20, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.restore();
}

export function AnimatedFavicon() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const originals = new Map<HTMLLinkElement, { href: string; type: string | null; sizes: string | null }>();
    let frames: string[] | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const restore = () => {
      clearTimeout(timer);
      for (const [link, original] of originals) {
        link.setAttribute("href", original.href);
        for (const attribute of ["type", "sizes"] as const) {
          const value = original[attribute];
          if (value === null) link.removeAttribute(attribute);
          else link.setAttribute(attribute, value);
        }
      }
      originals.clear();
    };

    const play = () => {
      restore();
      if (document.hidden || reducedMotion.matches) return;

      if (!frames) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 32;
        const context = canvas.getContext("2d");
        if (!context) return;
        frames = Array.from({ length: MOTION_MS / FRAME_MS + 1 }, (_, index) => {
          drawFaviconFrame(context, index * FRAME_MS);
          return canvas.toDataURL("image/png");
        });
      }

      let index = 0;
      const tick = () => {
        if (document.hidden || reducedMotion.matches) {
          restore();
          return;
        }
        const frame = frames?.[index++];
        if (!frame) {
          restore();
          timer = setTimeout(play, REST_MS);
          return;
        }
        // Next.js emits several favicon links. Keep them consistent, including after navigation.
        for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')) {
          if (!originals.has(link)) originals.set(link, {
            href: link.getAttribute("href") ?? "/favicon.svg",
            type: link.getAttribute("type"),
            sizes: link.getAttribute("sizes"),
          });
          link.type = "image/png";
          link.sizes.value = "32x32";
          link.href = frame;
        }
        timer = setTimeout(tick, FRAME_MS);
      };
      tick();
    };

    // Leave the complete static brand visible during the initial page load.
    timer = setTimeout(play, 1200);
    document.addEventListener("visibilitychange", play);
    reducedMotion.addEventListener("change", play);
    return () => {
      document.removeEventListener("visibilitychange", play);
      reducedMotion.removeEventListener("change", play);
      restore();
    };
  }, []);

  return null;
}
