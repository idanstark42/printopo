from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import DesignCreate, DesignUpdate, DesignInDB
from utils import supabase, get_current_user

router = APIRouter(prefix="/designs", tags=["Designs"])

@router.post("/", response_model=DesignInDB)
def create_design(design: DesignCreate, user=Depends(get_current_user)):
    """
    Takes frontend input (DesignCreate), attaches the authenticated user's ID, 
    saves it to Supabase, and returns the full database record (DesignInDB).
    """
    data = design.dict()
    data["user_id"] = user.id
    
    res = supabase.table("designs").insert(data).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to save design to database")
        
    return res.data[0]

@router.get("/", response_model=List[DesignInDB])
def get_my_designs(user=Depends(get_current_user)):
    """
    Fetches all saved designs belonging to the authenticated user.
    The response_model ensures it returns a strict list of DesignInDB objects.
    """
    res = supabase.table("designs").select("*").eq("user_id", user.id).execute()
    
    return res.data

@router.patch("/{design_id}", response_model=DesignInDB)
def update_design(design_id: str, design_update: DesignUpdate, user=Depends(get_current_user)):
    """
    Updates an existing design. Verifies ownership before applying changes.
    """
    # Exclude unset fields so we only update what the frontend actually sent
    update_data = design_update.dict(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update")

    # The chained .eq() guarantees a user can only update their own maps
    res = supabase.table("designs").update(update_data)\
        .eq("id", design_id)\
        .eq("user_id", user.id)\
        .execute()
        
    if not res.data:
        raise HTTPException(status_code=404, detail="Design not found or unauthorized")
        
    return res.data[0]

@router.delete("/{design_id}")
def delete_design(design_id: str, user=Depends(get_current_user)):
    """
    Permanently deletes a saved design.
    """
    # Again, the .eq("user_id") enforces strict authorization
    res = supabase.table("designs").delete()\
        .eq("id", design_id)\
        .eq("user_id", user.id)\
        .execute()
        
    if not res.data:
        raise HTTPException(status_code=404, detail="Design not found or unauthorized")
        
    return {"message": f"Design {design_id} successfully deleted"}