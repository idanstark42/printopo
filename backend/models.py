from pydantic import BaseModel
from typing import List, Optional

# ==========================================
# USER MODELS
# ==========================================
class UserAuth(BaseModel):
    email: str
    password: str

# ==========================================
# DESIGN MODELS
# ==========================================
class DesignBase(BaseModel):
    """The core fields shared across all design states."""
    title: str
    product: str
    lng: float
    lat: float
    zoom: float
    pitch: float
    bearing: float
    style: str

class DesignCreate(DesignBase):
    """What the frontend sends. Notice it lacks an ID and user_id."""
    image_data: str

from typing import Optional

class DesignUpdate(BaseModel):
    """What the frontend sends when updating. All fields are optional."""
    title: Optional[str] = None
    lng: Optional[float] = None
    lat: Optional[float] = None
    zoom: Optional[float] = None
    style_id: Optional[str] = None
    product_sku: Optional[str] = None

class DesignInDB(DesignBase):
    """What the database holds and returns."""
    id: str
    user_id: str

# ==========================================
# CART & CHECKOUT MODELS
# ==========================================
class CartItem(BaseModel):
    design_id: str
    quantity: int

class CheckoutRequest(BaseModel):
    cart_items: List[CartItem]
    shipping_address: dict