import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./cart-basket-artwork.module.css";

export const BASKET_SLOT_COUNT = 9;
const basketPhoto = "/brand/cesta-wimifarma-preta.webp";

export function CartBasketArtwork({ slots, overflow }: { slots: ReactNode[]; overflow: number }) {
  return (
    <span aria-hidden="true" className={styles.basket}>
      <Image alt="" className={styles.photo} height={216} src={basketPhoto} unoptimized width={324} />
      <span className={styles.mouth} data-cart-basket-mouth="" />
      <span className={styles.slots}>
        {Array.from({ length: BASKET_SLOT_COUNT }, (_, index) => (
          <span className={styles.slot} data-cart-basket-slot={index} key={index}>
            {slots[index]}
          </span>
        ))}
      </span>
      {slots.length > 0 && (
        <Image alt="" className={`${styles.photo} ${styles.front}`} height={216} src={basketPhoto} unoptimized width={324} />
      )}
      <span className={styles.brand}>
        <Image alt="" height={151} src="/brand/logo-wimifarma-compact.webp" unoptimized width={640} />
      </span>
      {overflow > 0 && <span className={styles.overflow}>+{overflow}</span>}
    </span>
  );
}
