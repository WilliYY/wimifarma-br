"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
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
import type { AdminUserRole } from "@/features/admin-users/schema";

type AdminUserListItem = {
  createdAt: string;
  email: string;
  id: string;
  isActive: boolean;
  lastLoginAt: string | null;
  name: string;
  role: AdminUserRole;
  updatedAt: string;
};

type RoleOption = {
  description: string;
  label: string;
  value: AdminUserRole;
};

type AdminUsersPanelProps = {
  createButtonLabel: string;
  description: string;
  roleOptions: RoleOption[];
  title: string;
};

const roleLabels: Record<AdminUserRole, string> = {
  ADMIN: "ADM",
  MANAGER: "Gerente",
  STAFF: "Colaborador",
};

function fieldValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function apiErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (!error || typeof error !== "object") {
    return "Nao foi possivel concluir.";
  }

  if ("fieldErrors" in error && typeof error.fieldErrors === "object") {
    const fieldErrors = error.fieldErrors as Record<string, string[]>;
    const firstFieldError = Object.values(fieldErrors)
      .flat()
      .find((message) => message.trim().length > 0);

    if (firstFieldError) {
      return firstFieldError;
    }
  }

  if ("formErrors" in error && Array.isArray(error.formErrors)) {
    const firstFormError = error.formErrors.find(
      (message) => typeof message === "string" && message.trim().length > 0,
    );

    if (firstFormError) {
      return firstFormError;
    }
  }

  return "Nao foi possivel concluir.";
}

export function AdminUsersPanel({
  createButtonLabel,
  description,
  roleOptions,
  title,
}: AdminUsersPanelProps) {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const allowedRoles = useMemo(
    () => roleOptions.map((option) => option.value),
    [roleOptions],
  );
  const roleQuery = useMemo(() => allowedRoles.join(","), [allowedRoles]);
  const defaultRole = roleOptions[0]?.value ?? "STAFF";

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/usuarios?roles=${roleQuery}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: AdminUserListItem[];
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(apiErrorMessage(payload.error));
      }

      setUsers(payload.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel carregar.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [roleQuery]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const role = fieldValue(formData, "role") || defaultRole;

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/admin/usuarios", {
        body: JSON.stringify({
          email: fieldValue(formData, "email"),
          name: fieldValue(formData, "name"),
          password: fieldValue(formData, "password"),
          passwordConfirmation: fieldValue(formData, "passwordConfirmation"),
          role,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: unknown };

      if (!response.ok) {
        throw new Error(apiErrorMessage(payload.error));
      }

      form.reset();
      await loadUsers();
      toast.success("Acesso criado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel salvar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(user: AdminUserListItem) {
    const nextStatus = !user.isActive;
    const action = nextStatus ? "reativar" : "bloquear";
    const confirmed = window.confirm(`Deseja ${action} ${user.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      setStatusBusyId(user.id);
      const response = await fetch(`/api/admin/usuarios/${user.id}`, {
        body: JSON.stringify({ isActive: nextStatus }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: unknown };

      if (!response.ok) {
        throw new Error(apiErrorMessage(payload.error));
      }

      await loadUsers();
      toast.success(nextStatus ? "Acesso reativado." : "Acesso bloqueado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel atualizar.",
      );
    } finally {
      setStatusBusyId(null);
    }
  }

  const activeUsers = users.filter((user) => user.isActive).length;
  const blockedUsers = users.length - activeUsers;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-muted">Ativos</p>
              <p className="text-2xl font-black text-ink">{activeUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-subtle text-muted">
              <UserX className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-muted">Bloqueados</p>
              <p className="text-2xl font-black text-ink">{blockedUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ecfdf3] text-[#027a48]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-muted">Perfis</p>
              <p className="text-2xl font-black text-ink">{roleOptions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
              <UserPlus className="h-5 w-5" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Nome
                <Input
                  autoComplete="name"
                  maxLength={120}
                  name="name"
                  placeholder="Nome do usuario"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Email
                <Input
                  autoComplete="email"
                  maxLength={190}
                  name="email"
                  placeholder="usuario@wimifarma.com.br"
                  required
                  type="email"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Senha temporaria
                  <Input
                    autoComplete="new-password"
                    maxLength={120}
                    minLength={8}
                    name="password"
                    placeholder="Minimo 8 caracteres"
                    required
                    type="password"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Confirmar senha
                  <Input
                    autoComplete="new-password"
                    maxLength={120}
                    minLength={8}
                    name="passwordConfirmation"
                    placeholder="Repita a senha"
                    required
                    type="password"
                  />
                </label>
              </div>

              {roleOptions.length > 1 ? (
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Perfil de acesso
                  <select
                    className="flex h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    defaultValue={defaultRole}
                    name="role"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input name="role" type="hidden" value={defaultRole} />
              )}

              <div className="rounded-md bg-surface-subtle p-4 text-sm leading-6 text-muted">
                <p className="font-bold text-ink">Permissoes deste perfil</p>
                <div className="mt-2 grid gap-2">
                  {roleOptions.map((option) => (
                    <p key={option.value}>
                      <span className="font-bold text-ink">{option.label}:</span>{" "}
                      {option.description}
                    </p>
                  ))}
                </div>
              </div>

              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                {createButtonLabel}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acessos cadastrados</CardTitle>
            <CardDescription>
              Consulte status, ultimo acesso e bloqueie usuarios sem apagar o
              historico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line text-sm font-semibold text-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando acessos
              </div>
            ) : users.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line px-5 text-center text-sm font-semibold text-muted">
                Nenhum acesso cadastrado para este perfil.
              </div>
            ) : (
              <div className="grid gap-3">
                {users.map((user) => {
                  const isBusy = statusBusyId === user.id;

                  return (
                    <div
                      className="rounded-md border border-line p-4"
                      key={user.id}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-base font-black text-ink">
                              {user.name}
                            </h3>
                            <Badge variant={user.isActive ? "green" : "muted"}>
                              {user.isActive ? "Ativo" : "Bloqueado"}
                            </Badge>
                            <Badge>{roleLabels[user.role]}</Badge>
                          </div>
                          <p className="mt-2 break-all text-sm font-semibold text-muted">
                            {user.email}
                          </p>
                          <div className="mt-3 grid gap-1 text-xs font-semibold text-muted sm:grid-cols-2">
                            <p>Criado em {formatDate(user.createdAt)}</p>
                            <p>Ultimo acesso: {formatDate(user.lastLoginAt)}</p>
                          </div>
                        </div>

                        <Button
                          className={
                            user.isActive
                              ? "border-red-100 text-red-700 hover:border-red-200 hover:text-red-800"
                              : undefined
                          }
                          disabled={isBusy}
                          onClick={() => void handleToggleStatus(user)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          {user.isActive ? "Bloquear" : "Reativar"}
                        </Button>
                      </div>
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
