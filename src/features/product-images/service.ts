import sharp from "sharp";

export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_PIXELS = 40_000_000;
export const MAX_PRODUCT_IMAGE_DIMENSION = 2000;
export const TARGET_PRODUCT_IMAGE_BYTES = 1_200_000;

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
  return Boolean(process.env.REMOVE_BG_API_KEY?.trim());
}

async function removeBackground(buffer: Buffer, fileName: string, mimeType: string) {
  const apiKey = process.env.REMOVE_BG_API_KEY?.trim();

  if (!apiKey) {
    throw new ProductImageError(
      "A remocao de fundo ainda precisa da chave REMOVE_BG_API_KEY no servidor.",
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

  if (!response.ok) {
    const message = response.status === 402 || response.status === 403
      ? "A remocao de fundo esta sem creditos ou com a chave invalida."
      : "Nao foi possivel remover o fundo desta imagem.";
    throw new ProductImageError(message, 502);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function encodeWebp(buffer: Buffer, dimension: number, quality: number) {
  return sharp(buffer, { limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS })
    .rotate()
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

  let source = input.buffer;
  if (input.removeBackground) {
    source = await removeBackground(input.buffer, input.fileName, input.mimeType);
  }

  const attempts = [
    { dimension: MAX_PRODUCT_IMAGE_DIMENSION, quality: 88 },
    { dimension: 1800, quality: 84 },
    { dimension: 1600, quality: 80 },
    { dimension: 1400, quality: 76 },
    { dimension: 1200, quality: 72 },
    { dimension: 1000, quality: 68 },
  ];

  let result = await encodeWebp(source, attempts[0].dimension, attempts[0].quality);
  for (const attempt of attempts.slice(1)) {
    if (result.info.size <= TARGET_PRODUCT_IMAGE_BYTES) break;
    result = await encodeWebp(source, attempt.dimension, attempt.quality);
  }

  return {
    buffer: result.data,
    height: result.info.height,
    sizeBytes: result.info.size,
    width: result.info.width,
  };
}
