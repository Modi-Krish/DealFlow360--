from typing import Optional
from pydantic import Field
from app.models.base import BaseModel
from beanie import Document

class Category(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    
    class Settings:
        name = "categories"
