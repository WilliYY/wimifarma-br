import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./cart-basket-artwork.module.css";

export function CartBasketArtwork({ slots, overflow }: { slots: ReactNode[]; overflow: number }) {
  return (
    <span aria-hidden="true" className={styles.basket}>
      <svg className={styles.layer} focusable="false" preserveAspectRatio="none" viewBox="0 0 108 62">
        <ellipse cx="54" cy="59" rx="42" ry="2.5" fill="#26080f" opacity=".35" />
        <path d="M22 32 31 9a9 9 0 0 1 8-5h30a9 9 0 0 1 8 5l9 23" fill="none" stroke="#86152c" strokeLinecap="round" strokeWidth="7" />
        <path d="M22 30 31 9a9 9 0 0 1 8-5h30a9 9 0 0 1 8 5l9 21" fill="none" stroke="#ee5364" strokeLinecap="round" strokeWidth="3.5" />
        <path d="M15 28Q16 25 21 25h66q5 0 6 3l9 8-9 12H15L6 36Z" fill="#e74253" />
        <path d="M18 29h72l8 7-8 5H18l-8-5Z" fill="#72162b" />
        <path d="M18 28h72" stroke="#ff8790" strokeLinecap="round" strokeWidth="1.5" />
      </svg>

      <span className={styles.mouth} data-cart-basket-mouth="" />
      <span className={styles.slots}>
        {[0, 1, 2, 3].map((index) => (
          <span className={styles.slot} data-cart-basket-slot={index} key={index}>
            {slots[index]}
          </span>
        ))}
      </span>

      <svg className={styles.front} focusable="false" preserveAspectRatio="none" viewBox="0 0 108 62">
        <path d="m9 37 9 18q1.5 4 6 4h60q4.5 0 6-4l9-18Z" fill="#b91d38" />
        <path d="m9 37 9 18q1.5 4 6 4h6l-6-22Z" fill="#982037" />
        <path d="m99 37-9 18q-1.5 4-6 4h-6l6-22Z" fill="#99223b" />
        <path d="m24 39 6 17h48l6-17Z" fill="#d92946" />
        <path d="m22 45 3 8m-8-8 3 8m66-8-3 8m8-8-3 8" fill="none" stroke="#691228" strokeLinecap="round" strokeWidth="1.8" opacity=".65" />
        <path d="M8 35h92a2.5 2.5 0 0 1 0 5H8a2.5 2.5 0 0 1 0-5Z" fill="#ef4d61" />
        <path d="M10 36h88" stroke="#ff9ba5" strokeLinecap="round" />
      </svg>

      <span className={styles.brand}>
        <Image alt="" height={151} src="/brand/logo-wimifarma-compact.webp" unoptimized width={640} />
      </span>
      {overflow > 0 ? <span className={styles.overflow}>+{overflow}</span> : null}
    </span>
  );
}
