from datetime import datetime, timezone
from pydantic import Field
from beanie import Document

class BaseModel(Document):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def get_pymongo_collection(cls):
        """Compatibility shim for Motor/Pymongo collection access across Beanie versions."""
        if hasattr(cls, 'get_motor_collection'):
            return cls.get_motor_collection()
        return super().get_pymongo_collection()
