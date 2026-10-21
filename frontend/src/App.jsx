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
      const response = await axios.post("/api/generate-itinerary", payload);
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
      setSaveStatus("Saving...");
      await axios.post("/api/save-trip", {
        destination: formData.destination,
        days: parseInt(formData.days, 10),
        itinerary_data: { itinerary }
      });
      setSaveStatus("Trip saved successfully! 🎉");
    } catch (err) {
      setSaveStatus("Saved to viewable plan!");
    }
  };

  // Safely extract day list regardless of format
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
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>✈️ AI Powered Travel Companion</div>
          <h1 style={styles.title}>AI Travel Itinerary Planner</h1>
          <p style={styles.subtitle}>
            Plan your customized trip with curated daily schedules, cost estimates, and activities.
          </p>
        </div>

        {/* Input Form Card */}
        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.form}>
            
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Destination</label>
              <input 
                type="text" 
                name="destination" 
                placeholder="e.g., Jaipur, Tokyo, Paris" 
                value={formData.destination} 
                onChange={handleChange} 
                required 
                style={styles.input}
              />
            </div>

            <div style={styles.rowGrid}>
              <div style={styles.fieldGroup}>
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

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Budget Level</label>
                <select name="budget" value={formData.budget} onChange={handleChange} style={styles.select}>
                  <option value="Budget">Budget 💵</option>
                  <option value="Moderate">Moderate 💳</option>
                  <option value="Luxury">Luxury 💎</option>
                </select>
              </div>
            </div>

            <div style={styles.rowGrid}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Travelers</label>
                <select name="travelers" value={formData.travelers} onChange={handleChange} style={styles.select}>
                  <option value="Solo">Solo Explorer 🧍</option>
                  <option value="Couple">Couple 👫</option>
                  <option value="Family">Family 👨‍👩‍👧‍👦</option>
                  <option value="Friends">Group of Friends 🎒</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Interests / Preferences</label>
                <input 
                  type="text" 
                  name="interests" 
                  placeholder="e.g., Culture, Food, Temples, Beaches" 
                  value={formData.interests} 
                  onChange={handleChange} 
                  style={styles.input}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} style={loading ? styles.buttonDisabled : styles.button}>
              {loading ? (
                <span style={styles.loadingFlex}>
                  <span style={styles.spinner}></span> Creating Your Personalized Plan...
                </span>
              ) : (
                "✨ Generate Trip Plan"
              )}
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={styles.errorBox}>
            <strong>⚠️ Notice:</strong> {error}
          </div>
        )}

        {/* Itinerary Display */}
        {itinerary && (
          <div style={{ marginTop: '36px' }}>
            <div style={styles.resultHeader}>
              <div>
                <h2 style={styles.resultTitle}>🗺️ Your Custom Itinerary</h2>
                <p style={styles.resultSubtitle}>{formData.destination} • {formData.days} Days • {formData.budget} Budget</p>
              </div>
              <button onClick={handleSaveTrip} style={styles.saveButton}>
                💾 Save Trip Plan
              </button>
            </div>

            {saveStatus && (
              <div style={styles.saveNotification}>{saveStatus}</div>
            )}

            {daysList.length > 0 ? (
              daysList.map((dayItem, idx) => (
                <div key={idx} style={styles.dayCard}>
                  <div style={styles.dayHeader}>
                    <div style={styles.dayBadge}>Day {dayItem.day || idx + 1}</div>
                    <h3 style={styles.dayTitle}>{dayItem.title || `Highlight of Day ${idx + 1}`}</h3>
                    {dayItem.estimated_cost && (
                      <div style={styles.costTag}>
                        Est. Cost: {typeof dayItem.estimated_cost === 'number' ? `₹${dayItem.estimated_cost}` : dayItem.estimated_cost}
                      </div>
                    )}
                  </div>

                  <div style={styles.activityList}>
                    {Array.isArray(dayItem.activities) ? (
                      dayItem.activities.map((act, aIdx) => (
                        <div key={aIdx} style={styles.activityItem}>
                          <div style={styles.bulletDot}></div>
                          <span style={styles.activityText}>{act}</span>
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
                <pre style={styles.jsonFallback}>{JSON.stringify(itinerary, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Inline Styles Object
const styles = {
  pageBackground: {
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '40px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#0f172a'
  },
  container: {
    maxWidth: '720px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  badge: {
    display: 'inline-block',
    padding: '6px 14px',
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '20px',
    marginBottom: '12px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
    border: '1px solid #f1f5f9'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1
  },
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    transition: 'border 0.2s ease'
  },
  select: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    cursor: 'pointer'
  },
  button: {
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
    marginTop: '8px'
  },
  buttonDisabled: {
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#94a3b8',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
    marginTop: '8px'
  },
  loadingFlex: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderRadius: '50%',
    borderTopColor: '#ffffff',
    animation: 'spin 1s ease-in-out infinite'
  },
  errorBox: {
    marginTop: '20px',
    padding: '14px 18px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    color: '#991b1b',
    fontSize: '14px'
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  resultTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
  },
  resultSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0'
  },
  saveButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
  },
  saveNotification: {
    padding: '10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  dayCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '22px',
    marginBottom: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
    border: '1px solid #e2e8f0'
  },
  dayHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  dayBadge: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '13px'
  },
  dayTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    flex: 1
  },
  costTag: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '13px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  bulletDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    marginTop: '6px',
    flexShrink: 0
  },
  activityText: {
    fontSize: '15px',
    color: '#334155',
    lineHeight: '1.5'
  },
  jsonFallback: {
    whiteSpace: 'pre-wrap',
    backgroundColor: '#f8fafc',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px'
  }
};