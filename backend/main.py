import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from supabase import create_client, Client

app = FastAPI()

# Enable CORS for all origins (allowing requests from Vercel frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class ItineraryRequest(BaseModel):
    destination: str
    duration: int
    budget: str
    travel_party: str
    interests: Optional[str] = ""


class SaveTripRequest(BaseModel):
    destination: str
    duration: int
    budget: str
    travel_party: str
    interests: Optional[str] = ""
    itinerary_markdown: str


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/generate-itinerary")
def generate_itinerary(req: ItineraryRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing on server environment.")

    prompt = f"""
    Create a detailed day-by-day travel itinerary for a trip to {req.destination}.
    - Duration: {req.duration} days
    - Budget Level: {req.budget}
    - Travel Party: {req.travel_party}
    - Interests/Preferences: {req.interests}

    Provide recommendations for sights, local food, and practical daily timing in clear Markdown format.
    """

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return {"itinerary_markdown": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")


@app.post("/api/save-trip")
def save_trip(req: SaveTripRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase credentials missing on server environment.")

    try:
        data = {
            "destination": req.destination,
            "duration": req.duration,
            "budget": req.budget,
            "travel_party": req.travel_party,
            "interests": req.interests,
            "itinerary_markdown": req.itinerary_markdown,
        }
        response = supabase.table("trips").insert(data).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase Storage Error: {str(e)}")