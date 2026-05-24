import { z } from "zod";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const nullablePhone = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || value.length >= 10, {
    message: "Informe um telefone valido.",
  });

export const customerCreateSchema = z.object({
  address: z.string().max(240).optional(),
  city: z.string().max(80).default("Ivate"),
  email: z.string().email().optional(),
  name: z.string().min(2).max(160),
  neighborhood: z.string().max(120).optional(),
  notes: z.string().max(800).optional(),
  phone: z.string().min(10).max(20),
});

export const customerPublicRegisterSchema = z
  .object({
    confirmPassword: z.string().min(6).max(120),
    email: z.string().trim().email().toLowerCase(),
    name: z.string().trim().min(2).max(160),
    password: z.string().min(6).max(120),
    phone: z.string().trim().min(10).max(20),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });

export const customerProfileUpdateSchema = z.object({
  address: nullableText(240),
  city: z.string().trim().min(2).max(80).default("Ivate"),
  name: z.string().trim().min(2).max(160),
  neighborhood: nullableText(120),
  notes: nullableText(800),
  phone: nullablePhone,
});

export const customerPasswordSchema = z
  .object({
    confirmPassword: z.string().min(6).max(120),
    currentPassword: z.string().max(120).optional(),
    password: z.string().min(6).max(120),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });
