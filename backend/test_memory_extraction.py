import sys
import json
from pathlib import Path
from datetime import date

# UTF-8 for Windows console
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Add backend dir to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.memory_extraction import MemoryExtractionService


def main():
    service = MemoryExtractionService(model="qwen2.5:0.5b")

    transcript = (
        "Bro kal 11 baje Rahul ko internship ke documents bhej dena. "
        "Aur usko bol dena ki interview Monday ko hai."
    )

    current_date = date.today().isoformat()

    print("Transcript:")
    print(transcript)
    print(f"\nCurrent date: {current_date}")
    print("-" * 50)
    print("Extracting memory candidates...\n")

    memories = service.extract(transcript, current_date=current_date)

    if not memories:
        print("No memories extracted.")
        return

    print(f"{len(memories)} memory candidate(s) extracted:\n")
    for i, memory in enumerate(memories, 1):
        print(f"Memory {i}:")
        print(json.dumps(memory.model_dump(), indent=2, ensure_ascii=False))
        print()


if __name__ == "__main__":
    main()
