import { Buffer } from "node:buffer";

const correiosOrigin = "https://api.correios.com.br";
const requestTimeoutMs = 5_000;
const services = [
  { code: "03220", name: "SEDEX" },
  { code: "03298", name: "PAC" },
];

type CorreiosConfig = {
  user: string;
  apiCode: string;
  postingCard: string;
  contract?: { number: string; regionalDirectorate: string };
};

type CorreiosQuoteInput = {
  originPostalCode: string;
  destinationPostalCode: string;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export class CorreiosError extends Error {
  constructor(readonly status: 502 | 503) {
    super(status === 503 ? "A cotação dos Correios está indisponível." : "Não foi possível confirmar a cotação dos Correios.");
    this.name = "CorreiosError";
  }
}

type CorreiosEnvironment = Readonly<Record<string, string | undefined>>;

export function getCorreiosConfig(env: CorreiosEnvironment = process.env): CorreiosConfig | null {
  const user = env.CORREIOS_API_USER?.trim();
  const apiCode = env.CORREIOS_API_CODE?.trim();
  const postingCard = env.CORREIOS_POSTING_CARD?.trim();
  const contractNumber = env.CORREIOS_CONTRACT_NUMBER?.trim();
  const regionalDirectorate = env.CORREIOS_REGIONAL_DIRECTORATE?.trim();

  if (!user || user.includes(":") || !apiCode || !postingCard || !/^\d+$/.test(postingCard)) return null;
  if (!contractNumber && !regionalDirectorate) return { user, apiCode, postingCard };
  if (!contractNumber || !/^\d+$/.test(contractNumber) || !regionalDirectorate || !/^\d{1,2}$/.test(regionalDirectorate)) return null;

  return { user, apiCode, postingCard, contract: { number: contractNumber, regionalDirectorate } };
}

async function requestJson(request: typeof fetch, url: URL, init: RequestInit): Promise<Record<string, unknown>> {
  const signal = AbortSignal.timeout(requestTimeoutMs);
  let response: Response;
  try {
    response = await request(url, { ...init, cache: "no-store", redirect: "error", signal });
  } catch {
    throw new CorreiosError(503);
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    const unavailable = [401, 403, 429].includes(response.status) || response.status >= 500;
    throw new CorreiosError(unavailable ? 503 : 502);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new CorreiosError(signal.aborted ? 503 : 502);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new CorreiosError(502);
  return data as Record<string, unknown>;
}

function parsePriceCents(value: unknown): number {
  if (typeof value !== "string" || value.trim() !== value || !/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/.test(value)) {
    throw new CorreiosError(502);
  }
  const cents = Number(value.replace(/[.,]/g, ""));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new CorreiosError(502);
  return cents;
}

function postalCode(value: string): string {
  if (value.trim() !== value || !/^\d{5}-?\d{3}$/.test(value)) throw new CorreiosError(502);
  return value.replace("-", "");
}

export async function quoteCorreios(config: CorreiosConfig, input: CorreiosQuoteInput, request = fetch) {
  const postalCodes = {
    cepOrigem: postalCode(input.originPostalCode),
    cepDestino: postalCode(input.destinationPostalCode),
  };
  const parcel = [input.weightGrams, input.lengthCm, input.widthCm, input.heightCm];
  if (parcel.some((value) => value <= 0 || !Number.isSafeInteger(Math.ceil(value)))) throw new CorreiosError(502);

  const contract = config.contract;
  const credentials = Buffer.from(`${config.user}:${config.apiCode}`, "utf8").toString("base64");
  const { token } = await requestJson(request, new URL("/token/v1/autentica/cartaopostagem", correiosOrigin), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
    body: JSON.stringify({
      numero: config.postingCard,
      ...(contract && { contrato: contract.number, dr: Number(contract.regionalDirectorate) }),
    }),
  });
  if (typeof token !== "string" || token.trim() !== token || !/^[A-Za-z0-9._~+/-]+=*$/.test(token)) {
    throw new CorreiosError(502);
  }

  const quoteRequest = {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  };
  const priceParams = new URLSearchParams({
    ...postalCodes,
    psObjeto: String(Math.ceil(input.weightGrams)),
    tpObjeto: "2",
    comprimento: String(Math.ceil(input.lengthCm)),
    largura: String(Math.ceil(input.widthCm)),
    altura: String(Math.ceil(input.heightCm)),
    ...(contract && { nuContrato: contract.number, nuDR: contract.regionalDirectorate }),
  });
  const timeParams = new URLSearchParams(postalCodes);

  const results = await Promise.allSettled(services.map(async (service) => {
    const [price, deadline] = await Promise.all([
      requestJson(request, new URL(`/preco/v1/nacional/${service.code}?${priceParams}`, correiosOrigin), quoteRequest),
      requestJson(request, new URL(`/prazo/v1/nacional/${service.code}?${timeParams}`, correiosOrigin), quoteRequest),
    ]);
    const deliveryDays = deadline.prazoEntrega;
    if (price.coProduto !== service.code || deadline.coProduto !== service.code ||
      typeof deliveryDays !== "number" || !Number.isSafeInteger(deliveryDays) || deliveryDays < 0 ||
      (deadline.entregaDomiciliar !== "S" && deadline.entregaDomiciliar !== "N")) {
      throw new CorreiosError(502);
    }
    if (deadline.entregaDomiciliar !== "S") return null;
    return { ...service, priceCents: parsePriceCents(price.pcFinal), deliveryDays };
  }));

  const quotes = results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  if (results.every((result) => result.status === "rejected")) {
    const unavailable = results.some((result) => result.status === "rejected" && result.reason instanceof CorreiosError && result.reason.status === 503);
    throw new CorreiosError(unavailable ? 503 : 502);
  }
  const unavailableServices = services.filter((_, index) => {
    const result = results[index];
    return result.status === "rejected" || !result.value;
  }).map(({ code }) => code);
  return { quotes, unavailableServices };
}
