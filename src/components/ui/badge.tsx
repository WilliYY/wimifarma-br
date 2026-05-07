import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "green" | "yellow" | "muted";

const variants: Record<BadgeVariant, string> = {
  default: "bg-brand-soft text-brand",
  green: "bg-emerald-50 text-pharma-green",
  muted: "bg-surface-subtle text-muted",
  yellow: "bg-yellow-100 text-[#8a5a00]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
