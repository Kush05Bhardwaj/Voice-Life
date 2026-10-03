import json
import logging
import re
from typing import Any, Dict, List
import ollama

logger = logging.getLogger(__name__)


class UnderstandingService:
    def __init__(self, model: str = "qwen2.5:0.5b"):
        self.model = model

    def understand(self, transcript: str) -> Dict[str, Any]:
        """Extracts structured understanding (summary, items) from transcript via Ollama."""
        if not transcript or not transcript.strip():
            return {
                "summary": "No speech detected in audio.",
                "items": []
            }

        prompt = f"""You are the AI understanding engine for a personal memory assistant.
Analyze the following voice transcript.
Extract useful information such as:
- tasks
- events
- people
- places
- important facts
- plans
- reminders

Do not invent information.
Return ONLY valid JSON in this exact structure without markdown ticks or other text:
{{
  "summary": "short summary",
  "items": [
    {{
      "type": "task | event | person | place | fact | plan | reminder",
      "text": "information extracted from the transcript"
    }}
  ]
}}

Transcript:
{transcript}"""

        try:
            response = ollama.chat(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                format="json",  # Enforce JSON output mode in Ollama
            )
            content = response["message"]["content"].strip()
            
            # Remove any potential markdown fencing
            content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.MULTILINE)
            content = re.sub(r"\s*```$", "", content, flags=re.MULTILINE).strip()

            parsed = json.loads(content)

            # Ensure expected keys exist
            if not isinstance(parsed, dict):
                parsed = {"summary": str(parsed), "items": []}
            if "summary" not in parsed:
                parsed["summary"] = ""
            if "items" not in parsed or not isinstance(parsed["items"], list):
                parsed["items"] = []

            return parsed

        except Exception as e:
            logger.error(f"Error during LLM understanding: {e}", exc_info=True)
            return {
                "summary": "Unable to extract understanding from transcript.",
                "items": [],
                "error": str(e)
            }


_understanding_service: UnderstandingService | None = None


def get_understanding_service(model: str = "qwen2.5:0.5b") -> UnderstandingService:
    global _understanding_service
    if _understanding_service is None:
        _understanding_service = UnderstandingService(model=model)
    return _understanding_service
