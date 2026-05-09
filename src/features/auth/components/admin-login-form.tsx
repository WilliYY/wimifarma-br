"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function AdminLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LoginInput>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      ...values,
      redirect: false,
    });
    setIsSubmitting(false);

    if (result?.error) {
      toast.error("Nao foi possivel entrar. Confira email e senha.");
      return;
    }

    toast.success("Login realizado.");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="email">
          Email ou usuario
        </label>
        <Input
          autoComplete="username"
          id="email"
          placeholder="adm"
          type="text"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-xs font-semibold text-brand">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="password">
          Senha
        </label>
        <Input
          autoComplete="current-password"
          id="password"
          placeholder="Senha do admin"
          type="password"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-xs font-semibold text-brand">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Entrando..." : "Entrar no admin"}
      </Button>
    </form>
  );
}
