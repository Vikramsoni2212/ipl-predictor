import { useEffect, useMemo, useRef, useState } from "react";
import {
  matchTimings,
  pitchTypes,
  teams,
  tossDecisions,
  venues,
} from "./data/teams";
import { getPitchSuggestion, predictMatch } from "./utils/predictionEngine";

const initialConditions = {
  venue: "",
  pitchType: "",
  timing: "",
  toss: "Unknown",
  tossDecision: "Unknown",
};

const todaysMatch = {
  teamIds: ["mi", "csk"],
  conditions: {
    venue: "Wankhede",
    pitchType: "Batting Friendly",
    timing: "Night Match (Dew Advantage)",
    toss: "Unknown",
    tossDecision: "Unknown",
  },
  message: "Today's match loaded: Mumbai Indians vs Chennai Super Kings at Wankhede, 7:30 PM IST.",
};

function App() {
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [conditions, setConditions] = useState(initialConditions);
  const [pitchAdvice, setPitchAdvice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recommendedTeamId, setRecommendedTeamId] = useState("");
  const timerRef = useRef(null);

  const selectedTeams = useMemo(
    () => selectedTeamIds.map((id) => teams.find((team) => team.id === id)),
    [selectedTeamIds]
  );

  const teamA = selectedTeams[0];
  const teamB = selectedTeams[1];

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const updateCondition = (key, value) => {
    setConditions((current) => ({
      ...current,
      [key]: value,
    }));
    setResult(null);
    setRecommendedTeamId("");
    setError("");
  };

  const handleTeamSelect = (team) => {
    setResult(null);
    setRecommendedTeamId("");
    setPitchAdvice("");

    if (selectedTeamIds.includes(team.id)) {
      setError(`${team.name} is already selected.`);
      return;
    }

    setError("");

    if (selectedTeamIds.length < 2) {
      setSelectedTeamIds((current) => [...current, team.id]);
      return;
    }

    setSelectedTeamIds([selectedTeamIds[0], team.id]);
    setConditions((current) => ({
      ...current,
      toss: current.toss === "teamB" ? "Unknown" : current.toss,
    }));
  };

  const handlePitchSuggest = () => {
    if (!conditions.venue || !conditions.timing) {
      setPitchAdvice("");
      setError("Select venue and match timing before using Suggest Pitch (AI).");
      return;
    }

    const suggestion = getPitchSuggestion(conditions.venue, conditions.timing);

    if (!suggestion) {
      setError("Pitch suggestion is not available for this venue.");
      return;
    }

    setConditions((current) => ({
      ...current,
      pitchType: suggestion.pitchType,
    }));
    setPitchAdvice(suggestion.explanation);
    setResult(null);
    setRecommendedTeamId("");
    setError("");
  };

  const handleUseTodaysMatch = () => {
    window.clearTimeout(timerRef.current);
    setSelectedTeamIds(todaysMatch.teamIds);
    setConditions(todaysMatch.conditions);
    setPitchAdvice(todaysMatch.message);
    setError("");
    setLoading(false);
    setResult(null);
    setRecommendedTeamId("");
  };

  const validate = () => {
    if (!teamA || !teamB) {
      return "Select two different IPL teams.";
    }

    if (!conditions.venue) {
      return "Select a venue.";
    }

    if (!conditions.pitchType) {
      return "Select a pitch type or use Suggest Pitch (AI).";
    }

    if (!conditions.timing) {
      return "Select match timing.";
    }

    return "";
  };

  const runPrediction = (highlightBestPick = false) => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      setResult(null);
      setRecommendedTeamId("");
      return;
    }

    setError("");
    setResult(null);
    setRecommendedTeamId("");
    setLoading(true);
    window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const prediction = predictMatch({
        teamA,
        teamB,
        venue: conditions.venue,
        pitchType: conditions.pitchType,
        timing: conditions.timing,
        toss: conditions.toss,
        tossDecision: conditions.tossDecision,
      });

      setResult(prediction);
      if (highlightBestPick) {
        setRecommendedTeamId(prediction.winner.id);
      }
      setLoading(false);
    }, 900);
  };

  const handlePredict = () => {
    runPrediction(false);
  };

  const handleSuggestBestPick = () => {
    runPrediction(true);
  };

  const handleReset = () => {
    window.clearTimeout(timerRef.current);
    setSelectedTeamIds([]);
    setConditions(initialConditions);
    setPitchAdvice("");
    setError("");
    setLoading(false);
    setResult(null);
    setRecommendedTeamId("");
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">IPL 2026</p>
          <h1>Match Winner Predictor</h1>
        </div>
        <div className={`selected-strip ${teamA && teamB ? "is-match-ready" : ""}`} aria-live="polite">
          <span>{teamA ? `A: ${teamA.code}` : "A: Open"}</span>
          <strong>VS</strong>
          <span>{teamB ? `B: ${teamB.code}` : "B: Open"}</span>
        </div>
      </section>

      <section className="layout-grid">
        <div className="team-zone">
          <div className="section-heading">
            <p className="eyebrow">Squads</p>
            <h2>Pick Teams</h2>
          </div>

          <div className="team-grid">
            {teams.map((team) => {
              const selectedIndex = selectedTeamIds.indexOf(team.id);
              const isRecommended = recommendedTeamId === team.id;
              const selectedClass =
                selectedIndex === 0 ? "slot-a" : selectedIndex === 1 ? "slot-b" : "";

              return (
                <button
                  className={`team-card ${selectedIndex >= 0 ? "is-selected" : ""} ${selectedClass} ${isRecommended ? "is-recommended" : ""}`}
                  key={team.id}
                  type="button"
                  onClick={() => handleTeamSelect(team)}
                  style={{ "--team-accent": team.accent }}
                  aria-pressed={selectedIndex >= 0}
                >
                  {isRecommended && <span className="best-pick-badge">Best Pick</span>}
                  <span className="selection-badge">
                    {selectedIndex === 0 ? "Team A" : selectedIndex === 1 ? "Team B" : team.code}
                  </span>
                  <span className="logo-frame">
                    <img src={team.logo} alt={`${team.name} logo`} loading="lazy" />
                  </span>
                  <span className="team-name">{team.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="control-panel">
          <div className="section-heading">
            <p className="eyebrow">Conditions</p>
            <h2>Match Setup</h2>
          </div>

          <button className="today-match-button" type="button" onClick={handleUseTodaysMatch}>
            <span className="button-icon">T</span>
            Use Today's Match
          </button>

          <div className="form-grid">
            <label className="field">
              <span>Venue</span>
              <select
                value={conditions.venue}
                onChange={(event) => updateCondition("venue", event.target.value)}
              >
                <option value="">Select venue</option>
                {venues.map((venue) => (
                  <option key={venue.name} value={venue.name}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Pitch Type</span>
              <select
                value={conditions.pitchType}
                onChange={(event) => updateCondition("pitchType", event.target.value)}
              >
                <option value="">Select pitch</option>
                {pitchTypes.map((pitch) => (
                  <option key={pitch} value={pitch}>
                    {pitch}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Match Timing</span>
              <select
                value={conditions.timing}
                onChange={(event) => updateCondition("timing", event.target.value)}
              >
                <option value="">Select timing</option>
                {matchTimings.map((timing) => (
                  <option key={timing} value={timing}>
                    {timing}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Toss</span>
              <select
                value={conditions.toss}
                onChange={(event) => updateCondition("toss", event.target.value)}
              >
                <option value="teamA">{teamA ? `Team A - ${teamA.name}` : "Team A"}</option>
                <option value="teamB">{teamB ? `Team B - ${teamB.name}` : "Team B"}</option>
                <option value="Unknown">Unknown</option>
              </select>
            </label>

            <label className="field">
              <span>Toss Decision</span>
              <select
                value={conditions.tossDecision}
                onChange={(event) => updateCondition("tossDecision", event.target.value)}
              >
                {tossDecisions.map((decision) => (
                  <option key={decision} value={decision}>
                    {decision}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="ai-button" type="button" onClick={handlePitchSuggest}>
            <span className="button-icon">AI</span>
            Suggest Pitch (AI)
          </button>

          <button className="best-pick-button" type="button" onClick={handleSuggestBestPick}>
            <span className="button-icon">BP</span>
            Suggest Best Pick
          </button>

          {pitchAdvice && <p className="helper-text">{pitchAdvice}</p>}
          {error && <p className="error-text">{error}</p>}

          <div className="action-row">
            <button className="predict-button" type="button" onClick={handlePredict}>
              <span className="button-icon">GO</span>
              Predict Winner
            </button>
            <button className="reset-button" type="button" onClick={handleReset}>
              <span className="button-icon">R</span>
              Reset
            </button>
          </div>
        </aside>
      </section>

      <section className="result-band" aria-live="polite">
        {loading && (
          <div className="loading-state">
            <span className="loader" aria-hidden="true" />
            <p>Calculating match conditions...</p>
          </div>
        )}

        {!loading && result && (
          <div className="result-content">
            <div>
              <p className="eyebrow">Match</p>
              <h2>{result.match}</h2>
            </div>

            <div className="winner-card">
              <span className="winner-logo">
                <img src={result.winner.logo} alt={`${result.winner.name} logo`} />
              </span>
              <div>
                <p className="eyebrow">Prediction</p>
                <h3>{result.winner.name}</h3>
                <p className="probability">{result.probability}% win probability</p>
                <p className={`confidence confidence-${result.confidence.toLowerCase()}`}>
                  Confidence: {result.confidence}
                </p>
              </div>
            </div>

            <div className="factor-list">
              {result.factors.map((factor) => (
                <span key={factor}>{factor}</span>
              ))}
            </div>

            <div className="explanation-card">
              <p className="eyebrow">Why This Prediction</p>
              <p className="explanation-summary">{result.explanation.summary}</p>
              <div className="explanation-grid">
                {result.explanation.keyFactors.map((factor) => (
                  <p key={factor}>{factor}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !result && (
          <div className="empty-result">
            <p className="eyebrow">Prediction</p>
            <h2>Ready for the toss call</h2>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
