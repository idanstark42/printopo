from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, designs, printify, checkout

app = FastAPI(title="Printopo API")

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the routers
app.include_router(auth.router)
app.include_router(designs.router)
app.include_router(printify.router)
app.include_router(checkout.router)

@app.get("/")
def read_root():
    return {"status": "Printopo Engine is online"}