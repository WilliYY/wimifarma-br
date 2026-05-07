"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BlurTextProps = {
  className?: string;
  text: string;
};

export function BlurText({ className, text }: BlurTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [visible, setVisible] = useState(true);
  const words = text.split(" ");

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const fallback = window.setTimeout(() => setVisible(true), 200);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          window.clearTimeout(fallback);
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <p
      className={cn("flex flex-wrap justify-center gap-y-[0.1em]", className)}
      ref={ref}
    >
      {words.map((word, index) => (
        <motion.span
          animate={
            visible
              ? {
                  filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
                  opacity: [0, 0.5, 1],
                  y: [50, -5, 0],
                }
              : undefined
          }
          className="inline-block"
          initial={{ filter: "blur(10px)", opacity: 0.2, y: 50 }}
          key={`${word}-${index}`}
          style={{ marginRight: "0.28em" }}
          transition={{
            delay: (index * 100) / 1000,
            duration: 0.7,
            ease: "easeOut",
            times: [0, 0.5, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}
