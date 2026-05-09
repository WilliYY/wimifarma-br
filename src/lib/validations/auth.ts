import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe email ou usuario.")
    .toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;
