import os
import json
import urllib.request
import urllib.error
from typing import Union, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI(title="AI Travel Itinerary Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")

class ItineraryRequest(BaseModel):
    destination: str
    days: int
    budget: str
    travelers: str = "Solo"
    interests: Union[List[str], str] = []

@app.get("/")
def read_root():
    return {"status": "online", "message": "Backend is running!"}

@app.post("/api/generate-itinerary")
async def generate_itinerary(request: ItineraryRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing from environment variables.")

    interests_str = ", ".join(request.interests) if isinstance(request.interests, list) else str(request.interests)

    prompt = f"""
    Create a detailed {request.days}-day travel itinerary for {request.destination}.
    Budget: {request.budget}. Travelers: {request.travelers}. Interests: {interests_str}.
    Return ONLY a valid JSON array of objects where each object has:
    - "day": integer
    - "title": string
    - "activities": list of strings
    - "estimated_cost": string or number
    """

    # Updated to use gemini-3.0-flash as required by the API
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.7
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            raw_text = result["candidates"][0]["content"]["parts"][0]["text"]
            
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
                
            itinerary_data = json.loads(raw_text.strip())
            return {"status": "success", "itinerary": itinerary_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

class SaveTripRequest(BaseModel):
    destination: str
    days: int
    itinerary_data: dict

@app.post("/api/save-trip")
async def save_trip(request: SaveTripRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")

    try:
        data, count = supabase.table("trips").insert({
            "destination": request.destination,
            "days": request.days,
            "itinerary": request.itinerary_data
        }).execute()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save trip: {str(e)}")