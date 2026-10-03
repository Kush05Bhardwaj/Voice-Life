import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.api.audio import UPLOAD_DIR
from pathlib import Path

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Voice → Life API is running"}


def test_audio_upload_and_pipeline():
    # Use synthetic test audio file
    synth_path = UPLOAD_DIR / "test_synth.wav"
    assert synth_path.exists()
    
    with synth_path.open("rb") as f:
        response = client.post(
            "/api/audio/upload",
            files={"file": ("test_synth.wav", f, "audio/wav")}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "filename" in data
    assert "transcript" in data
    assert "language" in data
    assert data["duration"] > 0
    # understanding key should be present in response (even if empty or None for non-speech)
    assert "understanding" in data

    # Clean up uploaded copy
    uploaded_copy = UPLOAD_DIR / data["filename"]
    if uploaded_copy.exists():
        uploaded_copy.unlink()
