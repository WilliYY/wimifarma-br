"use client";

import { motion } from "framer-motion";
import { gsap } from "gsap";
import { Gift, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

const cards = [
  { icon: MessageCircle, label: "WhatsApp", value: "pedido rapido" },
  { icon: Gift, label: "Roleta", value: "premios e cupons" },
  { icon: ShieldCheck, label: "Admin", value: "controle interno" },
];

export function HeroVisual() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orbRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.to(orbRef.current, {
        y: -16,
        rotation: 4,
        duration: 2.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative min-h-[420px] w-full overflow-hidden rounded-lg border border-red-100 bg-white p-5 shadow-2xl shadow-red-950/10">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-pharma-yellow to-pharma-green" />
      <div className="grid h-full gap-4">
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg bg-gradient-to-br from-brand to-brand-strong p-6 text-white"
          initial={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.55 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/75">
                Central comercial
              </p>
              <h2 className="mt-4 max-w-sm text-3xl font-bold leading-tight">
                ofertas, delivery e relacionamento no mesmo painel
              </h2>
            </div>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/15"
              ref={orbRef}
            >
              <Sparkles className="h-7 w-7" />
            </div>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card, index) => {
            const Icon = card.icon;

            return (
              <motion.div
                className="rounded-lg border border-line bg-surface-subtle p-4"
                initial={{ opacity: 0, y: 14 }}
                key={card.label}
                transition={{ delay: 0.12 * index, duration: 0.45 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <Icon className="h-5 w-5 text-brand" />
                <p className="mt-4 text-sm font-semibold text-ink">
                  {card.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {card.value}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="rounded-lg border border-dashed border-red-200 bg-brand-soft p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand">
                Proxima campanha
              </p>
              <p className="mt-1 text-xs text-muted">
                roleta promocional, cupons e leads prontos para auditoria
              </p>
            </div>
            <span className="rounded-md bg-white px-3 py-2 text-sm font-bold text-brand">
              7 dias
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
