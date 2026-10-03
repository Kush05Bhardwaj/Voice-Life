import logging
import av
from faster_whisper import WhisperModel

# Compatibility fix: av 19+ removed the deprecated 'metadata_errors' keyword argument
# that faster_whisper passes to av.open. We safely strip it if present.
_orig_av_open = av.open


def _safe_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _orig_av_open(*args, **kwargs)


av.open = _safe_av_open

logger = logging.getLogger(__name__)


class TranscriptionService:
    def __init__(self, model_size: str = "tiny", device: str = "cpu", compute_type: str = "int8"):
        logger.info(f"Loading WhisperModel: {model_size} on {device} ({compute_type})...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        logger.info("WhisperModel loaded successfully.")

    def transcribe(self, audio_path: str):
        """Transcribes the audio file and returns text, detected language, and confidence."""
        segments, info = self.model.transcribe(audio_path, beam_size=5)
        # Segments is a generator; iterating over it runs transcription
        text_segments = [segment.text.strip() for segment in segments]
        text = " ".join(text_segments).strip()

        return {
            "text": text,
            "language": info.language,
            "language_probability": round(info.language_probability, 4) if info.language_probability else 0.0,
            "duration": round(info.duration, 2) if info.duration else 0.0,
        }


# Singleton instance shared across requests
_transcription_service: TranscriptionService | None = None


def get_transcription_service() -> TranscriptionService:
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = TranscriptionService()
    return _transcription_service
