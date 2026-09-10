import { NextResponse } from "next/server";
import { CouponMutationError } from "./service";

export function couponApiError(error: unknown) {
  if (error instanceof CouponMutationError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "P2002") return NextResponse.json({ error: "Ja existe um cupom com esse codigo." }, { status: 409 });
    if (error.code === "P2034") return NextResponse.json({ error: "O cupom mudou durante a operacao. Atualize a lista e tente novamente." }, { status: 409 });
  }
  console.error("[coupons] Operacao nao concluida", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: "Nao foi possivel concluir a operacao. Tente novamente." }, { status: 500 });
}

export function requireCouponJson(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Envie os dados em JSON." }, { status: 415 });
  }
  return null;
}
