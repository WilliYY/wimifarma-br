import { z } from "zod";

export const postalAddressSchema = z.object({
  postalCode: z.string().regex(/^\d{8}$/),
  street: z.string().max(120),
  neighborhood: z.string().max(80),
  city: z.string().min(1).max(80),
  state: z.string().regex(/^[A-Z]{2}$/),
});
export type PostalAddress = z.infer<typeof postalAddressSchema>;

const viaCepSchema = z.object({
  cep: z.string(),
  logradouro: z.string().max(120),
  bairro: z.string().max(80),
  localidade: z.string().min(1).max(80),
  uf: z.string().regex(/^[A-Z]{2}$/),
});

export class PostalCodeError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function lookupPostalCode(code: string, fetcher: typeof fetch = fetch): Promise<PostalAddress> {
  if (!/^\d{8}$/.test(code)) throw new PostalCodeError("Informe um CEP com 8 numeros.", 422);
  try {
    const response = await fetcher(`https://viacep.com.br/ws/${code}/json/`, {
      signal: AbortSignal.timeout(6_000),
      redirect: "error",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("CEP provider unavailable");
    const data: unknown = await response.json();
    if (data && typeof data === "object" && "erro" in data && (data.erro === true || data.erro === "true")) {
      throw new PostalCodeError("CEP nao encontrado. Confira os numeros informados.", 404);
    }
    const parsed = viaCepSchema.safeParse(data);
    if (!parsed.success || parsed.data.cep.replace(/\D/g, "") !== code) throw new Error("Invalid CEP response");
    return { postalCode: code, street: parsed.data.logradouro, neighborhood: parsed.data.bairro, city: parsed.data.localidade, state: parsed.data.uf };
  } catch (error) {
    if (error instanceof PostalCodeError) throw error;
    throw new PostalCodeError("Consulta de CEP indisponivel. Preencha o endereco ou tente novamente.", 503);
  }
}
