import os
import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException
from models import CheckoutRequest
from utils import get_current_user, supabase

router = APIRouter(prefix="/checkout", tags=["Checkout"])

PRINTIFY_API_KEY = os.getenv("PRINTIFY_API_KEY")
PRINTIFY_SHOP_ID = os.getenv("PRINTIFY_SHOP_ID")
PRINTIFY_HEADERS = {"Authorization": f"Bearer {PRINTIFY_API_KEY}", "Content-Type": "application/json"}

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.post("/")
async def process_purchase(checkout: CheckoutRequest, payment_intent_id: str, user=Depends(get_current_user)):
    
    # 1. VERIFY DESIGN OWNERSHIP
    for item in checkout.cart_items:
        design_res = supabase.table("designs").select("user_id").eq("id", item.design_id).execute()
        if not design_res.data or design_res.data[0]["user_id"] != user.id:
            raise HTTPException(status_code=403, detail=f"Unauthorized access to design {item.design_id}")

    # 2. VERIFY STRIPE HOLD (Auth)
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        # We ensure the funds are successfully held, but not yet captured
        if intent.status != 'requires_capture':
            raise HTTPException(status_code=402, detail="Payment has not been authorized. Cannot proceed.")
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # 3. ROUTE TO PRINTIFY
    order_payload = {
        "external_id": f"order_{user.id}_{payment_intent_id}", 
        "line_items": [
            {"product_id": "draft_product_id", "variant_id": 3105, "quantity": item.quantity} 
            for item in checkout.cart_items
        ],
        "shipping_method": 1,
        "send_shipping_notification": True,
        "address_to": checkout.shipping_address
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.printify.com/v1/shops/{PRINTIFY_SHOP_ID}/orders.json",
            headers=PRINTIFY_HEADERS,
            json=order_payload
        )
        
        # 4. CAPTURE OR CANCEL
        if response.status_code == 200:
            # Printify accepted the order! Capture the funds.
            stripe.PaymentIntent.capture(payment_intent_id)
            return {"message": "Purchase successful and funds captured!", "order_details": response.json()}
        else:
            # Printify failed! Cancel the hold so the customer is not charged.
            stripe.PaymentIntent.cancel(payment_intent_id)
            raise HTTPException(
                status_code=400, 
                detail="Production routing failed. Your card has not been charged and the hold has been released."
            )