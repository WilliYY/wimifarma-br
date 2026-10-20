"use client";

import Image from "next/image";
import { useState } from "react";
import type { PublicPaymentBrand } from "@/features/payments/payment-brands";

export function FooterPaymentBrand({ brand }: { brand: PublicPaymentBrand }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-12 w-20 items-center justify-center rounded-lg border border-line bg-white px-2" title={brand.name}>
      {brand.image && !failed
        ? <Image unoptimized alt={brand.name} src={brand.image} width={72} height={32} className="h-7 w-auto max-w-full object-contain" onError={() => setFailed(true)} />
        : <span className="line-clamp-2 text-center text-xs font-bold leading-4 text-ink">{brand.name}</span>}
    </span>
  );
}
