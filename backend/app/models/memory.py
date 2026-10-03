from pydantic import BaseModel, ConfigDict
from typing import Optional


class Memory(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "type": "task",
                "text": "Send internship documents to Rahul",
                "person": "Rahul",
                "place": None,
                "date": "2026-10-04",
                "time": "11:00",
                "confidence": 0.95,
            }
        }
    )

    type: str                    # task | event | person | place | fact | plan | reminder
    text: str                    # core content of the memory
    person: Optional[str] = None # person associated with this memory
    place: Optional[str] = None  # place associated with this memory
    date: Optional[str] = None   # ISO date string e.g. "2026-10-04"
    time: Optional[str] = None   # 24h time string e.g. "11:00"
    confidence: Optional[float] = None  # 0.0–1.0

