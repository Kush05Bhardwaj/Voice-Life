from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from app.models.memory import Memory
from app.repositories.memory_repository import (
    save_memory,
    get_all_memories,
    get_memory_by_id,
    search_memories,
)

router = APIRouter(prefix="/api/memories", tags=["memories"])


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
