import ctypes
import logging
import av
import ctranslate2
from faster_whisper import WhisperModel

# Compatibility fix: av 19+ removed the deprecated 'metadata_errors' keyword argument
# that faster_whisper passes to av.open. We safely strip it if present.
_orig_av_open = av.open


def _safe_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _orig_av_open(*args, **kwargs)


av.open = _safe_av_open

logger = logging.getLogger(__name__)


def _select_device() -> tuple[str, str]:
    """Return (device, compute_type) using CUDA if runtime libs are present, else CPU int8.

    ctranslate2.get_cuda_device_count() detects the GPU via the CUDA driver but does
    NOT verify that compute libraries (cuBLAS, cuDNN) are loadable. We probe with a
    tiny allocation to catch missing DLL errors before loading the full Whisper model.
    """
    cuda_count = ctranslate2.get_cuda_device_count()
    if cuda_count == 0:
        logger.warning("No CUDA device detected. Using CPU int8.")
        return "cpu", "int8"

    # Probe: verify cuBLAS runtime DLL is loadable before committing to CUDA.
    # ctranslate2 detects the GPU via the CUDA *driver* (always present on this machine)
    # but compute libs (cuBLAS, cuDNN) are separate. If they are missing the model will
    # crash mid-transcription. Check for the DLL now and fall back early with a clear message.
    try:
        ctypes.cdll.LoadLibrary("cublas64_12")
        logger.info(f"CUDA probe passed ({cuda_count} device(s)). Using float16.")
        return "cuda", "float16"
    except OSError:
        logger.warning(
            "CUDA device detected but cublas64_12.dll is not loadable. "
            "To enable GPU: pip install nvidia-cublas-cu12 nvidia-cudnn-cu12. "
            "Falling back to CPU int8."
        )
        return "cpu", "int8"


class TranscriptionService:
    def __init__(
        self,
        model_size: str = "small",
        device: str | None = None,
        compute_type: str | None = None,
    ):
        if device is None or compute_type is None:
            device, compute_type = _select_device()

        logger.info(f"Loading WhisperModel: {model_size} on {device} ({compute_type})...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self.device = device
        self.model_size = model_size
        logger.info(f"WhisperModel '{model_size}' loaded on {device}.")

    def transcribe(self, audio_path: str) -> dict:
        """Transcribes audio and returns text, detected language, and confidence.

        Key settings to reduce hallucination on Hinglish voice notes:
        - vad_filter=True            : silence segments are removed before decoding
        - condition_on_previous_text=False : prevents repetition/looping across segments
        - beam_size=5                : strong beam search (default anyway, kept explicit)
        """
        segments, info = self.model.transcribe(
            audio_path,
            task="translate",
            beam_size=5,
            # --- anti-hallucination settings ---
            # Penalise repeated tokens within a segment (fixes "वाली है वाली है")
            repetition_penalty=1.2,
            # Block any 3-gram from appearing twice in the same segment
            no_repeat_ngram_size=3,
            # Discard segments whose text is suspiciously compressible (repetitive)
            compression_ratio_threshold=2.0,
            # Treat long silences as potential hallucination boundaries
            hallucination_silence_threshold=2.0,
            # Guide Whisper to output in Latin/Roman script for Hinglish speech rather than pure Devanagari
            initial_prompt="This is a Hinglish conversation with mixed English and Hindi words written in Roman English script, jaise ki ye meeting kal hai or let's discuss cloud computing.",
            condition_on_previous_text=False,
            # Remove silence before decoding → fewer spurious segments
            vad_filter=True,
        )

        # Segments is a lazy generator — iterate once and join
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
