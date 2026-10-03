import os
import sys
from pathlib import Path

# Ensure stdout/stderr use utf-8 so arrow characters in directory names don't fail in Windows console
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Add backend directory to sys.path so app imports cleanly
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.transcription import TranscriptionService


def main():
    service = TranscriptionService(model_size="tiny", device="cpu", compute_type="int8")
    
    uploads_dir = Path(__file__).resolve().parent / "uploads"
    audio_files = list(uploads_dir.glob("*.wav")) + list(uploads_dir.glob("*.webm")) + list(uploads_dir.glob("*.mp3"))

    if not audio_files:
        print(f"No audio files found in {uploads_dir}. Please place a test audio file there.")
        return

    sample_audio = str(audio_files[0])
    print(f"Transcribing: {sample_audio}")
    result = service.transcribe(sample_audio)
    print("Transcription result:", result)


if __name__ == "__main__":
    main()
