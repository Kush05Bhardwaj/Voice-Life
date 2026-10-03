import sys
from pathlib import Path

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Add backend directory to sys.path so app imports cleanly
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.understanding import UnderstandingService


def main():
    service = UnderstandingService(model="qwen2.5:0.5b")
    transcript = (
        "Bro kal 11 baje Rahul ko internship ke documents bhej dena. "
        "Aur usko bol dena ki interview Monday ko hai."
    )
    print("Testing transcript:")
    print(transcript)
    print("-" * 50)
    print("Running understanding service...")
    result = service.understand(transcript)
    print("Result:")
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
