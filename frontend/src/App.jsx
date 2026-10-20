import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [formData, setFormData] = useState({
    destination: '',
    days: '',
    budget: 'Moderate',
    travelers: 'Solo',
    interests: ''
  });
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setItinerary(null);

    // EXACT FIX: Convert the string data from the form into the strict types Python expects
    const payload = {
      destination: formData.destination,
      days: parseInt(formData.days, 10), // Converts "5" to 5 to fix the 422 Error
      budget: formData.budget,
      travelers: formData.travelers || "Solo",
      // Convert comma-separated string to an array for the backend
      interests: formData.interests 
        ? formData.interests.split(',').map((item) => item.trim()) 
        : []
    };

    try {
      // Send data to your live Vercel backend
      const response = await axios.post(
        "https://travel-itinerary-planner-chi.vercel.app/api/generate-itinerary",
        payload
      );
      
      // Store the successful response to display it
      setItinerary(response.data.itinerary);
    } catch (err) {
      console.error("API Error:", err);
      setError("Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>✨ AI Travel Itinerary Planner</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          name="destination" 
          placeholder="Where to? (e.g., Paris)" 
          value={formData.destination} 
          onChange={handleChange} 
          required 
        />
        <input 
          type="number" 
          name="days" 
          placeholder="How many days? (e.g., 5)" 
          value={formData.days} 
          onChange={handleChange} 
          required 
        />
        <select name="budget" value={formData.budget} onChange={handleChange}>
          <option value="Budget">Budget</option>
          <option value="Moderate">Moderate</option>
          <option value="Luxury">Luxury</option>
        </select>
        <select name="travelers" value={formData.travelers} onChange={handleChange}>
          <option value="Solo">Solo</option>
          <option value="Couple">Couple</option>
          <option value="Family">Family</option>
          <option value="Friends">Friends</option>
        </select>
        <input 
          type="text" 
          name="interests" 
          placeholder="Interests (e.g., art, food, history)" 
          value={formData.interests} 
          onChange={handleChange} 
        />
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Trip Plan"}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {itinerary && (
        <div style={{ marginTop: '20px' }}>
          <h2>Your Itinerary</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: '10px' }}>
            {JSON.stringify(itinerary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}