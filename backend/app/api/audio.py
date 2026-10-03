import os
import shutil
import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.transcription import get_transcription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audio", tags=["audio"])

# Ensure uploads directory exists
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    """Receives an audio file, saves it to uploads/, and transcribes it via Faster-Whisper."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    original_ext = Path(file.filename).suffix
    if not original_ext:
        original_ext = ".webm"

    unique_filename = f"{uuid.uuid4().hex}{original_ext}"
    destination_path = UPLOAD_DIR / unique_filename

    try:
        with destination_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")
    finally:
        file.file.close()

    file_size = destination_path.stat().st_size

    # Perform transcription
    try:
        transcription_service = get_transcription_service()
        transcription_result = transcription_service.transcribe(str(destination_path))
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        return {
            "success": True,
            "filename": unique_filename,
            "original_name": file.filename,
            "content_type": file.content_type,
            "size_bytes": file_size,
            "transcript": "",
            "transcription_error": f"Transcription error: {str(e)}",
        }

    return {
        "success": True,
        "filename": unique_filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size_bytes": file_size,
        "transcript": transcription_result["text"],
        "language": transcription_result["language"],
        "language_probability": transcription_result["language_probability"],
        "duration": transcription_result["duration"],
    }

