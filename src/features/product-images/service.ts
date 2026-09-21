import sharp from "sharp";
import { imageProvenanceXmp } from "./provenance";

export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_PIXELS = 40_000_000;
export const MAX_PRODUCT_IMAGE_DIMENSION = 1600;
export const TARGET_PRODUCT_IMAGE_BYTES = 350_000;
const MAX_REMOVED_IMAGE_BYTES = 16 * 1024 * 1024;

export const ACCEPTED_PRODUCT_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ProcessedProductImage = {
  buffer: Buffer;
  height: number;
  sizeBytes: number;
  width: number;
};

export class ProductImageError extends Error {
  constructor(
    message: string,
    public readonly status = 422,
  ) {
    super(message);
  }
}

export function isBackgroundRemovalAvailable() {
  return Boolean(
    localBackgroundRemovalUrl() ||
      process.env.REMOVE_BG_API_KEY?.trim(),
  );
}

function localBackgroundRemovalUrl() {
  const value = process.env.BACKGROUND_REMOVAL_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return null;
    }
    url.pathname = `${url.pathname.replace(/\/$/, "")}/api/remove`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function readBackgroundRemovalResponse(response: Response) {
  if (!response.ok) {
    throw new ProductImageError(
      response.status === 402 || response.status === 403
        ? "A remocao de fundo esta sem creditos ou com a configuracao invalida."
        : "Nao foi possivel remover o fundo desta imagem.",
      502,
    );
  }

  if (!response.headers.get("content-type")?.startsWith("image/")) {
    throw new ProductImageError("A remocao de fundo devolveu um arquivo invalido.", 502);
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_REMOVED_IMAGE_BYTES) {
    throw new ProductImageError("A imagem processada ficou grande demais.", 502);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new ProductImageError("A IA retornou uma imagem vazia.", 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REMOVED_IMAGE_BYTES) {
        await reader.cancel();
        throw new ProductImageError("A imagem processada ficou grande demais.", 502);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

async function removeBackground(buffer: Buffer, fileName: string, mimeType: string) {
  const localUrl = localBackgroundRemovalUrl();
  if (localUrl) {
    const formData = new FormData();
    const imageBytes = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(imageBytes).set(buffer);
    formData.set("file", new Blob([imageBytes], { type: mimeType }), fileName);

    const response = await fetch(localUrl, {
      body: formData,
      method: "POST",
      signal: AbortSignal.timeout(90_000),
    }).catch(() => null);

    if (!response) {
      throw new ProductImageError(
        "A IA local de remocao de fundo nao respondeu. Tente novamente.",
        502,
      );
    }
    return readBackgroundRemovalResponse(response);
  }

  const apiKey = process.env.REMOVE_BG_API_KEY?.trim();

  if (!apiKey) {
    throw new ProductImageError(
      "A remocao de fundo ainda nao esta configurada no servidor.",
      503,
    );
  }

  const formData = new FormData();
  const imageBytes = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(imageBytes).set(buffer);
  formData.set("image_file", new Blob([imageBytes], { type: mimeType }), fileName);
  formData.set("format", "webp");
  formData.set("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    body: formData,
    headers: { "X-Api-Key": apiKey },
    method: "POST",
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null);

  if (!response) {
    throw new ProductImageError(
      "O servico de remocao de fundo nao respondeu. Tente novamente.",
      502,
    );
  }

  return readBackgroundRemovalResponse(response);
}

async function encodeWebp(
  buffer: Buffer,
  dimension: number,
  quality: number,
  flattenOnWhite: boolean,
  provenance?: string,
) {
  let pipeline = sharp(buffer, { limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS }).rotate();
  if (provenance) pipeline = pipeline.withXmp(provenance);
  if (flattenOnWhite) pipeline = pipeline.flatten({ background: "#ffffff" });

  return pipeline
    .resize({
      fit: "inside",
      height: dimension,
      width: dimension,
      withoutEnlargement: true,
    })
    .webp({
      alphaQuality: 100,
      effort: 5,
      quality,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true });
}

export async function processProductImage(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  removeBackground: boolean;
}): Promise<ProcessedProductImage> {
  const metadata = await sharp(input.buffer, {
    limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS,
  }).metadata().catch(() => {
    throw new ProductImageError("O arquivo enviado nao e uma imagem valida.");
  });

  if (!metadata.width || !metadata.height) {
    throw new ProductImageError("A imagem nao possui dimensoes validas.");
  }
  if ((metadata.pages ?? 1) > 1) throw new ProductImageError("Escolha uma foto estatica, sem animacao.");

  let source = input.buffer;
  const provenance = imageProvenanceXmp(metadata.xmp, /arte-ilustrativa|arte-gerada/i.test(input.fileName));
  if (input.removeBackground) {
    const workingImage = await sharp(source, { limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS })
      .rotate().resize({ width: MAX_PRODUCT_IMAGE_DIMENSION, height: MAX_PRODUCT_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 3 }).toBuffer();
    source = await removeBackground(workingImage, "produto.png", "image/png");
    const preview = await sharp(source, { limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS })
      .resize({ width: 128, height: 128, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let foreground = 0;
    for (let i = preview.info.channels - 1; i < preview.data.length; i += preview.info.channels) {
      if (preview.data[i] > 32) foreground++;
    }
    const coverage = foreground / (preview.info.width * preview.info.height);
    if (coverage < 0.005 || coverage > 0.999) {
      throw new ProductImageError("Nao foi possivel separar o produto com seguranca. A foto original foi preservada; ajuste o recorte ou use sem remover o fundo.");
    }
  }

  const attempts = [
    { dimension: MAX_PRODUCT_IMAGE_DIMENSION, quality: 88 },
    { dimension: 1400, quality: 84 },
    { dimension: 1200, quality: 80 },
    { dimension: 1100, quality: 76 },
    { dimension: 1000, quality: 72 },
    { dimension: 800, quality: 68 },
  ];

  let result = await encodeWebp(
    source,
    attempts[0].dimension,
    attempts[0].quality,
    input.removeBackground,
    provenance,
  );
  for (const attempt of attempts.slice(1)) {
    if (result.info.size <= TARGET_PRODUCT_IMAGE_BYTES) break;
    result = await encodeWebp(
      source,
      attempt.dimension,
      attempt.quality,
      input.removeBackground,
      provenance,
    );
  }

  if (result.info.size > TARGET_PRODUCT_IMAGE_BYTES) {
    throw new ProductImageError("A foto continua muito pesada. Recorte a area do produto e tente novamente.");
  }

  return {
    buffer: result.data,
    height: result.info.height,
    sizeBytes: result.info.size,
    width: result.info.width,
  };
}
