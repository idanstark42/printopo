from pydantic import BaseModel
from typing import List, Optional, List

# ==========================================
# USER MODELS
# ==========================================
class UserAuth(BaseModel):
    email: str
    password: str

# ==========================================
# DESIGN MODELS - A design define the point in the map and the view of that point
# ==========================================

class DesignBase(BaseModel):
    """The core fields shared across all design states."""
    title: str
    lng: float
    lat: float
    zoom: float
    pitch: float
    bearing: float
    style: str

class DesignCreate(DesignBase):
    """What the frontend sends. Notice it lacks an ID and user_id."""
    pass

class DesignUpdate(BaseModel):
    """What the frontend sends when updating. All fields are optional."""
    title: Optional[str] = None
    lng: Optional[float] = None
    lat: Optional[float] = None
    zoom: Optional[float] = None
    pitch: Optional[float] = None
    bearing: Optional[float] = None
    style: Optional[str] = None
    products: Optional[List[str]] = []

class DesignInDB(DesignBase):
    """What the database holds and returns."""
    id: str
    user_id: str
    products: List[str]

class ArtworkUpload(BaseModel):
    title: str
    image_data: str

class ProductId(BaseModel):
    blueprint_id: int

class ProductCreate(DesignInDB):
    blueprint_id: int


# ==========================================
# CART & CHECKOUT MODELS
# ==========================================
class CartItem(BaseModel):
    product_id: str
    quantity: int

class CheckoutRequest(BaseModel):
    cart_items: List[CartItem]
    shipping_address: dict