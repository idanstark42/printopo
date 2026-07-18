import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
# from utils import get_current_user 
from catalog import APPROVED_BLUEPRINTS

router = APIRouter(prefix="/printify", tags=["Printify"])

PRINTIFY_API_KEY = os.getenv("PRINTIFY_API_KEY")
PRINTIFY_SHOP_ID = os.getenv("PRINTIFY_SHOP_ID")
PRINTIFY_HEADERS = { 
    "Authorization": f"Bearer {PRINTIFY_API_KEY}", 
    "Content-Type": "application/json" 
}

# ==========================================
# PYDANTIC MODELS
# ==========================================
class ArtworkUpload(BaseModel):
    title: str
    image_data: str

class ProductCreate(BaseModel):
    title: str
    file_id: str
    catalog_id: str  # e.g., "pillow", "poster"

# ==========================================
# ROUTES
# ==========================================
# In backend_routes.py


@router.get("/catalog")
async def get_catalog():
    async with httpx.AsyncClient(timeout=30.0) as client:
        respon = await client.get(
            "https://api.printify.com/v1/catalog/blueprints.json",
            headers=PRINTIFY_HEADERS,
        )
        
        if respon.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to load catalog")
            
        all_blueprints = respon.json()
        
        # Filter the massive list down to just your approved items 
        # and inject your clean categories
        curated_catalog = []
        for bp in all_blueprints:
            if bp["id"] in APPROVED_BLUEPRINTS:
                bp["custom_category"] = APPROVED_BLUEPRINTS[bp["id"]]
                curated_catalog.append(bp)
                
        return curated_catalog


@router.post("/upload-artwork")
async def upload_artwork(artwork: ArtworkUpload): 
    safe_title = artwork.title.replace(" ", "_").lower()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        upload_resp = await client.post(
            "https://api.printify.com/v1/uploads/images.json",
            headers=PRINTIFY_HEADERS,
            json={
                "file_name": f"{safe_title}_map.png",
                "contents": artwork.image_data
            }
        )
        
        if upload_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to upload image")
            
        return {"file_id": upload_resp.json()["id"]}


@router.post("/create-product")
async def create_product(product: ProductCreate): 
    catalog_item = CATALOG.get(product.catalog_id)
    if not catalog_item:
        raise HTTPException(status_code=400, detail="Invalid catalog ID")

    blueprint_id = catalog_item["blueprint_id"]
    provider_id = catalog_item["print_provider_id"]

    async with httpx.AsyncClient(timeout=45.0) as client:
        # 1. DYNAMICALLY FETCH ALL VARIANTS FOR THIS PRODUCT
        variants_resp = await client.get(
            f"https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers/{provider_id}/variants.json",
            headers=PRINTIFY_HEADERS
        )
        
        if variants_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch product variants")
            
        variants_data = variants_resp.json().get("variants", [])
        
        # Build the variants list (setting a default price combining base cost + your markup)
        # Note: If Printify doesn't supply 'cost', we default to a flat $40.00 (4000 cents)
        active_variants = []
        variant_ids = []
        for v in variants_data:
            variant_ids.append(v["id"])
            retail_price = v.get("cost", 2500) + catalog_item["markup_cents"]
            active_variants.append({"id": v["id"], "price": retail_price, "is_enabled": True})

        # 2. BUILD THE PRODUCT PAYLOAD WITH ALL VARIANTS
        product_payload = {
            "title": f"Custom Topo Map - {product.title}",
            "description": "Generated with Printopo Studio",
            "blueprint_id": blueprint_id,
            "print_provider_id": provider_id,
            "variants": active_variants,
            "print_areas": [{
                "variant_ids": variant_ids, # Apply the image to ALL sizes
                "placeholders": [{
                    "position": catalog_item["position"],
                    "images": [{
                        "id": product.file_id,
                        "x": 0.5,
                        "y": 0.5,
                        "scale": 1,
                        "angle": 0
                    }]
                }]
            }]
        }

        # 3. CREATE THE PRODUCT IN PRINTIFY
        product_resp = await client.post(
            f"https://api.printify.com/v1/shops/{PRINTIFY_SHOP_ID}/products.json",
            headers=PRINTIFY_HEADERS,
            json=product_payload
        )
        
        if product_resp.status_code != 200:
            print("PRINTIFY CREATION ERROR:", product_resp.json())
            raise HTTPException(status_code=400, detail="Failed to create Printify product")
            
        product_data = product_resp.json()
        mockups = [img["src"] for img in product_data.get("images", []) if img.get("is_default") or img.get("position") == "front"]
        
        return {
            "mockups": mockups, 
            "printify_product_id": product_data["id"]
        }