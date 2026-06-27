import { z } from "zod";

export const adminUserRoles = ["ADMIN", "MANAGER", "STAFF"] as const;

export const adminUserCreateSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Informe um email valido.")
      .max(190, "Email muito longo.")
      .toLowerCase(),
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome.")
      .max(120, "Nome muito longo."),
    password: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres.")
      .max(120, "Senha muito longa."),
    passwordConfirmation: z.string().min(1, "Confirme a senha."),
    role: z.enum(adminUserRoles),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirmation) {
      ctx.addIssue({
        code: "custom",
        message: "As senhas nao conferem.",
        path: ["passwordConfirmation"],
      });
    }
  });

export const adminUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;
export type AdminUserRole = (typeof adminUserRoles)[number];
