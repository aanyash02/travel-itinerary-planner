import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [formData, setFormData] = useState({
    destination: "India",
    duration: 5,
    budget: "Luxury",
    travelers: "Group of Friends",
    interests: "",
  });

  const [itinerary, setItinerary] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaveStatus("");
    setItinerary("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/generate-itinerary",
        formData
      );
      setItinerary(response.data.itinerary_markdown);
    } catch (err) {
      console.error(err);
      setError("Error: Failed to generate itinerary. Ensure FastAPI backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("");
    setError("");

    try {
      const payload = {
        ...formData,
        itinerary_markdown: itinerary,
      };

      await axios.post("http://127.0.0.1:8000/api/save-trip", payload);
      setSaveStatus("Trip Saved to Supabase! 🎉");
    } catch (err) {
      console.error(err);
      setError("Error saving trip. Please check backend connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <h1>✈️ Personalized Travel Itinerary Planner</h1>
      <p className="subtitle">Full-Stack AI Travel Builder (React + FastAPI)</p>

      <div className="form-card">
        <form onSubmit={handleGenerate}>
          <div className="form-group">
            <label>📍 Destination:</label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="e.g. Paris, Tokyo, Goa"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>📅 Duration (Days):</label>
              <input
                type="number"
                name="duration"
                min="1"
                max="30"
                value={formData.duration}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>💰 Budget:</label>
              <select
                name="budget"
                value={formData.budget}
                onChange={handleChange}
              >
                <option value="Budget">Budget</option>
                <option value="Moderate">Moderate</option>
                <option value="Luxury">Luxury</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>👥 Travel Party:</label>
              <select
                name="travelers"
                value={formData.travelers}
                onChange={handleChange}
              >
                <option value="Solo">Solo</option>
                <option value="Couple">Couple</option>
                <option value="Family">Family</option>
                <option value="Group of Friends">Group of Friends</option>
              </select>
            </div>

            <div className="form-group">
              <label>🎯 Specific Interests:</label>
              <input
                type="text"
                name="interests"
                value={formData.interests}
                onChange={handleChange}
                placeholder="e.g. Food, Museums, Beaches"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "✨ Generating Itinerary..." : "✨ Generate Trip Plan"}
          </button>
        </form>
      </div>

      {error && <div className="error-card">{error}</div>}

      {saveStatus && <div className="save-status">{saveStatus}</div>}

      {itinerary && (
        <div className="itinerary-card">
          <div className="itinerary-header">
            <h2>Generated Travel Itinerary</h2>
            <button
              onClick={handleSave}
              className="btn-save"
              disabled={saving}
            >
              {saving ? "Saving..." : "💾 Save Trip to Database"}
            </button>
          </div>
          <div className="markdown-content">
            <ReactMarkdown>{itinerary}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;