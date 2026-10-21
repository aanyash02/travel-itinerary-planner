
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
# Configuration
# --------------------------------------------------

app = FastAPI(
    title="Personalized Travel Itinerary Planner",
    version="1.0.0",
    description="AI-powered personalized travel planning API",
)

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)

allowed_origins = [
    origin.strip()
    for origin in frontend_url.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "apikey"],
)


# --------------------------------------------------
# Supabase configuration
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
# Request models
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
# Health checks
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
# Gemini AI integration
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
You are an intelligent travel itinerary planner.

Create a practical, personalized trip using these preferences:

Destination: {trip.destination}
Start date: {trip.start_date}
End date: {trip.end_date}
Number of days: {days_count}
Budget: {trip.budget} {trip.currency}
Travelers: {trip.travelers}
Travel style: {trip.travel_style}
Interests: {", ".join(trip.interests)}

Return valid JSON only, with this structure:
{{
  "title": "Trip title",
  "destination": "{trip.destination}",
  "currency": "{trip.currency}",
  "days": [
    {{
      "day": 1,
      "date": "{trip.start_date}",
      "theme": "Day theme",
      "activities": [
        {{
          "time": "09:00",
          "name": "Activity name",
          "description": "Activity details",
          "category": "sightseeing",
          "estimated_cost": 500,
          "duration_minutes": 90,
          "transport": "Suggested transport"
        }}
      ]
    }}
  ],
  "estimated_total_cost": 5000,
  "budget_notes": ["Budget advice"],
  "travel_tips": ["Practical travel tip"]
}}

Requirements:
- Generate exactly {days_count} days in chronological order.
- Match each date to the correct calendar date.
- Adapt activities to the travel style and interests.
- Include meals, breaks, and transportation suggestions.
- Treat the budget as the total trip budget for all travelers.
- Use {trip.currency} for all cost estimates.
- Do not invent verification of opening hours, prices, or availability.
- Clearly treat unverified travel times and prices as estimates.
- Do not exceed the budget when reasonably feasible.
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

        # Validate essential output structure.
        days = itinerary.get("days")

        if not isinstance(days, list) or len(days) != days_count:
            raise ValueError("AI returned an incorrect number of days")

        for day in days:
            if not isinstance(day.get("activities"), list):
                raise ValueError("AI returned an invalid activity list")

        return itinerary

    except httpx.HTTPStatusError as exc:
        print("Gemini API error:", exc.response.text[:1000])
        raise HTTPException(
            status_code=502,
            detail="The AI provider rejected the request. Check the API key and model.",
        ) from exc

    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        print("Itinerary generation error:", str(exc))
        raise HTTPException(
            status_code=502,
            detail="Could not generate a valid itinerary. Please try again.",
        ) from exc


# --------------------------------------------------
# Generate itinerary
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
# Save itinerary to Supabase
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
            .insert({
                "destination": request.destination,
                "days": request.days,
                "itinerary": request.itinerary_data,
            })
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
