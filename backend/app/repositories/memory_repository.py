from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.models.memory import Memory
from app.services.database import get_connection


def save_memory(memory: Memory) -> int:
    connection = get_connection()
    cursor = connection.execute(
        """
        INSERT INTO memories (
            type,
            text,
            person,
            place,
            date,
            time,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            memory.type,
            memory.text,
            memory.person,
            memory.place,
            memory.date,
            memory.time,
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    connection.commit()
    memory_id = cursor.lastrowid
    connection.close()
    return memory_id


def get_all_memories() -> List[Dict[str, Any]]:
    connection = get_connection()
    rows = connection.execute(
        """
        SELECT *
        FROM memories
        ORDER BY created_at DESC
        """
    ).fetchall()
    connection.close()
    return [dict(row) for row in rows]


def get_memory_by_id(memory_id: int) -> Optional[Dict[str, Any]]:
    connection = get_connection()
    row = connection.execute(
        """
        SELECT *
        FROM memories
        WHERE id = ?
        """,
        (memory_id,)
    ).fetchone()
    connection.close()
    return dict(row) if row else None


def search_memories(query: str) -> List[Dict[str, Any]]:
    connection = get_connection()
    search_pattern = f"%{query}%"
    rows = connection.execute(
        """
        SELECT *
        FROM memories
        WHERE
            text LIKE ?
            OR type LIKE ?
            OR person LIKE ?
            OR place LIKE ?
            OR date LIKE ?
            OR time LIKE ?
        ORDER BY created_at DESC
        """,
        (
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
        ),
    ).fetchall()
    connection.close()
    return [dict(row) for row in rows]


