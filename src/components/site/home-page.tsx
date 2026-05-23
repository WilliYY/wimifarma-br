"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

const easeOut = [0.16, 1, 0.3, 1] as const;

const entrance = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut },
  },
};

function MotionBlock({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      animate="show"
      className={className}
      initial="hidden"
      transition={{ delay }}
      variants={entrance}
    >
      {children}
    </motion.div>
  );
}

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play().then(() => setIsPlaying(true));
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && video.paused) {
      void video.play().then(() => setIsPlaying(true));
    }
  };

  return (
    <div className="overflow-hidden rounded-[1.75rem] border-[3px] border-brand bg-brand p-1.5 shadow-[0_24px_80px_rgba(200,16,46,0.16)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] bg-[radial-gradient(circle_at_25%_50%,rgba(200,16,46,0.34),transparent_24%),radial-gradient(circle_at_78%_45%,rgba(6,75,142,0.28),transparent_24%),#12070b] sm:aspect-video lg:aspect-[16/6] xl:aspect-[16/5.6]">
        <video
          aria-hidden="true"
          autoPlay
          className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-35 blur-2xl"
          loop
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
        >
          <source src="/videos/thiago-cansado.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(200,16,46,0.20),rgba(255,255,255,0.04)_24%,rgba(255,255,255,0.04)_76%,rgba(6,75,142,0.20))]" />
        <video
          aria-label="Video da Wimifarma"
          autoPlay
          className="relative z-[1] h-full w-full object-contain object-center drop-shadow-[0_18px_36px_rgba(0,0,0,0.28)]"
          loop
          muted
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
          playsInline
          preload="auto"
          ref={videoRef}
        >
          <source src="/videos/thiago-cansado.mp4" type="video/mp4" />
        </video>

        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-ink/60 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-md">
          <button
            aria-label={isPlaying ? "Pausar video" : "Reproduzir video"}
            className="soft-breathe inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
            onClick={togglePlay}
            title={isPlaying ? "Pausar video" : "Reproduzir video"}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </button>

          <button
            aria-label={isMuted ? "Ativar som do video" : "Silenciar video"}
            className="soft-breathe inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
            onClick={toggleMute}
            title={isMuted ? "Ativar som do video" : "Silenciar video"}
            type="button"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="pharma-clouds bg-surface-subtle px-4 pb-8 pt-32 sm:px-6 sm:pt-36 lg:px-8 lg:pt-44">
        <div className="mx-auto max-w-7xl">
          <MotionBlock className="overflow-hidden rounded-[2rem] border border-white bg-white p-3 shadow-[0_18px_60px_rgba(17,24,39,0.12)] sm:p-4">
            <HeroVideo />
          </MotionBlock>
        </div>
      </section>

      <section className="pharma-clouds bg-white px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <MotionBlock>
            <div
              aria-label="Espaco reservado para anuncio principal"
              className="min-h-[420px] overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_18px_70px_rgba(17,24,39,0.08)] sm:aspect-[16/7] sm:min-h-0"
            />
          </MotionBlock>
        </div>
      </section>
    </>
  );
}
