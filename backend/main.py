
import json
import os
from datetime import date
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from supabase import create_client, Client


# --------------------------------------------------
# 1. Create the FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Personalized Travel Itinerary Planner",
    version="1.0.0",
    description="AI-powered personalized travel planning API",
)


# --------------------------------------------------
# 2. Configure CORS for the frontend
# --------------------------------------------------

allowed_origins = [
    "https://travel-itinerary-planner-q2kx.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_url = os.getenv("FRONTEND_URL", "")

allowed_origins.extend(
    origin.strip().rstrip("/")
    for origin in frontend_url.split(",")
    if origin.strip()
)

allowed_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "apikey"],
)


# --------------------------------------------------
# 3. Configure Supabase
# --------------------------------------------------

supabase: Client | None = None

supabase_url = os.getenv("SUPABASE_URL")

supabase_key = (
    os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)


# --------------------------------------------------
# 4. Validate incoming trip requests
# --------------------------------------------------

class TripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    start_date: date
    end_date: date
    budget: float = Field(gt=0, le=100_000_000)
    currency: str = "INR"
    travelers: int = Field(default=1, ge=1, le=50)
    travel_style: str = "balanced"
    interests: list[str] = Field(default_factory=list, max_length=15)

    @model_validator(mode="after")
    def validate_trip(self):
        if self.end_date < self.start_date:
            raise ValueError("End date cannot precede start date")

        if (self.end_date - self.start_date).days > 30:
            raise ValueError("A trip cannot exceed 31 calendar days")

        return self


class SaveTripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    days: int = Field(ge=1, le=31)
    itinerary_data: dict[str, Any]


# --------------------------------------------------
# 5. Basic API and health-check routes
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "success": True,
        "message": "Travel Itinerary Planner API is running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# --------------------------------------------------
# 6. Generate an itinerary using Google Gemini
# --------------------------------------------------

def generate_with_gemini(trip: TripRequest) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured",
        )

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    days_count = (trip.end_date - trip.start_date).days + 1

    prompt = f"""
You are WanderWise, an expert personalized travel planner.

Create a practical travel itinerary using the following trip details:

Destination: {trip.destination}
Start date: {trip.start_date.isoformat()}
End date: {trip.end_date.isoformat()}
Number of calendar days: {days_count}
Total budget: {trip.budget} {trip.currency}
Number of travelers: {trip.travelers}
Travel style: {trip.travel_style}
Interests: {", ".join(trip.interests) if trip.interests else "General sightseeing"}

Requirements:
1. Return exactly {days_count} itinerary days.
2. Personalize the plan to the destination, budget, travel style, and interests.
3. Give each day a date, a short title, and an activities list.
4. Each activity should include a time, name, description, estimated cost,
   and location.
5. Include practical local transportation suggestions.
6. Include food recommendations and useful travel tips.
7. Estimate costs in {trip.currency}.
8. Keep the estimated total trip cost within the supplied budget when feasible.
9. Do not claim that reservations or bookings have been made.
10. Return valid JSON only, without Markdown fences or extra commentary.

Use this JSON structure:
{{
  "destination": "{trip.destination}",
  "start_date": "{trip.start_date.isoformat()}",
  "end_date": "{trip.end_date.isoformat()}",
  "currency": "{trip.currency}",
  "travelers": {trip.travelers},
  "travel_style": "{trip.travel_style}",
  "summary": "A short overview of the trip",
  "estimated_total_cost": 0,
  "budget_breakdown": {{
    "accommodation": 0,
    "food": 0,
    "transportation": 0,
    "activities": 0,
    "other": 0
  }},
  "days": [
    {{
      "day": 1,
      "date": "{trip.start_date.isoformat()}",
      "title": "Day title",
      "activities": [
        {{
          "time": "09:00 AM",
          "name": "Activity name",
          "description": "What to do",
          "location": "Place or area",
          "estimated_cost": 0,
          "transportation": "How to get there"
        }}
      ]
    }}
  ],
  "travel_tips": [
    "A useful destination-specific tip"
  ]
}}
"""

    url = (
        "https://generativelanguage.googleapis.com/"
        f"v1beta/models/{model}:generateContent"
    )

    try:
        response = httpx.post(
            url,
            params={"key": api_key},
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}],
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.5,
                },
            },
            timeout=60.0,
        )

        response.raise_for_status()
        result = response.json()

        text = result["candidates"][0]["content"]["parts"][0]["text"]
        itinerary = json.loads(text)

        days = itinerary.get("days")

        if not isinstance(days, list) or len(days) != days_count:
            raise ValueError("AI returned an incorrect number of days")

        for day in days:
            if not isinstance(day, dict):
                raise ValueError("AI returned an invalid day")

            if not isinstance(day.get("activities"), list):
                raise ValueError("AI returned an invalid activity list")

        return itinerary

    except httpx.HTTPStatusError as exc:
        print("Gemini API error:", exc.response.text[:1000])

        raise HTTPException(
            status_code=502,
            detail=(
                "The AI provider rejected the request. "
                "Check the Gemini API key and model configuration."
            ),
        ) from exc

    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        print("Itinerary generation error:", str(exc))

        raise HTTPException(
            status_code=502,
            detail="Could not generate a valid itinerary. Please try again.",
        ) from exc


# --------------------------------------------------
# 7. Generate-trip API endpoints
# --------------------------------------------------

@app.post("/api/trips/generate")
@app.post("/api/generate-itinerary")
def generate_itinerary(trip: TripRequest):
    itinerary = generate_with_gemini(trip)

    return {
        "success": True,
        "itinerary": itinerary,
    }


# --------------------------------------------------
# 8. Save a trip to Supabase
# --------------------------------------------------

@app.post("/api/save-trip")
def save_trip(request: SaveTripRequest):
    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured",
        )

    try:
        result = (
            supabase.table("trips")
            .insert(
                {
                    "destination": request.destination,
                    "days": request.days,
                    "itinerary": request.itinerary_data,
                }
            )
            .execute()
        )

        return {
            "status": "success",
            "data": result.data,
        }

    except Exception as exc:
        print("Supabase save error:", str(exc))

        raise HTTPException(
            status_code=500,
            detail="Unable to save the trip",
        ) from exc
