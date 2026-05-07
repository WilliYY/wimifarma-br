"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageCircle, Play } from "lucide-react";
import { BlurText } from "@/components/motion/blur-text";
import { FadingVideo } from "@/components/motion/fading-video";
import { siteConfig } from "@/lib/site";

const heroVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4";

const easeOut = [0.16, 1, 0.3, 1] as const;

const entrance = {
  hidden: { filter: "blur(10px)", opacity: 0, y: 20 },
  show: {
    filter: "blur(0px)",
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeOut },
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
      className={className}
      initial="hidden"
      variants={entrance}
      viewport={{ once: true, amount: 0.25 }}
      whileInView="show"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function HomePage() {
  return (
    <section className="relative flex min-h-screen overflow-hidden bg-black">
      <FadingVideo
        className="absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top"
        src={heroVideo}
        style={{ height: "120%", width: "120%" }}
      />

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-28 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <MotionBlock delay={0.25}>
            <div className="liquid-glass inline-flex max-w-full items-center gap-2 rounded-full p-1">
              <span className="rounded-full bg-white px-3 py-1 font-body text-xs font-semibold text-black">
                Novo
              </span>
              <span className="truncate pr-3 font-body text-sm font-medium text-white/90">
                Ofertas, delivery e atendimento pelo WhatsApp
              </span>
            </div>
          </MotionBlock>

          <BlurText
            className="mt-7 w-full min-w-0 max-w-5xl font-heading text-[5.4rem] italic leading-[0.78] tracking-[-2px] text-white sm:text-8xl md:text-[8.5rem] lg:text-[10rem]"
            text="Wimifarma"
          />

          <MotionBlock
            className="mt-5 max-w-2xl font-body text-sm font-light leading-tight text-white md:text-base"
            delay={0.65}
          >
            Ofertas, Farmacia Popular, delivery em Ivate e atendimento humano
            com a equipe da farmacia.
          </MotionBlock>

          <MotionBlock
            className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
            delay={0.9}
          >
            <a
              className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium text-white"
              href={siteConfig.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              Comprar pelo WhatsApp
              <MessageCircle className="h-5 w-5" />
            </a>
            <Link
              className="inline-flex items-center gap-2 font-body text-sm font-medium text-white"
              href="/ofertas"
            >
              Ver ofertas
              <Play className="h-4 w-4 fill-current" />
            </Link>
          </MotionBlock>
        </div>
      </div>
    </section>
  );
}
