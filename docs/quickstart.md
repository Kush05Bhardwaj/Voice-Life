# 🚀 Quick Start Guide

Get Voice → Life running locally on your machine in under 5 minutes.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

1. **Python 3.10+** (Python 3.11–3.14 supported)
2. **Node.js 18+** & **npm**
3. **[Ollama](https://ollama.com/)** (for local open-weight LLM inference)

---

## 1. Start Ollama

Make sure Ollama is running and pull the model:

```bash
ollama serve
```

In a separate terminal, pull the model:

```bash
ollama pull qwen2.5:0.5b
```

*(Optional: For higher reasoning accuracy, pull `qwen2.5:3b`)*.

---

## 2. Set Up & Run the Backend

Open a terminal in the project directory:

```bash
cd backend
```

### Windows (PowerShell)
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload
```

### macOS / Linux
```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload
```

The backend API will be live at:
- **API URL:** `http://127.0.0.1:8000`
- **Swagger Documentation:** `http://127.0.0.1:8000/docs`

---

## 3. Set Up & Run the Frontend

Open another terminal in the project directory:

```bash
cd frontend
```

Install packages and launch development server:

```bash
npm install
npm run dev
```

Open your browser to:
👉 **`http://localhost:3000`**

---

## 4. Run the Test Suite

To verify all backend components (Whisper transcription, Ollama understanding, extraction, SQLite storage, search, and QA):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -v
```

All 5 core integration tests should pass:
- `test_root`
- `test_audio_upload_and_pipeline`
- `test_memories_crud`
- `test_memories_search`
- `test_memories_ask`
