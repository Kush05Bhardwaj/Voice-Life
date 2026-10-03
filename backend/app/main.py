from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.audio import router as audio_router
from app.api.memories import router as memories_router
from app.services.transcription import get_transcription_service
from app.services.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    init_db()
    # Pre-warm transcription service on server startup
    get_transcription_service()
    yield


app = FastAPI(
    title="Voice → Life API",
    version="0.5.0",
    lifespan=lifespan,
)

# Configure CORS to permit Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio_router)
app.include_router(memories_router)


@app.get("/")
def root():
    return {
        "message": "Voice → Life API is running"
    }
