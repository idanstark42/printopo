from fastapi import APIRouter, Depends, Header, HTTPException
from models import UserAuth
from utils import supabase

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup")
def signup(auth_data: UserAuth):
    res = supabase.auth.sign_up({"email": auth_data.email, "password": auth_data.password})
    if res.user is None:
        raise HTTPException(status_code=400, detail="Signup failed")
    return {"message": "User created", "user": res.user}

@router.post("/login")
def login(auth_data: UserAuth):
    res = supabase.auth.sign_in_with_password({"email": auth_data.email, "password": auth_data.password})
    return {"access_token": res.session.access_token, "user": res.user}

@router.post("/logout")
def logout(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    supabase.auth.sign_out(token)
    return {"message": "Logged out successfully"}