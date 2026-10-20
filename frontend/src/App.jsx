import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [formData, setFormData] = useState({
    destination: '',
    duration: '',
    budget: 'Budget',
    travel_party: 'Solo',
    interests: ''
  });

  const [itinerary, setItinerary] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaveStatus('');
    setItinerary('');

    try {
      const response = await axios.post(
        "https://travel-itinerary-planner-935ejqa71-logic-latitude.vercel.app/api/generate-itinerary",
        formData
      );
      setItinerary(response.data.itinerary_markdown);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        "Failed to generate itinerary. Please check backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('');
    setError('');

    try {
      const payload = {
        ...formData,
        itinerary_markdown: itinerary,
      };

      await axios.post(
        "https://travel-itinerary-planner-935ejqa71-logic-latitude.vercel.app/api/save-trip", 
        payload
      );
      setSaveStatus("Trip Saved to Supabase! 🥳");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Error saving trip. Please check backend connection."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h1 style={{ textAlign: 'center' }}>✈️ Personalized Travel Itinerary Planner</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>Full-Stack AI Travel Builder (React + FastAPI)</p>

      <form onSubmit={handleGenerate} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label>📍 Destination:</label>
          <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label>📅 Duration (Days):</label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>💰 Budget:</label>
            <select
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
            >
              <option value="Budget">Budget</option>
              <option value="Moderate">Moderate</option>
              <option value="Luxury">Luxury</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label>👥 Travel Party:</label>
            <select
              name="travel_party"
              value={formData.travel_party}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
            >
              <option value="Solo">Solo</option>
              <option value="Couple">Couple</option>
              <option value="Family">Family</option>
              <option value="Group of Friends">Group of Friends</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>🎯 Specific Interests:</label>
            <input
              type="text"
              name="interests"
              placeholder="e.g. Food, Museums, Beaches"
              value={formData.interests}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '✨ Generating Itinerary...' : '✨ Generate Trip Plan'}
        </button>
      </form>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {itinerary && (
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Generated Itinerary</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: '#f3f4f6', padding: '15px', borderRadius: '6px' }}>
            {itinerary}
          </pre>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {saving ? 'Saving...' : '💾 Save Trip to Supabase'}
          </button>

          {saveStatus && (
            <p style={{ color: '#16a34a', fontWeight: 'bold', marginTop: '10px' }}>{saveStatus}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;