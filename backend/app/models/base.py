from datetime import datetime, timezone
from pydantic import Field
from beanie import Document

class BaseModel(Document):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
