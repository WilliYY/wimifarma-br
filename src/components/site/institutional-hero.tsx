import Image from "next/image";
import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./institutional-hero.module.css";

type InstitutionalHeroProps = {
  title: string;
  headline: string;
  description: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
  imageMode?: "panorama" | "portrait";
  children: ReactNode;
};

export function InstitutionalHero({ title, headline, description, image, imageAlt, imagePosition, imageMode = "panorama", children }: InstitutionalHeroProps) {
  return (
    <section className={styles.section}>
      <div className={cn(styles.hero, imageMode === "portrait" && styles.heroPortrait)}>
        <div className={cn(styles.photo, imageMode === "portrait" && styles.portrait)}>
          <Image alt={imageAlt} className={styles.image} fill priority sizes={imageMode === "portrait" ? "(min-width: 640px) 50vw, 100vw" : "100vw"} src={image} style={imagePosition ? { objectPosition: imagePosition } : undefined} />
          <span className={styles.caption}>Imagem ilustrativa</span>
        </div>
        <div className={styles.inner}>
          <div className={styles.copy}>
            <p className="flex items-center gap-2 text-sm font-semibold text-brand"><MapPin aria-hidden="true" className="h-4 w-4" />Sua farmácia em Ivaté-PR</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.headline}>{headline}</p>
            <p className={styles.description}>{description}</p>
            <div className={styles.actions}>{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
