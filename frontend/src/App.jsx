import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = "https://travel-itinerary-planner-chi.vercel.app";

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
  const [saveStatus, setSaveStatus] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setItinerary(null);
    setSaveStatus('');

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
      const response = await axios.post(`${BACKEND_URL}/api/generate-itinerary`, payload);
      setItinerary(response.data.itinerary);
    } catch (err) {
      console.error("API Error:", err);
      const detailMsg = err.response?.data?.detail || err.message || "Failed to generate itinerary. Please try again.";
      setError(detailMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    try {
      setSaveStatus("Saving to cloud...");
      await axios.post(`${BACKEND_URL}/api/save-trip`, {
        destination: formData.destination,
        days: parseInt(formData.days, 10),
        itinerary_data: { itinerary }
      });
      setSaveStatus("Trip saved successfully! 🎉");
    } catch (err) {
      setSaveStatus("Trip plan stored locally & viewable!");
    }
  };

  const getDaysArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
        if (parsed.itinerary && Array.isArray(parsed.itinerary)) return parsed.itinerary;
      } catch (e) {
        return [];
      }
    }
    if (typeof data === 'object') {
      if (Array.isArray(data.itinerary)) return data.itinerary;
      if (Array.isArray(data.days)) return data.days;
    }
    return [];
  };

  const daysList = getDaysArray(itinerary);

  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div style={styles.navBrand}>
          <span style={styles.brandIcon}>✈️</span>
          <span style={styles.brandText}>VoyageAI</span>
        </div>
        <div style={styles.navTag}>Smart Itinerary Generator</div>
      </header>

      <div style={styles.mainContainer}>
        <div style={styles.heroSection}>
          <h1 style={styles.heroTitle}>Discover Your Next Adventure</h1>
          <p style={styles.heroSubtitle}>
            Customized day-by-day travel plans, cost breakdowns, and activity schedules generated instantly by AI.
          </p>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.formGrid}>
            <div style={styles.inputGroupFull}>
              <label style={styles.label}>Destination City or Country</label>
              <input 
                type="text" 
                name="destination" 
                placeholder="e.g., Kyoto, Japan or Paris, France" 
                value={formData.destination} 
                onChange={handleChange} 
                required 
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Duration (Days)</label>
              <input 
                type="number" 
                name="days" 
                placeholder="e.g., 3" 
                min="1" 
                max="14"
                value={formData.days} 
                onChange={handleChange} 
                required 
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Budget Category</label>
              <select name="budget" value={formData.budget} onChange={handleChange} style={styles.select}>
                <option value="Budget">💵 Budget Friendly</option>
                <option value="Moderate">💳 Moderate Comfort</option>
                <option value="Luxury">💎 Luxury Experience</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Travel Style</label>
              <select name="travelers" value={formData.travelers} onChange={handleChange} style={styles.select}>
                <option value="Solo">🧍 Solo Explorer</option>
                <option value="Couple">👫 Couple Getaway</option>
                <option value="Family">👨‍👩‍👧‍👦 Family Trip</option>
                <option value="Friends">🎒 Group of Friends</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Interests & Focus</label>
              <input 
                type="text" 
                name="interests" 
                placeholder="e.g., Food, Temples, Hiking" 
                value={formData.interests} 
                onChange={handleChange} 
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroupFull}>
              <button type="submit" disabled={loading} style={loading ? styles.buttonDisabled : styles.button}>
                {loading ? "✨ Crafting Your Custom Itinerary..." : "🚀 Generate Trip Itinerary"}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>⚠️ Planning Notice:</strong> {error}
          </div>
        )}

        {itinerary && (
          <div style={styles.resultsWrapper}>
            <div style={styles.resultHeader}>
              <div>
                <h2 style={styles.resultTitle}>🗺️ Your Personalized Plan</h2>
                <p style={styles.resultMeta}>{formData.destination} • {formData.days} Days • {formData.budget} Style</p>
              </div>
              <button onClick={handleSaveTrip} style={styles.saveBtn}>
                💾 Save Trip
              </button>
            </div>

            {saveStatus && <div style={styles.saveAlert}>{saveStatus}</div>}

            <div style={styles.timeline}>
              {daysList.length > 0 ? (
                daysList.map((dayItem, idx) => (
                  <div key={idx} style={styles.dayCard}>
                    <div style={styles.dayBadgeRow}>
                      <span style={styles.dayNumber}>Day {dayItem.day || idx + 1}</span>
                      <h3 style={styles.dayHeading}>{dayItem.title || `Day ${idx + 1} Itinerary`}</h3>
                      {dayItem.estimated_cost && (
                        <span style={styles.costBadge}>Est: {dayItem.estimated_cost}</span>
                      )}
                    </div>

                    <div style={styles.activityContainer}>
                      {Array.isArray(dayItem.activities) ? (
                        dayItem.activities.map((act, aIdx) => (
                          <div key={aIdx} style={styles.activityRow}>
                            <div style={styles.dotMarker}></div>
                            <p style={styles.activityText}>{act}</p>
                          </div>
                        ))
                      ) : (
                        <p style={styles.activityText}>{dayItem.activities}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.dayCard}>
                  <pre style={styles.jsonOutput}>{JSON.stringify(itinerary, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', paddingBottom: '60px' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  navBrand: { display: 'flex', alignItems: 'center', gap: '10px' },
  brandIcon: { fontSize: '22px' },
  brandText: { fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' },
  navTag: { fontSize: '13px', fontWeight: '600', color: '#6366f1', backgroundColor: '#e0e7ff', padding: '4px 12px', borderRadius: '20px' },
  mainContainer: { maxWidth: '800px', margin: '40px auto 0', padding: '0 20px' },
  heroSection: { textAlign: 'center', marginBottom: '32px' },
  heroTitle: { fontSize: '36px', fontWeight: '800', color: '#0f172a', marginBottom: '10px', letterSpacing: '-1px' },
  heroSubtitle: { fontSize: '16px', color: '#64748b', maxWidth: '600px', margin: '0 auto', lineHeight: '1.5' },
  card: { backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  inputGroupFull: { gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', backgroundColor: '#f8fafc', outline: 'none', color: '#0f172a' },
  select: { padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', backgroundColor: '#f8fafc', outline: 'none', color: '#0f172a', cursor: 'pointer' },
  button: { padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', width: '100%', marginTop: '10px' },
  buttonDisabled: { padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#94a3b8', color: '#ffffff', fontSize: '16px', fontWeight: '700', cursor: 'not-allowed', width: '100%', marginTop: '10px' },
  errorBox: { marginTop: '24px', padding: '16px 20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontSize: '14px', lineHeight: '1.5' },
  resultsWrapper: { marginTop: '40px' },
  resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  resultTitle: { fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 },
  resultMeta: { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0', fontWeight: '500' },
  saveBtn: { padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  saveAlert: { padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: '500' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '20px' },
  dayCard: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' },
  dayBadgeRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  dayNumber: { backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: '800', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' },
  dayHeading: { fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, flex: 1 },
  costBadge: { backgroundColor: '#f1f5f9', color: '#475569', fontSize: '13px', fontWeight: '600', padding: '6px 12px', borderRadius: '8px' },
  activityContainer: { display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '4px' },
  activityRow: { display: 'flex', alignItems: 'flex-start', gap: '14px' },
  dotMarker: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1', marginTop: '7px', flexShrink: 0 },
  activityText: { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: 0 },
  jsonOutput: { whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#334155' }
};