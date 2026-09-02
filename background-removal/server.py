import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from rembg import new_session, remove

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ACCEPTED_IMAGE_TYPES = {
    "image/avif",
    "image/jpeg",
    "image/png",
    "image/webp",
}

app = FastAPI(docs_url=None, openapi_url=None, redoc_url=None)
session = new_session("u2net")


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
        output = await run_in_threadpool(
            remove,
            content,
            session=session,
            post_process_mask=True,
            decontaminate=True,
        )
    except Exception as error:
        raise HTTPException(status_code=422, detail="Image processing failed") from error

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
