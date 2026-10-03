import shutil
import uuid
import logging
from datetime import date
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
    """Full pipeline: save audio → transcribe → understand → extract memory candidates."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    original_ext = Path(file.filename).suffix or ".webm"
    unique_filename = f"{uuid.uuid4().hex}{original_ext}"
    destination_path = UPLOAD_DIR / unique_filename

    # ── 1. Save audio ────────────────────────────────────────────────────────
    try:
        with destination_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio: {str(e)}")
    finally:
        file.file.close()

    file_size = destination_path.stat().st_size

    # ── 2. Transcribe (Whisper) ───────────────────────────────────────────────
    try:
        transcription_result = get_transcription_service().transcribe(str(destination_path))
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        return _response(unique_filename, file, file_size,
                         transcript="", transcription_error=str(e))

    transcript_text = transcription_result.get("text", "")

    # ── 3. AI Understanding (Ollama) ──────────────────────────────────────────
    understanding_result = None
    if transcript_text:
        try:
            from app.services.understanding import get_understanding_service
            understanding_result = get_understanding_service().understand(transcript_text)
        except Exception as e:
            logger.error(f"Understanding failed: {e}", exc_info=True)
            understanding_result = {"summary": "Understanding failed", "items": [], "error": str(e)}

    # ── 4. Memory Extraction (Phase 4) ────────────────────────────────────────
    memory_candidates = []
    if transcript_text:
        try:
            from app.services.memory_extraction import get_memory_extraction_service
            candidates = get_memory_extraction_service().extract(
                transcript_text,
                current_date=date.today().isoformat(),
            )
            memory_candidates = [m.model_dump() for m in candidates]
        except Exception as e:
            logger.error(f"Memory extraction failed: {e}", exc_info=True)

    return {
        "success": True,
        "filename": unique_filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size_bytes": file_size,
        # Phase 2
        "transcript": transcript_text,
        "language": transcription_result.get("language"),
        "language_probability": transcription_result.get("language_probability"),
        "duration": transcription_result.get("duration"),
        # Phase 3
        "understanding": understanding_result,
        # Phase 4
        "memory_candidates": memory_candidates,
    }


def _response(filename, file, size, transcript="", transcription_error=None):
    return {
        "success": True,
        "filename": filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size_bytes": size,
        "transcript": transcript,
        "transcription_error": transcription_error,
        "understanding": None,
        "memory_candidates": [],
    }
