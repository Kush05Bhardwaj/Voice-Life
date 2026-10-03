import sys
from pathlib import Path

# Ensure UTF-8 console output for Windows
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Add backend directory to sys.path so app imports cleanly
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.database import init_db
from app.repositories.memory_repository import save_memory, get_all_memories
from app.models.memory import Memory


def main():
    print("Initializing SQLite database...")
    init_db()
    print("Database initialized.")

    test_memory = Memory(
        type="task",
        text="Send internship documents to Rahul",
        person="Rahul",
        date="2026-10-04",
        time="11:00",
        confidence=0.95,
    )

    print("\nSaving test memory:")
    print(test_memory.model_dump())

    memory_id = save_memory(test_memory)
    print(f"\nSaved memory ID: {memory_id}")

    print("\nRetrieving all memories from SQLite:")
    memories = get_all_memories()
    print(f"Total memories found: {len(memories)}")
    for item in memories:
        print(item)


if __name__ == "__main__":
    main()
