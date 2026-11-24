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

const brasilApiCepSchema = z.object({
  cep: z.string(),
  street: z.string().max(120).nullish(),
  neighborhood: z.string().max(80).nullish(),
  city: z.string().trim().min(1).max(80),
  state: z.string().regex(/^[A-Z]{2}$/),
});

export class PostalCodeError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function requestPostalCode(url: string, fetcher: typeof fetch) {
  return fetcher(url, {
    signal: AbortSignal.timeout(3_000),
    redirect: "error",
    headers: { Accept: "application/json" },
  });
}

async function lookupViaCep(code: string, fetcher: typeof fetch): Promise<PostalAddress | null> {
  const response = await requestPostalCode(`https://viacep.com.br/ws/${code}/json/`, fetcher);
  if (!response.ok) throw new Error("ViaCEP unavailable");
  const data: unknown = await response.json();
  if (data && typeof data === "object" && "erro" in data && (data.erro === true || data.erro === "true")) {
    return null;
  }
  const parsed = viaCepSchema.safeParse(data);
  if (!parsed.success || parsed.data.cep.replace(/\D/g, "") !== code) throw new Error("Invalid ViaCEP response");
  const { logradouro, bairro, localidade, uf } = parsed.data;
  return { postalCode: code, street: logradouro, neighborhood: bairro, city: localidade, state: uf };
}

async function lookupBrasilApi(code: string, fetcher: typeof fetch): Promise<PostalAddress | null> {
  const response = await requestPostalCode(`https://brasilapi.com.br/api/cep/v2/${code}`, fetcher);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("BrasilAPI unavailable");
  const parsed = brasilApiCepSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.cep.replace(/\D/g, "") !== code) throw new Error("Invalid BrasilAPI response");
  const { street, neighborhood, city, state } = parsed.data;
  return { postalCode: code, street: street ?? "", neighborhood: neighborhood ?? "", city, state };
}

export async function lookupPostalCode(code: string, fetcher: typeof fetch = fetch): Promise<PostalAddress> {
  if (!/^\d{8}$/.test(code)) throw new PostalCodeError("Informe um CEP com 8 numeros.", 422);
  // null indicates that the source returned no match. undefined indicates a failed lookup.
  const viaCep = await lookupViaCep(code, fetcher).catch(() => undefined);
  if (viaCep) return viaCep;
  const brasilApi = await lookupBrasilApi(code, fetcher).catch(() => undefined);
  if (brasilApi) return brasilApi;
  if (viaCep === null && brasilApi === null) {
    throw new PostalCodeError("CEP não localizado nas bases consultadas. Confira os números ou preencha o endereço.", 404);
  }
  throw new PostalCodeError("Consulta de CEP indisponível. Preencha o endereço ou tente novamente.", 503);
}
