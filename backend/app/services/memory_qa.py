import logging
from typing import List, Dict, Any
from ollama import chat

logger = logging.getLogger(__name__)


class MemoryQAService:
    def __init__(self, model: str = "qwen2.5:0.5b"):
        self.model = model

    def answer(self, question: str, memories: List[Dict[str, Any]]) -> str:
        """Answers a user's natural language question grounded strictly in retrieved memories."""
        if not memories:
            return "I couldn't find any memories relevant to that question."

        memory_context = "\n".join(
            [
                (
                    f"- Type: {memory.get('type')}\n"
                    f"  Text: {memory.get('text')}\n"
                    f"  Person: {memory.get('person')}\n"
                    f"  Place: {memory.get('place')}\n"
                    f"  Date: {memory.get('date')}\n"
                    f"  Time: {memory.get('time')}"
                )
                for memory in memories
            ]
        )

        prompt = f"""You are a personal memory assistant.

Answer the user's question using ONLY the memories provided below.

Do not invent information.
If the memories do not contain enough information to answer, state clearly that you do not know or couldn't find that in your memories.

Keep the answer concise, direct, and natural.

MEMORIES:
{memory_context}

USER QUESTION:
{question}
"""

        try:
            response = chat(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )
            return response["message"]["content"].strip()
        except Exception as e:
            logger.error(f"Error during Memory QA: {e}", exc_info=True)
            return f"Error answering question: {str(e)}"


_qa_service: MemoryQAService | None = None


def get_memory_qa_service(model: str = "qwen2.5:0.5b") -> MemoryQAService:
    global _qa_service
    if _qa_service is None:
        _qa_service = MemoryQAService(model=model)
    return _qa_service
