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
    assert "understanding" in data
    assert "memory_candidates" in data

    uploaded_copy = UPLOAD_DIR / data["filename"]
    if uploaded_copy.exists():
        uploaded_copy.unlink()


def test_memories_crud():
    sample_memory = {
        "type": "task",
        "text": "Send internship documents to Rahul",
        "person": "Rahul",
        "place": None,
        "date": "2026-10-04",
        "time": "11:00",
        "confidence": 0.95
    }

    # Test POST /api/memories/
    post_res = client.post("/api/memories/", json=sample_memory)
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["success"] is True
    assert post_data["memory"]["text"] == "Send internship documents to Rahul"
    assert post_data["memory"]["person"] == "Rahul"
    assert "id" in post_data["memory"]

    # Test GET /api/memories/
    get_res = client.get("/api/memories/")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["success"] is True
    assert get_data["count"] >= 1
    assert any(m["text"] == "Send internship documents to Rahul" for m in get_data["memories"])


def test_memories_search():
    # Search for matching term
    res_match = client.get("/api/memories/search?query=Rahul")
    assert res_match.status_code == 200
    data_match = res_match.json()
    assert data_match["success"] is True
    assert data_match["count"] >= 1
    assert any(m["person"] == "Rahul" or "Rahul" in m["text"] for m in data_match["memories"])

    # Search for nonexistent term
    res_empty = client.get("/api/memories/search?query=NonExistentTermXYZ123")
    assert res_empty.status_code == 200
    data_empty = res_empty.json()
    assert data_empty["success"] is True
    assert data_empty["count"] == 0
    assert len(data_empty["memories"]) == 0


def test_memories_ask():
    # Ask question that should match stored memory
    res = client.post("/api/memories/ask", json={"question": "What did I need to send Rahul?"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["question"] == "What did I need to send Rahul?"
    assert len(data["answer"]) > 0
    assert len(data["memories_used"]) >= 1


