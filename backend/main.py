
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
# 1. FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Personalized Travel Itinerary Planner",
    version="1.0.0",
    description="AI-powered personalized travel planning API",
)


# --------------------------------------------------
# 2. CORS configuration
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
# 3. Supabase configuration
# --------------------------------------------------

supabase: Client | None = None

supabase_url = os.getenv("SUPABASE_URL")

supabase_key = (
    os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_KEY")
)

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)


# --------------------------------------------------
# 4. Request models
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
    budget: float = Field(gt=0, le=100_000_000)
    currency: str = "INR"
    travelers: int = Field(ge=1, le=50)
    interests: list[str] = Field(default_factory=list, max_length=15)
    itinerary_data: dict[str, Any]


# --------------------------------------------------
# 5. Basic API routes
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
# 6. Convert itinerary JSON into readable Markdown
# --------------------------------------------------

def itinerary_to_markdown(itinerary: dict[str, Any]) -> str:
    lines = []

    destination = itinerary.get("destination", "Travel itinerary")

    lines.append(f"# Travel Itinerary: {destination}")
    lines.append("")

    if itinerary.get("summary"):
        lines.append("## Overview")
        lines.append(str(itinerary["summary"]))
        lines.append("")

    lines.append("## Daily Plan")
    lines.append("")

    days = itinerary.get("days", [])

    for day in days:
        if not isinstance(day, dict):
            continue

        day_number = day.get("day", "")
        day_title = (
            day.get("title")
            or day.get("theme")
            or f"Day {day_number}"
        )

        lines.append(f"### Day {day_number}: {day_title}")

        if day.get("date"):
            lines.append(f"Date: {day['date']}")

        lines.append("")

        activities = day.get("activities", [])

        for activity in activities:
            if not isinstance(activity, dict):
                continue

            name = activity.get("name", "Activity")
            lines.append(f"- **{name}**")

            if activity.get("time"):
                lines.append(f"  - Time: {activity['time']}")

            if activity.get("description"):
                lines.append(
                    f"  - Description: {activity['description']}"
                )

            location = activity.get("location")
            if location:
                lines.append(f"  - Location: {location}")

            transport = (
                activity.get("transportation")
                or activity.get("transport")
            )
            if transport:
                lines.append(f"  - Transportation: {transport}")

            cost = activity.get("estimated_cost")
            if cost is not None:
                lines.append(f"  - Estimated cost: {cost}")

        lines.append("")

    tips = itinerary.get("travel_tips", [])

    if tips:
        lines.append("## Travel Tips")
        for tip in tips:
            lines.append(f"- {tip}")
        lines.append("")

    return "\n".join(lines).strip()


# --------------------------------------------------
# 7. Generate an itinerary using Google Gemini
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

Create a practical travel itinerary using these details:

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
2. Personalize the plan to the destination, budget, style, and interests.
3. Give each day a date, a short title, and an activities list.
4. Each activity must include a time, name, description, estimated cost,
   location, and transportation suggestion.
5. Include food recommendations and useful travel tips.
6. Estimate costs in {trip.currency}.
7. Keep estimated total cost within the supplied budget when feasible.
8. Do not claim that reservations or bookings have been made.
9. Return valid JSON only, without Markdown fences or commentary.

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
                    "thinkingConfig": {
                        "thinkingBudget": 0
                    },
                },
            },
            timeout=httpx.Timeout(
        connect=15.0,
        read=120.0,
        write=30.0,
        pool=15.0,
        ),
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

        # Preserve the original trip information in the itinerary.
        itinerary["budget"] = trip.budget
        itinerary["currency"] = trip.currency
        itinerary["travelers"] = trip.travelers
        itinerary["interests"] = trip.interests
        itinerary["start_date"] = trip.start_date.isoformat()
        itinerary["end_date"] = trip.end_date.isoformat()

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
# 8. Generate-trip API endpoints
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
# 9. Save a trip to Supabase
# --------------------------------------------------

@app.post("/api/save-trip")
def save_trip(request: SaveTripRequest):

    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured",
        )

    try:
        markdown = itinerary_to_markdown(request.itinerary_data)

        if not markdown:
            raise HTTPException(
                status_code=400,
                detail="The itinerary is empty and cannot be saved.",
            )

        trip_record = {
            "destination": request.destination,
            "duration": request.days,
            "budget": f"{request.budget:g} {request.currency}",
            "travelers": str(request.travelers),
            "interests": ", ".join(request.interests),
            "itinerary_markdown": markdown,
            "days": request.days,
            "itinerary": request.itinerary_data,
        }

        result = (
            supabase.table("trips")
            .insert(trip_record)
            .execute()
        )

        return {
            "status": "success",
            "message": "Trip saved successfully!",
            "data": result.data,
        }

    except HTTPException:
        raise

    except Exception as exc:
        print("Supabase save error:", str(exc))

        raise HTTPException(
            status_code=500,
            detail="Unable to save the trip. Check the backend logs.",
        ) from exc
