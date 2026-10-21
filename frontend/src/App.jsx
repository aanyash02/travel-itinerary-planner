
import { useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://travel-itinerary-planner-chi.vercel.app"
).replace(/\/+$/, "");
const initialForm = {
  destination: "",
  start_date: "",
  end_date: "",
  budget: 10000,
  currency: "INR",
  travelers: 1,
  travel_style: "balanced",
  interests: ["sightseeing", "food"],
};

const interestOptions = [
  "sightseeing",
  "food",
  "culture",
  "adventure",
  "nature",
  "shopping",
  "relaxation",
  "nightlife",
];

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedTrips, setSavedTrips] = useState([]);

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function toggleInterest(interest) {
    setForm((previous) => ({
      ...previous,
      interests: previous.interests.includes(interest)
        ? previous.interests.filter((item) => item !== interest)
        : [...previous.interests, interest],
    }));
  }

  async function generateTrip(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setNotice("");
    setItinerary(null);

    try {
      const response = await fetch(`${API_URL}/api/trips/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          budget: Number(form.budget),
          travelers: Number(form.travelers),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Unable to generate your itinerary."
        );
      }

      const generated = result.itinerary || result.data;

      if (!generated || !Array.isArray(generated.days)) {
        throw new Error("The server returned an invalid itinerary.");
      }

      setItinerary(generated);
      setNotice("Your personalized itinerary is ready!");
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Check your API URL."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveTrip() {
    if (!itinerary) {
      setError("Generate an itinerary before saving.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/save-trip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: itinerary.destination || form.destination,
          days: itinerary.days.length,
          itinerary_data: itinerary,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Unable to save your trip.");
      }

      const savedTrip = {
        id: result.data?.[0]?.id || `${Date.now()}`,
        destination: itinerary.destination || form.destination,
        title: itinerary.title || form.destination,
        days: itinerary.days.length,
        itinerary,
      };

      setSavedTrips((previous) => [savedTrip, ...previous]);
      setNotice("Trip saved successfully!");
    } catch (err) {
      setError(err.message || "Unable to save your trip.");
    } finally {
      setSaving(false);
    }
  }

  function loadTrip(trip) {
    setItinerary(trip.itinerary);
    setNotice(`Viewing trip: ${trip.title}`);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateActivity(dayIndex, activityIndex, field, value) {
    setItinerary((previous) => {
      if (!previous) return previous;

      const days = previous.days.map((day, index) => {
        if (index !== dayIndex) return day;

        const activities = day.activities.map((activity, itemIndex) =>
          itemIndex === activityIndex
            ? { ...activity, [field]: value }
            : activity
        );

        return { ...day, activities };
      });

      return { ...previous, days };
    });

    setNotice("Activity edited locally. Save the updated trip to persist it.");
  }

  const activityCost = (activity) =>
    Number(activity.estimated_cost ?? 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-icon">✈</span>
          <span>WanderWise</span>
        </a>

        <p className="nav-label">WORKSPACE</p>

        <a className="nav-item active" href="#home">
          <span>▦</span> Dashboard
        </a>

        <a className="nav-item" href="#trip-builder">
          <span>＋</span> Create a trip
        </a>

        <a className="nav-item" href="#itinerary">
          <span>☷</span> Itinerary
        </a>

        <a className="nav-item" href="#saved-trips">
          <span>♡</span> Saved trips
        </a>

        <div className="sidebar-footer">
          <span className="avatar">W</span>
          <div>
            <strong>Travel planner</strong>
            <small>Your next adventure awaits</small>
          </div>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR PERSONAL TRAVEL ASSISTANT</p>
            <h1>Explore more. Plan less.</h1>
            <p className="muted">
              Create thoughtful trips tailored to your style and budget.
            </p>
          </div>
          <a className="topbar-button" href="#trip-builder">
            + New trip
          </a>
        </header>

        <section className="welcome-banner">
          <div>
            <span className="banner-tag">YOUR NEXT ADVENTURE STARTS HERE</span>
            <h2>Where will you go next?</h2>
            <p>
              Tell us what you love. Let AI help turn your travel ideas
              into a day-by-day plan.
            </p>
            <a href="#trip-builder" className="banner-button">
              Plan my trip →
            </a>
          </div>
          <div className="banner-art" aria-hidden="true">
            <span className="sun">☀</span>
            <span className="mountain mountain-back" />
            <span className="mountain mountain-front" />
            <span className="plane">✈</span>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon">✦</span>
            <p>AI trip planner</p>
            <h3>Personalized</h3>
            <small>Plans based on your interests</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon">₹</span>
            <p>Budget assistant</p>
            <h3>Cost-aware</h3>
            <small>Estimated expenses at a glance</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon">☷</span>
            <p>Your workspace</p>
            <h3>{savedTrips.length} saved trips</h3>
            <small>Saved in this browser session</small>
          </article>
        </section>

        <section className="content-grid">
          <section className="panel trip-form-panel" id="trip-builder">
            <div className="section-heading">
              <div>
                <p className="eyebrow">LET'S PLAN</p>
                <h2>Create your trip</h2>
              </div>
              <span className="step-badge">AI powered</span>
            </div>

            <form onSubmit={generateTrip} className="trip-form">
              <label>
                Destination
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="e.g. Jaipur, Rajasthan"
                  value={form.destination}
                  onChange={(event) =>
                    updateForm("destination", event.target.value)
                  }
                />
              </label>

              <div className="form-row">
                <label>
                  Start date
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(event) =>
                      updateForm("start_date", event.target.value)
                    }
                  />
                </label>

                <label>
                  End date
                  <input
                    type="date"
                    required
                    min={form.start_date || undefined}
                    value={form.end_date}
                    onChange={(event) =>
                      updateForm("end_date", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Total budget
                  <input
                    type="number"
                    required
                    min="1"
                    max="100000000"
                    value={form.budget}
                    onChange={(event) =>
                      updateForm("budget", event.target.value)
                    }
                  />
                </label>

                <label>
                  Currency
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      updateForm("currency", event.target.value)
                    }
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Number of travelers
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={form.travelers}
                    onChange={(event) =>
                      updateForm("travelers", event.target.value)
                    }
                  />
                </label>

                <label>
                  Travel style
                  <select
                    value={form.travel_style}
                    onChange={(event) =>
                      updateForm("travel_style", event.target.value)
                    }
                  >
                    <option value="budget">Budget-friendly</option>
                    <option value="balanced">Balanced</option>
                    <option value="luxury">Luxury</option>
                    <option value="relaxed">Relaxed</option>
                  </select>
                </label>
              </div>

              <fieldset className="interest-fieldset">
                <legend>What are you interested in?</legend>
                <div className="interest-list">
                  {interestOptions.map((interest) => (
                    <label className="interest-chip" key={interest}>
                      <input
                        type="checkbox"
                        checked={form.interests.includes(interest)}
                        onChange={() => toggleInterest(interest)}
                      />
                      <span>{interest}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? "✦ Creating your itinerary..." : "✦ Generate itinerary"}
              </button>
            </form>

            {error && (
              <div className="message error-message" role="alert">
                {error}
              </div>
            )}

            {notice && (
              <div className="message success-message" role="status">
                {notice}
              </div>
            )}
          </section>

          <aside className="panel tips-panel">
            <p className="eyebrow">TRAVEL SMARTER</p>
            <h2>Make every day count.</h2>
            <p className="muted">
              A few things that help us create a better itinerary.
            </p>

            <div className="tip-item">
              <span>01</span>
              <div>
                <strong>Set a realistic budget</strong>
                <p>Include meals, transport, and activities.</p>
              </div>
            </div>

            <div className="tip-item">
              <span>02</span>
              <div>
                <strong>Choose your interests</strong>
                <p>Your preferences shape your daily plan.</p>
              </div>
            </div>

            <div className="tip-item">
              <span>03</span>
              <div>
                <strong>Leave room to explore</strong>
                <p>Flexible schedules make travel more enjoyable.</p>
              </div>
            </div>

            <div className="privacy-note">
              <span>✦</span>
              AI recommendations are estimates. Verify prices, routes,
              and opening hours before your trip.
            </div>
          </aside>
        </section>

        {itinerary && (
          <section className="panel itinerary-panel" id="itinerary">
            <div className="section-heading itinerary-heading">
              <div>
                <p className="eyebrow">YOUR PERSONALIZED PLAN</p>
                <h2>{itinerary.title || itinerary.destination}</h2>
                <p className="muted">
                  {itinerary.destination || form.destination} ·{" "}
                  {itinerary.days.length} days · {form.travelers} traveler(s)
                </p>
              </div>

              <button
                className="secondary-button"
                type="button"
                onClick={saveTrip}
                disabled={saving}
              >
                {saving ? "Saving..." : "♡ Save trip"}
              </button>
            </div>

            <div className="budget-summary">
              <div>
                <small>Estimated total cost</small>
                <strong>
                  {form.currency}{" "}
                  {Number(
                    itinerary.estimated_total_cost ?? 0
                  ).toLocaleString()}
                </strong>
              </div>
              <div>
                <small>Your total budget</small>
                <strong>
                  {form.currency}{" "}
                  {Number(form.budget).toLocaleString()}
                </strong>
              </div>
              <div>
                <small>Number of days</small>
                <strong>{itinerary.days.length}</strong>
              </div>
            </div>

            {itinerary.budget_notes?.length > 0 && (
              <div className="budget-notes">
                <strong>Budget tips</strong>
                <ul>
                  {itinerary.budget_notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {itinerary.days.map((day, dayIndex) => (
              <article className="day-card" key={`${day.date}-${day.day}`}>
                <div className="day-heading">
                  <div className="day-number">
                    {String(day.day).padStart(2, "0")}
                  </div>
                  <div>
                    <p className="eyebrow">DAY {day.day}</p>
                    <h3>{day.theme || "Explore and discover"}</h3>
                    <p className="muted">{day.date}</p>
                  </div>
                  <span className="day-cost">
                    {form.currency}{" "}
                    {day.activities
                      .reduce((sum, activity) => sum + activityCost(activity), 0)
                      .toLocaleString()}
                  </span>
                </div>

                <div className="activities-list">
                  {(day.activities || []).map((activity, activityIndex) => (
                    <div
                      className="activity-card"
                      key={`${day.day}-${activityIndex}`}
                    >
                      <div className="activity-time">
                        {activity.time || "Flexible"}
                      </div>

                      <div className="activity-details">
                        <input
                          aria-label="Activity name"
                          className="activity-name-input"
                          value={activity.name || ""}
                          onChange={(event) =>
                            updateActivity(
                              dayIndex,
                              activityIndex,
                              "name",
                              event.target.value
                            )
                          }
                        />

                        <p>{activity.description}</p>

                        <div className="activity-meta">
                          <span>
                            {activity.category || "Activity"}
                          </span>
                          <span>
                            {activity.duration_minutes || 0} min
                          </span>
                          <span>
                            {form.currency}{" "}
                            {activityCost(activity).toLocaleString()}
                          </span>
                        </div>

                        {activity.transport && (
                          <small className="transport-note">
                            ↗ {activity.transport}
                          </small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}

            {itinerary.travel_tips?.length > 0 && (
              <div className="travel-tips">
                <h3>Helpful travel tips</h3>
                <ul>
                  {itinerary.travel_tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              className="primary-button"
              onClick={saveTrip}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save updated itinerary"}
            </button>
          </section>
        )}

        <section className="panel saved-panel" id="saved-trips">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR COLLECTION</p>
              <h2>Recently saved trips</h2>
            </div>
            <span className="step-badge">{savedTrips.length} trips</span>
          </div>

          {savedTrips.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✈</span>
              <h3>Your next adventure belongs here.</h3>
              <p>
                Generate an itinerary and press Save Trip to add it to
                this list.
              </p>
            </div>
          ) : (
            <div className="saved-trips-grid">
              {savedTrips.map((trip) => (
                <article className="saved-trip-card" key={trip.id}>
                  <span className="saved-trip-icon">✦</span>
                  <h3>{trip.title}</h3>
                  <p>{trip.destination}</p>
                  <small>{trip.days} days</small>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => loadTrip(trip)}
                  >
                    View itinerary
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="footer">
          WanderWise · Personalized travel planning with AI
        </footer>
      </main>
    </div>
  );
}
