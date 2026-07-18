import os
from fastapi import Depends, HTTPException, Header
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase once here
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Shared dependency for securing routes
def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    user = supabase.auth.get_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Authentication Token")
    return user.user