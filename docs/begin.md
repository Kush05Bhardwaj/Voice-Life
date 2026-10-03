# 📖 Developer & Beginner Guide

Welcome to the **Voice → Life** codebase! This guide explains how the system is organized, how data flows through it, and how you can begin contributing or experimenting.

---

## 🗂️ Codebase Map

```text
Voice→Life/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── audio.py              # Ingestion endpoint & full processing pipeline
│   │   │   └── memories.py           # CRUD, search, and conversational QA endpoints
│   │   ├── models/
│   │   │   └── memory.py             # Pydantic schema for structured memory objects
│   │   ├── repositories/
│   │   │   └── memory_repository.py  # SQLite database queries & search operations
│   │   ├── services/
│   │   │   ├── database.py           # SQLite connection & schema initialization
│   │   │   ├── memory_extraction.py  # Structured candidate extraction with relative date resolution
│   │   │   ├── memory_qa.py          # Grounded natural language question-answering
│   │   │   ├── transcription.py      # faster-whisper singleton service
│   │   │   └── understanding.py      # Cognitive understanding & categorization
│   │   └── main.py                   # FastAPI application initialization & lifespan
│   ├── test_app.py                   # Pytest integration suite
│   ├── test_transcription.py         # Standalone STT runner
│   ├── test_understanding.py         # Standalone LLM understanding runner
│   ├── test_memory_extraction.py     # Standalone extraction runner
│   ├── test_database.py              # Standalone DB persistence runner
│   ├── test_memory_qa.py             # Standalone QA runner
│   └── requirements.txt              # Frozen Python dependencies
│
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── globals.css           # Tailwind styling configuration
│   │       ├── layout.tsx            # App router layout
│   │       └── page.tsx              # Main UI: Capture, Candidates, Search, QA, Timeline
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── architecture.md               # System diagrams & service lifecycle
│   ├── quickstart.md                 # Running locally step-by-step
│   └── begin.md                      # This guide
│
├── LICENSE                           # Open source MIT license
└── Readme.md                         # Project homepage & roadmap
```

---

## 🔁 The Lifecycle of a Voice Note

Understanding how data moves through the app helps when adding new features:

1. **User Speaks or Uploads**:
   - The frontend records raw audio as `Blob` via `MediaRecorder` or selects an audio file.
   - Dispatched as `multipart/form-data` to `POST /api/audio/upload`.

2. **Transcription (`backend/app/services/transcription.py`)**:
   - `faster-whisper` decodes the audio and produces high-accuracy raw text and detected language codes.

3. **Cognitive Understanding & Extraction (`backend/app/services/memory_extraction.py`)**:
   - The transcript is processed by the local LLM.
   - Using today's calendar date as a reference anchor, relative dates like *"kal"* or *"Monday"* are translated to explicit ISO dates.
   - Candidate memories are formatted into `Memory` schema objects.

4. **Human Review**:
   - Candidates are returned to the browser.
   - The user selects which items are genuine memories by clicking **Confirm & Save**.

5. **Persistence (`backend/app/repositories/memory_repository.py`)**:
   - Confirmed items are written to `voice_life.db`.

6. **Retrieval (`backend/app/api/memories.py`)**:
   - Memories are queried by `GET /api/memories/` (Timeline), `GET /api/memories/search` (Keywords), and `POST /api/memories/ask` (Conversational QA).

---

## 🛠️ How to Experiment

### Trying a Different LLM
To switch models (e.g., from `qwen2.5:0.5b` to `qwen2.5:3b`, `gemma2:2b`, or `llama3.2`):
1. Pull the model:
   ```bash
   ollama pull qwen2.5:3b
   ```
2. Update the default model string in:
   - `backend/app/services/understanding.py`
   - `backend/app/services/memory_extraction.py`
   - `backend/app/services/memory_qa.py`

### Testing Individual Services Standalone
Every service in `backend/` has an isolated test runner script that can be executed without starting the web server:
- `python test_transcription.py`
- `python test_understanding.py`
- `python test_memory_extraction.py`
- `python test_database.py`
- `python test_memory_qa.py`
