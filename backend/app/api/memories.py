import re
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.models.memory import Memory
from app.repositories.memory_repository import (
    save_memory,
    get_all_memories,
    get_memory_by_id,
    search_memories,
)
from app.services.memory_qa import get_memory_qa_service

router = APIRouter(prefix="/api/memories", tags=["memories"])


class MemoryQuestion(BaseModel):
    question: str


@router.post("/", response_model=Dict[str, Any])
def create_memory(memory: Memory):
    """Save a confirmed memory object to SQLite."""
    try:
        memory_id = save_memory(memory)
        saved = get_memory_by_id(memory_id)
        return {
            "success": True,
            "memory": saved
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {str(e)}")


@router.get("/", response_model=Dict[str, Any])
def get_memories():
    """Retrieve all stored memories ordered by creation date."""
    try:
        memories = get_all_memories()
        return {
            "success": True,
            "count": len(memories),
            "memories": memories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch memories: {str(e)}")


@router.get("/search", response_model=Dict[str, Any])
def search(query: str = Query(..., min_length=1)):
    """Search stored memories using keyword search across all fields."""
    try:
        memories = search_memories(query)
        return {
            "success": True,
            "query": query,
            "count": len(memories),
            "memories": memories,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/ask", response_model=Dict[str, Any])
def ask_memories(request: MemoryQuestion):
    """Answers a user's natural language question about their stored memories."""
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # 1. First attempt full phrase search
    matched_memories = search_memories(question)

    # 2. If no direct full-phrase match, extract keywords (words > 2 chars) and query
    if not matched_memories:
        words = re.findall(r"\b[A-Za-z0-9_]{3,}\b", question)
        # Filter common stopwords
        stopwords = {"what", "when", "where", "which", "who", "whom", "whose", "why", "how", "did", "does", "have", "the", "and", "for", "with", "about"}
        keywords = [w for w in words if w.lower() not in stopwords]
        
        seen_ids = set()
        for kw in keywords:
            for mem in search_memories(kw):
                if mem["id"] not in seen_ids:
                    seen_ids.add(mem["id"])
                    matched_memories.append(mem)

    # 3. If question is broad like "What tasks do I have?", fallback to all memories if count is reasonable
    if not matched_memories and any(w in question.lower() for w in ["task", "tasks", "everything", "all", "memories", "plans"]):
        matched_memories = get_all_memories()[:20]

    # 4. Generate answer via LLM
    qa_service = get_memory_qa_service()
    answer = qa_service.answer(question, matched_memories)

    return {
        "success": True,
        "question": question,
        "answer": answer,
        "memories_used": matched_memories,
    }
