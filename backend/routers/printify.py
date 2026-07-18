import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
# from utils import get_current_user 
from catalog import APPROVED_BLUEPRINTS
from models import ArtworkUpload, ProductId, ProductCreate
import asyncio
from fastapi_cache.decorator import cache

router = APIRouter(prefix="/printify", tags=["Printify"])

PRINTIFY_API_KEY = os.getenv("PRINTIFY_API_KEY")
PRINTIFY_SHOP_ID = os.getenv("PRINTIFY_SHOP_ID")
PRINTIFY_HEADERS = { 
    "Authorization": f"Bearer {PRINTIFY_API_KEY}", 
    "Content-Type": "application/json" 
}

async def fetch_provider_details(client, blueprint_id, provider):
    variants_task = client.get(
        f"https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers/{provider['id']}/variants.json",
        headers=PRINTIFY_HEADERS,
    )

    shipping_task = client.get(
        f"https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers/{provider['id']}/shipping.json",
        headers=PRINTIFY_HEADERS,
    )

    variants_response, shipping_response = await asyncio.gather(
        variants_task,
        shipping_task,
    )

    provider["variants"] = variants_response.json()["variants"] if variants_response.status_code == 200 else []
    provider["shipping"] = shipping_response.json() if variants_response.status_code == 200 else {}

    return provider

async def fetch_blueprint(client, bp):
    providers_response = await client.get(
        f"https://api.printify.com/v1/catalog/blueprints/{bp['id']}/print_providers.json",
        headers=PRINTIFY_HEADERS,
    )

    providers = providers_response.json()

    providers = await asyncio.gather(
        *[
            fetch_provider_details(client, bp["id"], provider)
            for provider in providers
        ]
    )

    bp["providers"] = providers
    bp["category"] = APPROVED_BLUEPRINTS[bp["id"]]

    return bp


@router.get("/catalog")
@cache(expire=600)
async def get_catalog():
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            "https://api.printify.com/v1/catalog/blueprints.json",
            headers=PRINTIFY_HEADERS,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to load catalog",
            )

        all_blueprints = response.json()

        approved = [
            bp
            for bp in all_blueprints
            if bp["id"] in APPROVED_BLUEPRINTS
        ]

        curated_catalog = await asyncio.gather(
            *[
                fetch_blueprint(client, bp)
                for bp in approved
            ]
        )

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
    catalog = await get_catalog()
    catalog_item = next((item for item in catalog if item["id"] == product.blueprint_id), None)
    if not catalog_item:
        raise HTTPException(status_code=400, detail="Invalid catalog ID")

    blueprint_id = catalog_item["id"]
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
        
        active_variants = []
        variant_ids = []
        for v in variants_data:
            variant_ids.append(v["id"])
            retail_price = v.get("cost", 2500) + catalog_item["markup_cents"]
            active_variants.append({ "id": v["id"], "price": retail_price, "is_enabled": True })

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