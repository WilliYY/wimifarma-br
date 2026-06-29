"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Gift,
  Loader2,
  Percent,
  Plus,
  TicketPercent,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";

type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_DELIVERY";

type CouponListItem = {
  code: string;
  createdAt: string;
  description: string | null;
  endsAt: string | null;
  id: string;
  isActive: boolean;
  maxUses: number | null;
  minOrderValue: string | null;
  startsAt: string | null;
  type: CouponType;
  updatedAt: string;
  usesCount: number;
  value: string;
};

const couponTypeLabels: Record<CouponType, string> = {
  FIXED_AMOUNT: "Valor fixo",
  FREE_DELIVERY: "Entrega gratis",
  PERCENTAGE: "Percentual",
};

function todayDateInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 10);
}

function fieldValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalField(formData: FormData, key: string) {
  const value = fieldValue(formData, key);
  return value.length > 0 ? value : undefined;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function durationDays(coupon: CouponListItem) {
  if (!coupon.startsAt || !coupon.endsAt) {
    return null;
  }

  const startsAt = new Date(coupon.startsAt).getTime();
  const endsAt = new Date(coupon.endsAt).getTime();

  return Math.max(1, Math.ceil((endsAt - startsAt + 1) / 86_400_000));
}

function couponDiscount(coupon: CouponListItem) {
  if (coupon.type === "FREE_DELIVERY") {
    return "Entrega gratis";
  }

  const value = Number(coupon.value);

  if (coupon.type === "PERCENTAGE") {
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }

  return formatCurrency(value);
}

function couponStatus(coupon: CouponListItem) {
  const now = Date.now();
  const startsAt = coupon.startsAt ? new Date(coupon.startsAt).getTime() : null;
  const endsAt = coupon.endsAt ? new Date(coupon.endsAt).getTime() : null;

  if (!coupon.isActive) {
    return {
      className: "bg-surface-subtle text-muted",
      label: "Pausado",
    };
  }

  if (startsAt && startsAt > now) {
    return {
      className: "bg-yellow-100 text-[#8a5a00]",
      label: "Agendado",
    };
  }

  if (endsAt && endsAt < now) {
    return {
      className: "bg-surface-subtle text-muted",
      label: "Vencido",
    };
  }

  if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) {
    return {
      className: "bg-brand-soft text-brand",
      label: "Esgotado",
    };
  }

  return {
    className: "bg-emerald-50 text-pharma-green",
    label: "Ativo",
  };
}

function errorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null && "fieldErrors" in error) {
    const fieldErrors = error.fieldErrors as Record<string, string[] | undefined>;
    const firstMessage = Object.values(fieldErrors).flat().find(Boolean);

    if (firstMessage) {
      return firstMessage;
    }
  }

  return "Nao foi possivel salvar o cupom.";
}

export function CouponsPanel() {
  const [coupons, setCoupons] = useState<CouponListItem[]>([]);
  const [couponType, setCouponType] = useState<CouponType>("PERCENTAGE");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDefault] = useState(todayDateInput);

  async function loadCoupons() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/cupons", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: CouponListItem[];
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(errorMessage(payload.error));
      }

      setCoupons(payload.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel carregar.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const type = fieldValue(formData, "type") as CouponType;

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/cupons", {
        body: JSON.stringify({
          code: fieldValue(formData, "code"),
          description: optionalField(formData, "description"),
          durationDays: fieldValue(formData, "durationDays"),
          isActive: formData.get("isActive") === "on",
          maxUses: optionalField(formData, "maxUses"),
          minOrderValue: optionalField(formData, "minOrderValue"),
          startsAt: fieldValue(formData, "startsAt"),
          type,
          usesCount: fieldValue(formData, "usesCount") || "0",
          value: type === "FREE_DELIVERY" ? 0 : fieldValue(formData, "value"),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: unknown };

      if (!response.ok) {
        throw new Error(errorMessage(payload.error));
      }

      form.reset();
      setCouponType("PERCENTAGE");
      await loadCoupons();
      toast.success("Cupom criado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel salvar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyCoupon(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Cupom copiado.");
    } catch {
      toast.error("Nao foi possivel copiar.");
    }
  }

  const activeCoupons = coupons.filter(
    (coupon) => couponStatus(coupon).label === "Ativo",
  ).length;
  const totalUses = coupons.reduce((sum, coupon) => sum + coupon.usesCount, 0);
  const scheduledCoupons = coupons.filter(
    (coupon) => couponStatus(coupon).label === "Agendado",
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <Card>
        <CardHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
            <TicketPercent className="h-5 w-5" />
          </div>
          <CardTitle>Novo cupom</CardTitle>
          <CardDescription>
            Crie cupons com nome, validade por dias ativos, limite de uso e
            contador de pessoas que ja usaram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Nome / codigo do cupom
              <Input
                autoComplete="off"
                maxLength={40}
                name="code"
                placeholder="FESTIVAL-BEBE"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Descricao da campanha
              <Textarea
                maxLength={500}
                name="description"
                placeholder="Ex.: Cupom do Festival do Bebe para WhatsApp."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Tipo de desconto
                <select
                  className="flex h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  defaultValue="PERCENTAGE"
                  name="type"
                  onChange={(event) =>
                    setCouponType(event.target.value as CouponType)
                  }
                >
                  <option value="PERCENTAGE">Percentual</option>
                  <option value="FIXED_AMOUNT">Valor fixo</option>
                  <option value="FREE_DELIVERY">Entrega gratis</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Valor do desconto
                <Input
                  disabled={couponType === "FREE_DELIVERY"}
                  min="0"
                  name="value"
                  placeholder={couponType === "PERCENTAGE" ? "10" : "15,00"}
                  required={couponType !== "FREE_DELIVERY"}
                  step="0.01"
                  type="number"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Inicio da validade
                <Input defaultValue={startDefault} name="startsAt" required type="date" />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Duracao ativa em dias
                <Input defaultValue={7} min={1} name="durationDays" required type="number" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Limite de pessoas/usos
                <Input min={1} name="maxUses" placeholder="100" type="number" />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Pessoas que ja usaram
                <Input defaultValue={0} min={0} name="usesCount" type="number" />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              Valor minimo do pedido
              <Input
                min="0"
                name="minOrderValue"
                placeholder="Opcional"
                step="0.01"
                type="number"
              />
            </label>

            <label className="flex items-center gap-3 rounded-md border border-line bg-surface-subtle px-3 py-3 text-sm font-bold text-ink">
              <input
                className="h-4 w-4 accent-brand"
                defaultChecked
                name="isActive"
                type="checkbox"
              />
              Criar cupom ativo
            </label>

            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Criar cupom
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-brand/15">
            <CardContent className="p-4">
              <Gift className="h-5 w-5 text-brand" />
              <p className="mt-3 text-sm font-bold text-muted">Cupons criados</p>
              <p className="text-3xl font-black text-ink">{coupons.length}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <CheckCircle2 className="h-5 w-5 text-pharma-green" />
              <p className="mt-3 text-sm font-bold text-muted">Ativos agora</p>
              <p className="text-3xl font-black text-ink">{activeCoupons}</p>
            </CardContent>
          </Card>
          <Card className="border-line">
            <CardContent className="p-4">
              <Users className="h-5 w-5 text-brand" />
              <p className="mt-3 text-sm font-bold text-muted">Pessoas/usos</p>
              <p className="text-3xl font-black text-ink">{totalUses}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cupons cadastrados</CardTitle>
            <CardDescription>
              Acompanhe validade, duracao, limite e quantas pessoas ja usaram.
              {scheduledCoupons > 0
                ? ` ${scheduledCoupons} cupom(ns) ainda estao agendados.`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line text-sm font-semibold text-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando cupons
              </div>
            ) : coupons.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">
                Nenhum cupom cadastrado ainda.
              </div>
            ) : (
              <div className="grid gap-3">
                {coupons.map((coupon) => {
                  const status = couponStatus(coupon);
                  const duration = durationDays(coupon);
                  const usagePercent = coupon.maxUses
                    ? Math.min(100, (coupon.usesCount / coupon.maxUses) * 100)
                    : null;

                  return (
                    <div
                      className="rounded-lg border border-line bg-white p-4 shadow-sm"
                      key={coupon.id}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-lg font-black text-ink">
                              {coupon.code}
                            </h3>
                            <span
                              className={cn(
                                "inline-flex rounded-md px-2.5 py-1 text-xs font-bold",
                                status.className,
                              )}
                            >
                              {status.label}
                            </span>
                            <Badge variant="muted">
                              {couponTypeLabels[coupon.type]}
                            </Badge>
                          </div>

                          {coupon.description ? (
                            <p className="mt-2 text-sm leading-6 text-muted">
                              {coupon.description}
                            </p>
                          ) : null}

                          <div className="mt-4 grid gap-2 text-sm font-semibold text-muted sm:grid-cols-2">
                            <p className="flex items-center gap-2">
                              <Percent className="h-4 w-4 text-brand" />
                              Desconto:{" "}
                              <span className="font-black text-ink">
                                {couponDiscount(coupon)}
                              </span>
                            </p>
                            <p className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-brand" />
                              Valido ate{" "}
                              <span className="font-black text-ink">
                                {formatDate(coupon.endsAt)}
                              </span>
                            </p>
                          </div>
                        </div>

                        <Button
                          onClick={() => void copyCoupon(coupon.code)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <Copy className="h-4 w-4" />
                          Copiar
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-md bg-surface-subtle p-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-bold uppercase text-muted">
                            Duracao
                          </p>
                          <p className="mt-1 text-sm font-black text-ink">
                            {duration ? `${duration} dia(s)` : "Sem data"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-muted">
                            Pessoas/usos
                          </p>
                          <p className="mt-1 text-sm font-black text-ink">
                            {coupon.usesCount}
                            {coupon.maxUses ? ` / ${coupon.maxUses}` : " usados"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-muted">
                            Pedido minimo
                          </p>
                          <p className="mt-1 text-sm font-black text-ink">
                            {coupon.minOrderValue
                              ? formatCurrency(Number(coupon.minOrderValue))
                              : "Sem minimo"}
                          </p>
                        </div>
                      </div>

                      {usagePercent !== null ? (
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
                          <span
                            className="block h-full rounded-full bg-brand"
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
