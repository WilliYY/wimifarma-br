"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
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

type SecretCredentialListItem = {
  createdAt: string;
  createdById: string | null;
  id: string;
  identifier: string | null;
  lastViewedAt: string | null;
  service: string | null;
  title: string;
  updatedAt: string;
};

type RevealedCredential = {
  notes: string | null;
  secret: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function fieldValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function SecretVaultPanel() {
  const [credentials, setCredentials] = useState<SecretCredentialListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, RevealedCredential>>(
    {},
  );
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadCredentials() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/api-senhas", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: SecretCredentialListItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel carregar.");
      }

      setCredentials(payload.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel carregar.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCredentials();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/admin/api-senhas", {
        body: JSON.stringify({
          identifier: fieldValue(formData, "identifier"),
          notes: fieldValue(formData, "notes"),
          secret: fieldValue(formData, "secret"),
          service: fieldValue(formData, "service"),
          title: fieldValue(formData, "title"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel salvar.");
      }

      form.reset();
      setRevealed({});
      await loadCredentials();
      toast.success("Credencial salva.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel salvar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReveal(id: string) {
    if (revealed[id]) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }

    try {
      setRevealingId(id);
      const response = await fetch(`/api/admin/api-senhas/${id}/reveal`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: RevealedCredential;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Nao foi possivel revelar.");
      }

      setRevealed((current) => ({ ...current, [id]: payload.data! }));
      await loadCredentials();
      toast.success("Credencial aberta.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel revelar.",
      );
    } finally {
      setRevealingId(null);
    }
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado.");
    } catch {
      toast.error("Nao foi possivel copiar.");
    }
  }

  async function handleDelete(credential: SecretCredentialListItem) {
    const confirmed = window.confirm(
      `Excluir "${credential.title}"? Essa acao nao pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(credential.id);
      const response = await fetch(`/api/admin/api-senhas/${credential.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel excluir.");
      }

      setRevealed((current) => {
        const next = { ...current };
        delete next[credential.id];
        return next;
      });
      await loadCredentials();
      toast.success("Credencial excluida.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel excluir.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
            <KeyRound className="h-5 w-5" />
          </div>
          <CardTitle>API e Senhas</CardTitle>
          <CardDescription>
            Salve client IDs, chaves, tokens e senhas administrativas cifradas
            no banco.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Nome
              <Input
                maxLength={120}
                name="title"
                placeholder="Google OAuth"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Servico
              <Input maxLength={120} name="service" placeholder="Google" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Usuario, client ID ou chave publica
              <Input
                maxLength={240}
                name="identifier"
                placeholder="exemplo.apps.googleusercontent.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Senha, secret ou token
              <Input
                autoComplete="new-password"
                maxLength={10000}
                name="secret"
                placeholder="Cole o valor sensivel aqui"
                required
                type="password"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Notas
              <Textarea
                maxLength={2000}
                name="notes"
                placeholder="Onde usar, URL de callback ou observacoes."
              />
            </label>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Salvar credencial
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credenciais salvas</CardTitle>
          <CardDescription>
            O valor sensivel fica oculto ate voce revelar. Cada abertura fica
            registrada no log de auditoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-line text-sm font-semibold text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando
            </div>
          ) : credentials.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">
              Nenhuma credencial salva ainda.
            </div>
          ) : (
            <div className="grid gap-3">
              {credentials.map((credential) => {
                const visible = revealed[credential.id];
                const isBusy =
                  revealingId === credential.id || deletingId === credential.id;

                return (
                  <div
                    className="rounded-md border border-line p-4"
                    key={credential.id}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-base font-black text-ink">
                            {credential.title}
                          </h3>
                          {credential.service ? (
                            <Badge>{credential.service}</Badge>
                          ) : null}
                        </div>
                        {credential.identifier ? (
                          <p className="mt-2 break-all text-sm font-semibold text-muted">
                            {credential.identifier}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs font-semibold text-muted">
                          Atualizado em {formatDate(credential.updatedAt)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted">
                          Ultima abertura: {formatDate(credential.lastViewedAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={isBusy}
                          onClick={() => void handleReveal(credential.id)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          {revealingId === credential.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : visible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          {visible ? "Ocultar" : "Revelar"}
                        </Button>
                        <Button
                          className="text-brand"
                          disabled={!visible}
                          onClick={() => visible && void handleCopy(visible.secret)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <Copy className="h-4 w-4" />
                          Copiar
                        </Button>
                        <Button
                          className="border-red-100 text-red-700 hover:border-red-200 hover:text-red-800"
                          disabled={isBusy}
                          onClick={() => void handleDelete(credential)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          {deletingId === credential.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Excluir
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-md bg-surface-subtle p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted">
                        Segredo
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-ink">
                        {visible ? visible.secret : "****************"}
                      </p>
                      {visible?.notes ? (
                        <div className="mt-3 border-t border-line pt-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted">
                            Notas
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
                            {visible.notes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
