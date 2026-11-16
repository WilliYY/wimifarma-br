"use client";

import { useEffect, useState } from "react";
import Image, { getImageProps } from "next/image";
import { Package } from "lucide-react";
import type { CartItem } from "@/components/site/cart-provider";
import { publicProductImageUrl } from "@/features/product-images/private-supplier-policy";
import { isMedicineImagePlaceholder, medicineIllustrationUrl } from "@/features/products/image-placeholder";

const MAX_SIZE = 96;
const CACHE_SIZE = 48;
const CLEAR_ALPHA = 8;
const thumbnails = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

function isNearWhite(data: ImageData["data"], index: number) {
  const offset = index * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const lowest = Math.min(red, green, blue);
  return lowest >= 232 && Math.max(red, green, blue) - lowest <= 14;
}

function hasClearPerimeter({ data, width, height }: ImageData) {
  const lastRow = (height - 1) * width;
  const clear = (index: number) => data[index * 4 + 3] <= CLEAR_ALPHA;
  return clear(0) && clear(width - 1) && clear(lastRow) && clear(lastRow + width - 1)
    && edgeMatches(width, clear) && edgeMatches(width, x => clear(lastRow + x))
    && edgeMatches(height, y => clear(y * width)) && edgeMatches(height, y => clear(y * width + width - 1));
}

function edgeMatches(length: number, matches: (offset: number) => boolean, fraction = 0.2) {
  let count = 0;
  for (let offset = 0; offset < length; offset++) if (matches(offset)) count++;
  return count >= length * fraction;
}

function hasWhiteFrame(image: ImageData) {
  const bounds = visibleBounds(image);
  if (!bounds) return false;
  const { left, right, top, bottom } = bounds;
  const { data, width } = image;
  const spanX = right - left + 1;
  const spanY = bottom - top + 1;
  // Inspect the visible bounds so transparent padding cannot hide a white tile.
  const white = (x: number, y: number) => {
    const index = y * width + x;
    return data[index * 4 + 3] > CLEAR_ALPHA && isNearWhite(data, index);
  };
  return edgeMatches(spanX, x => white(left + x, top), 0.75)
    && edgeMatches(spanX, x => white(left + x, bottom), 0.75)
    && edgeMatches(spanY, y => white(left, top + y), 0.75)
    && edgeMatches(spanY, y => white(right, top + y), 0.75);
}

function removeWhiteBackground(image: ImageData) {
  if (hasClearPerimeter(image) && !hasWhiteFrame(image)) return true;

  const { data, width, height } = image;
  const queue = new Uint16Array(width * height);
  const visited = new Uint8Array(queue.length);
  let end = 0;
  const enqueue = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    if (data[index * 4 + 3] <= CLEAR_ALPHA || isNearWhite(data, index)) queue[end++] = index;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  for (let head = 0; head < end; head++) {
    const index = queue[head];
    const x = index % width;
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index < (height - 1) * width) enqueue(index + width);
  }

  if (end === 0 || end === queue.length) return false;
  for (let index = 0; index < end; index++) data[queue[index] * 4 + 3] = 0;
  return hasClearPerimeter(image) && !hasWhiteFrame(image);
}

function visibleBounds(image: ImageData) {
  const { width, height, data } = image;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let index = 0; index < width * height; index++) {
    if (data[index * 4 + 3] <= CLEAR_ALPHA) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }

  return right < 0 ? null : { left, top, right, bottom };
}

function cropTransparentMargins(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, image: ImageData) {
  const bounds = visibleBounds(image);
  if (!bounds) return false;
  const { left, top, right, bottom } = bounds;
  const { width, height } = image;
  const margin = 2;
  const x = Math.max(0, left - margin);
  const y = Math.max(0, top - margin);
  canvas.width = Math.min(width, right + 1 + margin) - x;
  canvas.height = Math.min(height, bottom + 1 + margin) - y;
  context.putImageData(image, -x, -y);
  return true;
}

async function renderThumbnail(source: string, priority: boolean) {
  const { props } = getImageProps({ alt: "", src: source, width: 64, height: 64 });
  const image = new window.Image();
  image.fetchPriority = priority ? "high" : "auto";
  image.src = props.src;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) return null;

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return removeWhiteBackground(pixels) && cropTransparentMargins(canvas, context, pixels) ? canvas.toDataURL() : null;
}

function getThumbnail(source: string, priority: boolean) {
  const cached = thumbnails.get(source);
  if (cached) {
    thumbnails.delete(source);
    thumbnails.set(source, cached);
    return Promise.resolve(cached);
  }

  const existing = pending.get(source);
  if (existing) return existing;

  const task = renderThumbnail(source, priority).then(result => {
    if (result) {
      if (thumbnails.size >= CACHE_SIZE) {
        const oldest = thumbnails.keys().next().value;
        if (oldest) thumbnails.delete(oldest);
      }
      thumbnails.set(source, result);
    }
    return result;
  }).catch(() => null).finally(() => pending.delete(source));
  pending.set(source, task);
  return task;
}

function localProductImage(candidate: string | null) {
  if (!candidate) return null;
  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin || url.username || url.password) return null;
    if (!/^\/(?:uploads\/products|brand|media)\//.test(url.pathname)) return null;
    if (/%(?:25|2e|2f|5c)/i.test(url.pathname)) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export function BasketThumbnail({ item, priority = false, onReady }: {
  item: CartItem;
  priority?: boolean;
  onReady?: () => void;
}) {
  const candidate = publicProductImageUrl(item);
  const illustration = isMedicineImagePlaceholder(item) ? medicineIllustrationUrl(item) : null;
  const [result, setResult] = useState<{ candidate: string | null; illustration: string | null; src: string } | null>(null);
  const src = result?.candidate === candidate && result.illustration === illustration ? result.src : null;

  useEffect(() => {
    let active = true;
    async function load() {
      const photo = localProductImage(candidate);
      let thumbnail = photo ? await getThumbnail(photo, priority) : null;
      if (!active) return;
      if (!thumbnail && illustration && photo !== illustration) thumbnail = await getThumbnail(illustration, priority);
      if (active) setResult(thumbnail ? { candidate, illustration, src: thumbnail } : null);
    }
    void load();
    return () => { active = false; };
  }, [candidate, illustration, priority]);

  return src ? (
    <Image alt="" className="h-full w-full object-contain" draggable={false} height={96}
      loading="eager"
      onError={() => setResult(null)}
      onLoad={onReady} src={src} width={96} />
  ) : (
    <span className="grid h-full w-full place-items-center text-slate-600" aria-hidden="true">
      <Package className="h-3/4 w-3/4" />
    </span>
  );
}
