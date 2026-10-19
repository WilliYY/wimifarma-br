import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { isMedicineImagePlaceholder, medicineIllustrationUrl, MEDICINE_PLACEHOLDER_URL, type ProductImageIdentity } from "@/features/products/image-placeholder";
import { cn } from "@/lib/utils";

type Props = ProductImageIdentity & { name?: string; className?: string; showLabel?: boolean };

export function ProductImagePlaceholder({ className, showLabel = false, ...identity }: Props) {
  const medicine = isMedicineImagePlaceholder(identity);
  const illustration = medicineIllustrationUrl(identity);
  const label = medicine ? "Imagem ilustrativa de medicamento, não representa a embalagem do produto" : "Foto indisponível";
  return (
    <span aria-label={label} className={cn("inline-flex min-h-0 min-w-0 flex-col items-center justify-center", className)} role="img">
      {medicine && illustration !== MEDICINE_PLACEHOLDER_URL ? <Image alt="" aria-hidden="true" className="min-h-0 w-full flex-1 object-contain" height={1024} src={illustration} width={1024} /> : medicine ? (
        <svg aria-hidden="true" className="min-h-0 w-full flex-1" preserveAspectRatio="xMidYMid meet" viewBox="250 10 860 1120">
          <image height="1145" href={MEDICINE_PLACEHOLDER_URL} style={{ clipPath: "polygon(20.3% 6.9%,31.9% 3.2%,78.2% 6.7%,78.6% 93%,31.3% 96.5%,20.3% 91.5%)" }} width="1374" />
        </svg>
      ) : <ImageIcon aria-hidden="true" className="h-7 w-7 shrink-0 text-muted" />}
      {medicine && showLabel ? <span className="mt-1 shrink-0 text-center text-[0.6rem] font-medium leading-4 text-muted">Imagem ilustrativa</span> : null}
    </span>
  );
}
