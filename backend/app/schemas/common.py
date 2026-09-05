from typing import Any, Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class StandardResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None
    error_code: Optional[str] = None
