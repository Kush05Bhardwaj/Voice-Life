import sys
from pathlib import Path

# Ensure UTF-8 console output for Windows
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Add backend directory to sys.path so app imports cleanly
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.memory_qa import MemoryQAService


def main():
    service = MemoryQAService(model="qwen2.5:0.5b")

    memories = [
        {
            "type": "task",
            "text": "Send internship documents to Rahul",
            "person": "Rahul",
            "place": None,
            "date": "2026-10-04",
            "time": "11:00",
        },
        {
            "type": "event",
            "text": "Interview",
            "person": "Rahul",
            "place": None,
            "date": "2026-10-05",
            "time": None,
        },
    ]

    question = "What did I need to send Rahul?"
    print(f"Question: {question}")
    print("Asking MemoryQAService...")
    answer = service.answer(question, memories)
    print("\nAnswer:")
    print(answer)

    # Test unrelated question
    unrelated_question = "What is my favorite Minecraft server?"
    print(f"\nQuestion: {unrelated_question}")
    unrelated_answer = service.answer(unrelated_question, memories)
    print("\nAnswer:")
    print(unrelated_answer)


if __name__ == "__main__":
    main()
