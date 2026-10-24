import Link from "next/link";
import { ArrowRight, ArrowUpRight, Baby, BadgePercent, Droplets, Leaf, Pill, SprayCan } from "lucide-react";
import type { HomeShortcutItem } from "@/features/products/home-shortcuts";
import styles from "./home-shortcuts.module.css";

const shortcutIcons = {
  offers: BadgePercent,
  baby: Baby,
  medicines: Pill,
  vitamins: Leaf,
  dermo: Droplets,
  beauty: SprayCan,
};

export function HomeShortcuts({ items }: { items: HomeShortcutItem[] }) {
  return (
    <nav aria-label="Categorias de produtos" className={styles.panel}>
      <div className={styles.heading}>
        <p className={styles.title}>Encontre seu cuidado</p>
        <Link className={styles.catalog} href="/catalogo">
          Ver catálogo <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </div>

      <ul className={styles.list} id="home-shortcuts">
        {items.map((item) => {
          const Icon = shortcutIcons[item.id];
          return (
            <li key={item.id}>
              <Link
                aria-label={item.label}
                className={`${styles.link}${item.id === "offers" ? ` ${styles.offer}` : ""}`}
                href={item.href}
              >
                <span aria-hidden="true" className={styles.icon}>
                  <Icon size={28} strokeWidth={1.7} />
                </span>
                <span className={styles.label}>{item.label}</span>
                <ArrowUpRight aria-hidden="true" className={styles.open} size={16} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
