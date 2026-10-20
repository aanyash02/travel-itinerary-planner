import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from supabase import create_client, Client

# Initialize FastAPI application
app = FastAPI(title="AI Travel Itinerary Planner API")

# Configure CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to frontend URL in production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safely retrieve environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Safely initialize Gemini AI client
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Safely initialize Supabase client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")

# Request model for itinerary generation
class ItineraryRequest(BaseModel):
    destination: str
    days: int
    budget: str
    travelers: str = "Solo"
    interests: list[str] = []

# Root route to prevent 404 on base backend URL
@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "FastAPI Travel Itinerary Backend is running live on Vercel."
    }

# Health check route
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
        "supabase_configured": bool(supabase is not None)
    }

# Endpoint to generate trip itinerary using Gemini API
@app.post("/api/generate-itinerary")
async def generate_itinerary(request: ItineraryRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="GEMINI_API_KEY is not configured in Vercel environment variables."
        )

    prompt = f"""
    Create a detailed {request.days}-day travel itinerary for {request.destination}.
    Budget level: {request.budget}.
    Travelers: {request.travelers}.
    Interests: {', '.join(request.interests) if request.interests else 'General sightseeing'}.

    Return the response as a JSON array where each object represents a day with:
    - "day": integer day number
    - "title": highlight title of the day
    - "activities": list of strings detailing morning, afternoon, and evening plans
    - "estimated_cost": estimated cost for the day
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        itinerary_data = json.loads(response.text)
        return {
            "destination": request.destination,
            "days": request.days,
            "itinerary": itinerary_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate itinerary: {str(e)}")

# Save trip endpoint for Supabase integration
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
        raise HTTPException(status_code=500, detail=f"Failed to save trip: {str(e)}")