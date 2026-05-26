"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Pause, Play, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { siteConfig } from "@/lib/site";

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
    <div className="relative overflow-hidden rounded-lg border border-white bg-white p-2 shadow-[0_26px_90px_rgba(17,24,39,0.12)]">
      <div className="relative overflow-hidden rounded-md bg-[linear-gradient(135deg,#fff_0%,#fff4f6_34%,#eff8f3_68%,#f8fafc_100%)] lg:aspect-[16/7] xl:aspect-[16/6.4]">
        <video
          aria-hidden="true"
          autoPlay
          className="absolute inset-0 h-full w-full scale-125 object-cover object-center opacity-20 blur-2xl saturate-[0.8]"
          loop
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
        >
          <source src="/videos/thiago-cansado.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.92),rgba(255,255,255,0.42)_32%,rgba(255,255,255,0.42)_68%,rgba(255,255,255,0.92))]" />
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#c8102e,#138a45,#064b8e)]" />

        <div className="relative z-[1] grid min-h-[360px] items-center gap-5 p-4 sm:min-h-[430px] sm:p-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(16rem,0.52fr)_minmax(16rem,0.48fr)] lg:gap-6 lg:p-7">
          <div className="hidden max-w-lg lg:block">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-brand">
              Wimifarma
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[0.98] text-ink xl:text-5xl">
              Melhores preços em medicamentos e temos Farmácia Popular.
            </h1>
            <p className="mt-5 max-w-xs text-base leading-7 text-muted">
              Medicamentos, Farmacia Popular e entrega com atendimento humano.
            </p>
            <a
              className="soft-breathe mt-7 inline-flex items-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(37,211,102,0.25)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1ebe57]"
              href={siteConfig.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              Chamar no WhatsApp
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>

          <div className="flex min-h-0 items-center justify-center py-3 sm:py-5 lg:h-full lg:min-h-[420px] lg:py-0">
            <div className="relative aspect-[9/16] w-[min(68vw,250px)] overflow-hidden rounded-md bg-[#111827] shadow-[0_28px_60px_rgba(17,24,39,0.24)] ring-1 ring-black/10 sm:w-[min(44vw,280px)] lg:h-full lg:max-h-[620px] lg:min-h-[420px] lg:w-auto">
              <video
                aria-label="Video da Wimifarma"
                autoPlay
                className="h-full w-full object-cover object-center"
                loop
                muted
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
                playsInline
                poster="/videos/thiago-poster.svg"
                preload="auto"
                ref={videoRef}
              >
                <source src="/videos/thiago-cansado.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-ink/60 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-md lg:left-auto lg:right-4 lg:translate-x-0">
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
      <section className="pharma-clouds bg-white px-4 pb-8 pt-32 sm:px-6 sm:pt-36 lg:px-8 lg:pt-44">
        <div className="mx-auto max-w-7xl">
          <MotionBlock>
            <HeroVideo />
          </MotionBlock>
        </div>
      </section>

      <section className="pharma-clouds bg-white px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <MotionBlock>
            <a
              aria-label="Chamar a Wimifarma no WhatsApp pelo banner de dias especiais"
              className="soft-breathe block overflow-hidden rounded-lg bg-white shadow-[0_18px_70px_rgba(17,24,39,0.08)] ring-1 ring-line/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_80px_rgba(17,24,39,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              href={siteConfig.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="Banner Wimifarma com Dia do Generico Barato, Dia do Idoso e Dia do Bebe"
                className="h-auto w-full"
                height={1004}
                sizes="(min-width: 1280px) 1280px, 100vw"
                src="/brand/banner-dias-especiais.svg"
                width={1536}
              />
            </a>
          </MotionBlock>
        </div>
      </section>
    </>
  );
}
