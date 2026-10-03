"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";

export type SecureCardInput = {
  method: "card"; email: string; token: string; paymentMethodId: string;
  paymentType: string; installments: number; identification?: { type: string; number: string };
};
type CardData = { token: string; payment_method_id: string; installments: number; payer: { email: string; identification?: { type: string; number: string } } };
type BrickController = { unmount: () => Promise<void> };
declare global {
  interface Window {
    MercadoPago?: new (key: string, options: { locale: string }) => {
      bricks: () => { create: (type: string, container: string, settings: unknown) => Promise<BrickController> };
    };
  }
}

export function PaymentCardForm({ publicKey, amountCents, email, onSubmit }: { publicKey: string; amountCents: number; email: string; onSubmit: (input: SecureCardInput) => Promise<void> }) {
  const id = `wimifarma-card-${useId().replace(/:/g, "")}`;
  const [sdkReady, setSdkReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const submit = useRef(onSubmit);
  useEffect(() => { submit.current = onSubmit; }, [onSubmit]);
  useEffect(() => {
    if (!sdkReady || !window.MercadoPago) return;
    let disposed = false;
    let controller: BrickController | undefined;
    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
    void mp.bricks().create("cardPayment", id, {
      initialization: { amount: amountCents / 100, payer: { email } },
      customization: { paymentMethods: { minInstallments: 1, maxInstallments: 12 } },
      callbacks: {
        onReady: () => { if (!disposed) setReady(true); },
        onSubmit: (form: CardData, additional: { paymentTypeId: string }) => submit.current({
          method: "card", email: form.payer.email, token: form.token, paymentMethodId: form.payment_method_id,
          paymentType: additional.paymentTypeId, installments: form.installments, identification: form.payer.identification,
        }),
        onError: () => { if (!disposed) setError("Não foi possível carregar o cartão. Recarregue ou escolha Pix."); },
      },
    }).then(value => { controller = value; if (disposed) void value.unmount(); }).catch(() => { if (!disposed) setError("Não foi possível abrir o formulário seguro."); });
    return () => { disposed = true; setReady(false); if (controller) void controller.unmount(); };
  }, [sdkReady, publicKey, amountCents, email, id]);
  return <div className="min-w-0">
    <Script src="https://sdk.mercadopago.com/js/v2" onReady={() => setSdkReady(true)} onError={() => setError("Não foi possível carregar o Mercado Pago.")} />
    <p className="mb-3 flex items-center gap-2 text-xs text-muted"><LockKeyhole className="h-3.5 w-3.5" />Campos protegidos pelo Mercado Pago</p>
    {!ready && !error && <p className="flex gap-2 py-4 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Carregando cartão e parcelamento...</p>}
    <div id={id} />
    {error && <p role="alert" className="mt-3 text-sm text-brand">{error}</p>}
    <p className="mt-3 text-xs leading-5 text-muted">O formulário identifica a bandeira e mostra parcelas, juros e total antes de pagar. O preenchimento de cartão salvo depende do seu navegador; a Wimifarma não armazena número ou CVV.</p>
  </div>;
}
