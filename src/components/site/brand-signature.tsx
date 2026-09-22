import Image from "next/image";
import { cn } from "@/lib/utils";

/** Always use the supplied artwork, including its lettering and capsule. */
export function BrandSignature({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center rounded-full bg-white px-3 py-2 ring-1 ring-black/5", className)} data-brand-signature>
      <Image alt="Wimifarma" className="h-auto w-28 sm:w-32" height={151} src="/brand/logo-wimifarma-compact.webp" unoptimized width={640} />
    </span>
  );
}
