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

    const payload = {
      destination: formData.destination,
      days: parseInt(formData.days, 10),
      budget: formData.budget,
      travelers: formData.travelers || "Solo",
      interests: formData.interests 
        ? formData.interests.split(',').map((item) => item.trim()) 
        : []
    };

    try {
      const response = await axios.post(
        "[https://travel-itinerary-planner-chi.vercel.app/api/generate-itinerary](https://travel-itinerary-planner-chi.vercel.app/api/generate-itinerary)",
        payload
      );
      
      setItinerary(response.data.itinerary);
    } catch (err) {
      console.error("API Error:", err);
      setError("Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>✨ AI Travel Itinerary Planner</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px' }}>Destination:</label>
          <input 
            type="text" 
            name="destination" 
            placeholder="e.g., India" 
            value={formData.destination} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px' }}>Days:</label>
          <input 
            type="number" 
            name="days" 
            placeholder="e.g., 2" 
            value={formData.days} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px' }}>Budget:</label>
          <select name="budget" value={formData.budget} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
            <option value="Budget">Budget</option>
            <option value="Moderate">Moderate</option>
            <option value="Luxury">Luxury</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px' }}>Travelers:</label>
          <select name="travelers" value={formData.travelers} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
            <option value="Solo">Solo</option>
            <option value="Couple">Couple</option>
            <option value="Family">Family</option>
            <option value="Friends">Friends</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px' }}>Interests:</label>
          <input 
            type="text" 
            name="interests" 
            placeholder="e.g., Culture, Local Food, Temple visits" 
            value={formData.interests} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer', marginTop: '8px' }}>
          {loading ? "Generating Trip Plan..." : "Generate Trip Plan"}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '16px' }}>{error}</p>}

      {itinerary && (
        <div style={{ marginTop: '24px' }}>
          <h2>Your Itinerary</h2>
          {Array.isArray(itinerary) ? (
            itinerary.map((dayItem, idx) => (
              <div key={idx} style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                <h3>Day {dayItem.day}: {dayItem.title}</h3>
                <p><strong>Estimated Cost:</strong> {dayItem.estimated_cost}</p>
                <h4>Activities:</h4>
                <ul>
                  {dayItem.activities?.map((act, aIdx) => (
                    <li key={aIdx}>{act}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: '12px' }}>
              {JSON.stringify(itinerary, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}