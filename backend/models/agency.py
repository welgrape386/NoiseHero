from pydantic import BaseModel
from typing import Optional

class Agency(BaseModel):
    name: str
    phone: Optional[str] = None
    url: str
    category: str