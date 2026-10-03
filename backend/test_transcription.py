"""
Unit and integration tests for TranscriptionService.

Unit tests (test_transcription_*) use a minimal synthetic WAV and do NOT require
a real voice note or a connected GPU — they verify structure and imports only.

The standalone runner at the bottom (run with `python test_transcription.py`)
will pick up any .ogg / .wav / .webm / .mp3 from uploads/ and run a real
transcription, reporting GPU/CPU usage and transcript quality.
"""
import io
import struct
import sys
import wave
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.transcription import TranscriptionService, _select_device


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_silent_wav(path: Path, duration_sec: float = 0.5, sample_rate: int = 16000) -> None:
    """Write a minimal silent WAV so we can test without a real audio file."""
    n_samples = int(sample_rate * duration_sec)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * n_samples)


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestSelectDevice:
    def test_returns_cuda_when_available(self):
        with patch("app.services.transcription.ctranslate2") as mock_ct, \
             patch("app.services.transcription.ctypes") as mock_ctypes:
            mock_ct.get_cuda_device_count.return_value = 1
            mock_ctypes.cdll.LoadLibrary.return_value = object()  # simulate DLL found
            device, compute = _select_device()
        assert device == "cuda"
        assert compute == "float16"

    def test_falls_back_to_cpu(self):
        with patch("app.services.transcription.ctranslate2") as mock_ct:
            mock_ct.get_cuda_device_count.return_value = 0
            device, compute = _select_device()
        assert device == "cpu"
        assert compute == "int8"


class TestTranscriptionServiceInit:
    def test_initializes_with_explicit_cpu(self):
        """Service must initialize without error on explicit cpu/int8."""
        service = TranscriptionService(model_size="tiny", device="cpu", compute_type="int8")
        assert service.model is not None
        assert service.device == "cpu"
        assert service.model_size == "tiny"

    def test_auto_device_selection_called_when_not_provided(self):
        with patch("app.services.transcription._select_device", return_value=("cpu", "int8")) as mock_sel, \
             patch("app.services.transcription.WhisperModel") as mock_wm:
            mock_wm.return_value = MagicMock()
            TranscriptionService()
        mock_sel.assert_called_once()


class TestTranscriptionOutput:
    """Tests that transcribe() returns the correct response structure."""

    @pytest.fixture(scope="class")
    def service(self):
        return TranscriptionService(model_size="tiny", device="cpu", compute_type="int8")

    @pytest.fixture(scope="class")
    def silent_wav(self, tmp_path_factory):
        p = tmp_path_factory.mktemp("audio") / "silent.wav"
        _make_silent_wav(p)
        return str(p)

    def test_returns_dict(self, service, silent_wav):
        result = service.transcribe(silent_wav)
        assert isinstance(result, dict)

    def test_has_text_key(self, service, silent_wav):
        result = service.transcribe(silent_wav)
        assert "text" in result
        assert isinstance(result["text"], str)

    def test_has_language_key(self, service, silent_wav):
        result = service.transcribe(silent_wav)
        assert "language" in result
        assert isinstance(result["language"], str)

    def test_has_language_probability(self, service, silent_wav):
        result = service.transcribe(silent_wav)
        assert "language_probability" in result
        assert 0.0 <= result["language_probability"] <= 1.0

    def test_has_duration(self, service, silent_wav):
        result = service.transcribe(silent_wav)
        assert "duration" in result
        assert result["duration"] >= 0.0

    def test_no_extra_keys(self, service, silent_wav):
        result = service.transcribe(silent_wav)
        assert set(result.keys()) == {"text", "language", "language_probability", "duration"}


# ---------------------------------------------------------------------------
# Standalone integration runner (not collected by pytest)
# ---------------------------------------------------------------------------

def _run_integration():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

    import ctranslate2 as ct2
    cuda_count = ct2.get_cuda_device_count()
    print(f"\n=== CUDA devices visible to ctranslate2: {cuda_count} ===")

    print("Initialising TranscriptionService (small, auto-device)...")
    service = TranscriptionService()
    print(f"  → model  : {service.model_size}")
    print(f"  → device : {service.device}")

    uploads_dir = Path(__file__).resolve().parent / "uploads"
    audio_files = sorted(
        list(uploads_dir.glob("*.ogg"))
        + list(uploads_dir.glob("*.wav"))
        + list(uploads_dir.glob("*.webm"))
        + list(uploads_dir.glob("*.mp3"))
    )

    if not audio_files:
        print(f"\nNo audio files in {uploads_dir}. Place a voice note there and re-run.")
        return

    for audio_path in audio_files:
        print(f"\nTranscribing: {audio_path.name}")
        result = service.transcribe(str(audio_path))
        print(f"  Language : {result['language']} ({result['language_probability']:.2%})")
        print(f"  Duration : {result['duration']}s")
        print(f"  Transcript:\n    {result['text']}")


if __name__ == "__main__":
    _run_integration()
