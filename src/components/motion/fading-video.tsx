"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const FADE_MS = 500;
const FADE_OUT_LEAD = 0.55;

type FadingVideoProps = {
  className?: string;
  src: string;
  style?: CSSProperties;
};

export function FadingVideo({ className, src, style }: FadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const fadingOutRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const element = video;

    function cancelFade() {
      if (fadeFrameRef.current !== null) {
        cancelAnimationFrame(fadeFrameRef.current);
        fadeFrameRef.current = null;
      }
    }

    function fadeTo(target: number, duration: number) {
      cancelFade();
      const start = Number.parseFloat(element.style.opacity || "0");
      const startTime = performance.now();

      function frame(now: number) {
        const progress = Math.min((now - startTime) / duration, 1);
        const next = start + (target - start) * progress;
        element.style.opacity = String(next);

        if (progress < 1) {
          fadeFrameRef.current = requestAnimationFrame(frame);
        }
      }

      fadeFrameRef.current = requestAnimationFrame(frame);
    }

    function handleLoadedData() {
      element.style.opacity = "0";
      void element.play();
      fadeTo(1, FADE_MS);
    }

    function handleTimeUpdate() {
      if (
        !fadingOutRef.current &&
        element.duration > 0 &&
        element.duration - element.currentTime <= FADE_OUT_LEAD
      ) {
        fadingOutRef.current = true;
        fadeTo(0, FADE_MS);
      }
    }

    function handleEnded() {
      element.style.opacity = "0";
      restartTimeoutRef.current = setTimeout(() => {
        element.currentTime = 0;
        fadingOutRef.current = false;
        void element.play();
        fadeTo(1, FADE_MS);
      }, 100);
    }

    element.addEventListener("loadeddata", handleLoadedData);
    element.addEventListener("timeupdate", handleTimeUpdate);
    element.addEventListener("ended", handleEnded);

    return () => {
      cancelFade();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      element.removeEventListener("loadeddata", handleLoadedData);
      element.removeEventListener("timeupdate", handleTimeUpdate);
      element.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  return (
    <video
      autoPlay
      className={cn(className)}
      muted
      playsInline
      preload="auto"
      ref={videoRef}
      src={src}
      style={{ opacity: 0, ...style }}
    />
  );
}
