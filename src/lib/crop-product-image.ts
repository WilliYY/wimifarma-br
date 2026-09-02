import type { Area } from "react-easy-crop";

const OUTPUT_SIZE = 1600;
const MAX_WORKING_DIMENSION = 4096;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Nao foi possivel abrir a imagem.")));
    image.crossOrigin = "anonymous";
    image.src = source;
  });
}

function rotationSize(width: number, height: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180;
  return {
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
  };
}

function canvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("O navegador nao conseguiu preparar o ajuste da foto.");
  return context;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Nao foi possivel gerar a foto ajustada.")),
      "image/webp",
      0.92,
    );
  });
}

export async function cropProductImage(
  source: string,
  croppedArea: Area,
  rotation: number,
  originalName: string,
) {
  const image = await loadImage(source);
  const workingScale = Math.min(
    1,
    MAX_WORKING_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const workingWidth = Math.max(1, Math.round(image.naturalWidth * workingScale));
  const workingHeight = Math.max(1, Math.round(image.naturalHeight * workingScale));
  const rotated = rotationSize(workingWidth, workingHeight, rotation);
  const rotationCanvas = document.createElement("canvas");
  rotationCanvas.width = Math.ceil(rotated.width);
  rotationCanvas.height = Math.ceil(rotated.height);

  const rotationContext = canvasContext(rotationCanvas);
  rotationContext.translate(rotationCanvas.width / 2, rotationCanvas.height / 2);
  rotationContext.rotate((rotation * Math.PI) / 180);
  rotationContext.drawImage(
    image,
    -workingWidth / 2,
    -workingHeight / 2,
    workingWidth,
    workingHeight,
  );

  const outputCanvas = document.createElement("canvas");
  const outputSize = Math.min(
    OUTPUT_SIZE,
    Math.max(1, Math.round(croppedArea.width * workingScale)),
  );
  outputCanvas.width = outputSize;
  outputCanvas.height = outputSize;
  const outputContext = canvasContext(outputCanvas);
  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, outputSize, outputSize);
  const sourceX = Math.max(0, croppedArea.x * workingScale);
  const sourceY = Math.max(0, croppedArea.y * workingScale);
  const sourceWidth = Math.min(
    croppedArea.width * workingScale,
    rotationCanvas.width - sourceX,
  );
  const sourceHeight = Math.min(
    croppedArea.height * workingScale,
    rotationCanvas.height - sourceY,
  );
  outputContext.drawImage(
    rotationCanvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputSize,
    outputSize,
  );

  const blob = await canvasToBlob(outputCanvas);
  const baseName = originalName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return new File([blob], `${baseName || "produto"}-ajustada.webp`, {
    lastModified: Date.now(),
    type: "image/webp",
  });
}
