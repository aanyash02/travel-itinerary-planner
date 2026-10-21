import os
import json
from typing import Union, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
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

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

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
    return {
        "status": "online",
        "message": "FastAPI Travel Itinerary Backend is running live on Vercel."
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
        "supabase_configured": bool(supabase is not None)
    }

@app.post("/api/generate-itinerary")
async def generate_itinerary(request: ItineraryRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="GEMINI_API_KEY is missing from Vercel environment variables."
        )

    if isinstance(request.interests, list):
        interests_str = ", ".join(request.interests)
    else:
        interests_str = str(request.interests)

    prompt = f"""
    Create a detailed {request.days}-day travel itinerary for {request.destination}.
    Budget level: {request.budget}.
    Travelers: {request.travelers}.
    Interests: {interests_str if interests_str else 'General sightseeing'}.

    Return ONLY a valid JSON array of objects representing days.
    Each object must have:
    - "day": integer day number
    - "title": highlight title of the day
    - "activities": list of strings detailing morning, afternoon, and evening plans
    - "estimated_cost": estimated cost for the day
    """

    try:
        # THE ULTIMATE FIX: Dynamically fetch allowed models for your API key
        available_models = [
            m.name for m in genai.list_models() 
            if 'generateContent' in m.supported_generation_methods
        ]
        
        if not available_models:
            raise HTTPException(status_code=500, detail="No generative models authorized for this API key.")

        # Automatically pick the best available 'flash' model, or fallback to whatever is available
        target_model_name = available_models[0]
        for m in available_models:
            if "flash" in m.lower() and "vision" not in m.lower():
                target_model_name = m
                break
        
        # Clean the prefix for the GenerativeModel class
        target_model_name = target_model_name.replace("models/", "")

        model = genai.GenerativeModel(target_model_name)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        
        itinerary_data = json.loads(raw_text.strip())
        
        return {
            "status": "success",
            "destination": request.destination,
            "days": request.days,
            "itinerary": itinerary_data,
            "model_used": target_model_name # Logs exactly which model succeeded
        }

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to parse AI response as JSON. Try again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Gemini API Error: {str(e)}"
        )

class SaveTripRequest(BaseModel):
    destination: str
    days: int
    itinerary_data: dict

@app.post("/api/save-trip")
async def save_trip(request: SaveTripRequest):
    if not supabase:
        raise HTTPException(
            status_code=500, 
            detail="Supabase client is not configured."
        )

    try:
        data, count = supabase.table("trips").insert({
            "destination": request.destination,
            "days": request.days,
            "itinerary": request.itinerary_data
        }).execute()

        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to save trip: {str(e)}"
        )