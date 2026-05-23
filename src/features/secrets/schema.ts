import { z } from "zod";

export const secretCredentialCreateSchema = z.object({
  identifier: z.string().trim().max(240).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  secret: z.string().min(1, "Informe a senha ou chave.").max(10000),
  service: z.string().trim().max(120).optional().or(z.literal("")),
  title: z.string().trim().min(2, "Informe um nome.").max(120),
});

export type SecretCredentialCreateInput = z.infer<
  typeof secretCredentialCreateSchema
>;
