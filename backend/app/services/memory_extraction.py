import json
import logging
import re
from datetime import date
from typing import List
import ollama
from app.models.memory import Memory

logger = logging.getLogger(__name__)


EXTRACTION_PROMPT = """\
You are a memory extraction system. Extract memories from a voice transcript.

Today is {current_date}. Resolve relative dates:
- "kal" or "tomorrow" = the day after today
- "aaj" or "today" = today
- A weekday name = the next upcoming occurrence of that day

Return ONLY a JSON object. No explanation. No markdown.

Format:
{{
  "memories": [
    {{
      "type": "task|event|person|place|fact|plan|reminder",
      "text": "brief description",
      "person": "name or null",
      "place": "place or null",
      "date": "YYYY-MM-DD or null",
      "time": "HH:MM or null",
      "confidence": 0.9
    }}
  ]
}}

Transcript: {transcript}
"""


class MemoryExtractionService:
    def __init__(self, model: str = "qwen2.5:0.5b"):
        self.model = model

    def extract(self, transcript: str, current_date: str | None = None) -> List[Memory]:
        """Extract memory candidates from transcript. Does NOT save — returns candidates only."""
        if not transcript or not transcript.strip():
            return []

        if current_date is None:
            current_date = date.today().isoformat()

        prompt = EXTRACTION_PROMPT.format(
            current_date=current_date,
            transcript=transcript.strip(),
        )

        try:
            response = ollama.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                format="json",
            )
            content = response["message"]["content"].strip()

            # Strip potential markdown fences
            content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.MULTILINE)
            content = re.sub(r"\s*```$", "", content, flags=re.MULTILINE).strip()

            parsed = json.loads(content)

            raw_memories = parsed.get("memories", [])
            if not isinstance(raw_memories, list):
                raw_memories = []

            memories: List[Memory] = []
            for item in raw_memories:
                if not isinstance(item, dict):
                    continue
                try:
                    memories.append(Memory(**item))
                except Exception as e:
                    logger.warning(f"Skipping invalid memory item {item!r}: {e}")
                    continue

            return memories

        except Exception as e:
            logger.error(f"Memory extraction failed: {e}", exc_info=True)
            return []


_extraction_service: MemoryExtractionService | None = None


def get_memory_extraction_service(model: str = "qwen2.5:0.5b") -> MemoryExtractionService:
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = MemoryExtractionService(model=model)
    return _extraction_service
