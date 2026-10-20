# ✈️ AI Travel Itinerary Planner

A full-stack web application that generates personalized, multi-day travel itineraries powered by **Google Gemini AI** and persists trip data to **Supabase**.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), JavaScript, Axios, React-Markdown, CSS
- **Backend:** Python, FastAPI, Uvicorn, Pydantic, Python-dotenv
- **AI Integration:** Google GenAI SDK (`gemini-2.5-flash`)
- **Database:** Supabase (PostgreSQL)

---

## 📂 Project Structure

```text
travel-itinerary-planner/
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        └── App.jsx