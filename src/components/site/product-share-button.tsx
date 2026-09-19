"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ProductShareButton({ name }: { name: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function share() {
    setStatus("idle");
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url: url.href });
      } else {
        await navigator.clipboard.writeText(url.href);
        setStatus("copied");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setStatus("error");
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-xs font-bold text-muted transition-colors hover:border-brand/30 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={share} type="button">
        {status === "copied" ? <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
        <span aria-live="polite">{status === "copied" ? "Link copiado" : "Compartilhar"}</span>
      </button>
      {status === "error" ? <p role="status" className="mt-2 max-w-48 text-xs text-muted">Copie o endereço no navegador para compartilhar.</p> : null}
    </div>
  );
}
