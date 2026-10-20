import os
import traceback

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client

# ------------------------------------------------------------------------------
# 1. Environment & API Key Configuration
# ------------------------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Gemini Client
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")
else:
    model = None
    print(
        "⚠️ Warning: GEMINI_API_KEY is not set. AI generation will not work."
    )

# Initialize Supabase Client
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"⚠️ Warning: Failed to initialize Supabase client: {e}")
else:
    print(
        "⚠️ Warning: SUPABASE_URL or SUPABASE_KEY is not set. Saving trips will not work."
    )

# ------------------------------------------------------------------------------
# 2. FastAPI Application Setup & CORS Configuration
# ------------------------------------------------------------------------------
app = FastAPI(title="AI Travel Itinerary Planner API")

# Allow requests from Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific origin if needed (e.g. ["http://localhost:5173", "http://localhost:5177"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# 3. Pydantic Models for Request Validation
# ------------------------------------------------------------------------------
class ItineraryRequest(BaseModel):
    destination: str
    duration: int
    budget: str
    travelers: str
    interests: str


class TripData(BaseModel):
    destination: str
    duration: int
    budget: str
    travelers: str
    interests: str
    itinerary_markdown: str


# ------------------------------------------------------------------------------
# 4. API Endpoints
# ------------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {"message": "Travel Itinerary Planner API is running!"}


@app.post("/api/generate-itinerary")
async def generate_itinerary(request: ItineraryRequest):
    if not model:
        raise HTTPException(
            status_code=500,
            detail="Gemini API is not configured. Check backend/.env file.",
        )

    prompt = f"""
    Create a detailed, day-by-day travel itinerary for a trip with the following details:
    - Destination: {request.destination}
    - Duration: {request.duration} days
    - Budget Level: {request.budget}
    - Travelers: {request.travelers}
    - Interests: {request.interests}

    Requirements:
    1. Organize the output cleanly using Markdown.
    2. Provide a breakdown for each day (Morning, Afternoon, Evening).
    3. Include estimated budget tips, local cuisine recommendations, and essential travel tips.
    4. Format key highlights using bullet points and bold headers.
    """

    try:
        response = model.generate_content(prompt)
        return {"itinerary": response.text}
    except Exception as e:
        print("❌ GEMINI GENERATION ERROR:")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Failed to generate itinerary: {str(e)}"
        )


@app.post("/api/save-trip")
async def save_trip(trip: TripData):
    if not supabase:
        raise HTTPException(
            status_code=500,
            detail="Supabase client is not initialized. Check backend/.env file.",
        )

    try:
        # Build dictionary and explicitly cast duration to integer
        data = {
            "destination": trip.destination,
            "duration": int(trip.duration),
            "budget": trip.budget,
            "travelers": trip.travelers,
            "interests": trip.interests,
            "itinerary_markdown": trip.itinerary_markdown,
        }

        # Insert record into Supabase 'trips' table
        response = supabase.table("trips").insert(data).execute()
        print("✅ SUPABASE INSERT SUCCESS:", response.data)

        return {"status": "success", "data": response.data}

    except Exception as e:
        print("❌ SUPABASE INSERT ERROR DETAILS:")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Database insert error: {str(e)}"
        )