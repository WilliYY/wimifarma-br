"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";

type ExistingReview = { comment: string; rating: number } | null;

export function ProductReviewForm({
  canReview,
  existingReview,
  isCustomer,
  loginHref,
  productId,
}: {
  canReview: boolean;
  existingReview: ExistingReview;
  isCustomer: boolean;
  loginHref: string;
  productId: string;
}) {
  const router = useRouter();
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [submitting, setSubmitting] = useState(false);

  if (!isCustomer) {
    return (
      <div className="rounded-lg border border-line bg-white p-5 shadow-[0_12px_34px_rgba(17,24,39,0.06)] sm:p-6">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-pharma-green">Compra verificada</p>
        <h3 className="mt-2 text-lg font-black text-ink">Conte sua experiencia</h3>
        <p className="mt-2 text-sm leading-6 text-muted">Entre na sua conta para avaliar este produto depois que o pedido for concluido.</p>
        <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-brand px-4 text-sm font-black text-brand transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" href={loginHref}>
          Entrar na conta
        </Link>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="rounded-lg border border-line bg-white p-5 shadow-[0_12px_34px_rgba(17,24,39,0.06)] sm:p-6">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-pharma-green">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-black text-ink">Compra verificada</h3>
        <p className="mt-2 text-sm leading-6 text-muted">O formulario sera liberado quando um pedido concluido deste produto estiver na sua conta.</p>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) {
      toast.error("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/produtos/${productId}/avaliacoes`, {
        body: JSON.stringify({ comment, rating }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Nao foi possivel salvar a avaliacao.");
      toast.success(existingReview ? "Avaliacao atualizada." : "Obrigado pela avaliacao.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a avaliacao.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="rounded-lg border border-line bg-white p-5 shadow-[0_12px_34px_rgba(17,24,39,0.06)] sm:p-6" onSubmit={handleSubmit}>
      <h3 className="text-base font-black text-ink">{existingReview ? "Atualize sua avaliacao" : "Avalie sua compra"}</h3>
      <p className="mt-1 text-xs font-semibold text-pharma-green">Compra verificada</p>
      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-ink">Sua nota</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`}
              className="flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              key={value}
              onClick={() => setRating(value)}
              type="button"
            >
              <Star className={`h-6 w-6 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm font-bold text-ink" htmlFor="product-review-comment">Conte como foi sua experiencia</label>
      <textarea
        className="mt-2 min-h-28 w-full resize-y rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
        id="product-review-comment"
        maxLength={600}
        minLength={10}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Ex.: produto bem embalado e atendimento cuidadoso."
        required
        value={comment}
      />
      <div className="mt-1 text-right text-xs font-semibold text-muted">{comment.length}/600</div>
      <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-black text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit">
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {existingReview ? "Salvar alteracoes" : "Publicar avaliacao"}
      </button>
    </form>
  );
}
