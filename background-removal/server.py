import asyncio
import io
import os
import warnings

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from rembg import new_session, remove
from PIL import Image, ImageOps

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ACCEPTED_IMAGE_TYPES = {
    "image/avif",
    "image/jpeg",
    "image/png",
    "image/webp",
}

app = FastAPI(docs_url=None, openapi_url=None, redoc_url=None)
session = new_session("u2net")
processing_slot = asyncio.Semaphore(1)
Image.MAX_IMAGE_PIXELS = 40_000_000


def process_image(content: bytes) -> bytes:
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(content)) as original:
            original.load()
            image = ImageOps.exif_transpose(original).convert("RGBA")
    image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    # Matting refines edges; avoid decontamination changing the package colors.
    result = remove(image, session=session, alpha_matting=True,
                    alpha_matting_foreground_threshold=240,
                    alpha_matting_background_threshold=10,
                    alpha_matting_erode_size=5, post_process_mask=False)
    output = io.BytesIO()
    result.save(output, format="PNG")
    return output.getvalue()


@app.get("/health")
def health() -> dict[str, str]:
    return {"model": "u2net", "status": "ready"}


@app.post("/api/remove")
async def remove_background(file: UploadFile = File(...)) -> Response:
    if file.content_type not in ACCEPTED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type")

    content = await file.read(MAX_IMAGE_BYTES + 1)
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB")

    try:
        await asyncio.wait_for(processing_slot.acquire(), timeout=2)
    except TimeoutError as error:
        raise HTTPException(status_code=429, detail="Image processor busy") from error
    try:
        output = await run_in_threadpool(process_image, content)
    except Exception as error:
        raise HTTPException(status_code=422, detail="Image processing failed") from error
    finally:
        processing_slot.release()

    return Response(content=output, media_type="image/png")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=7000,
        workers=1,
        log_level=os.getenv("LOG_LEVEL", "warning"),
    )
