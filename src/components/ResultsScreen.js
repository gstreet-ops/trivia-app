import React, { useState, useEffect } from 'react';
import './ResultsScreen.css';

function ResultsScreen({ score, onRestart }) {
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = () => {
    const saved = localStorage.getItem('triviaLeaderboard');
    if (saved) {
      setLeaderboard(JSON.parse(saved));
    }
  };

  const saveScore = () => {
    if (!playerName.trim()) return;

    const newEntry = {
      name: playerName.trim(),
      score: score,
      date: new Date().toLocaleDateString()
    };

    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('triviaLeaderboard', JSON.stringify(updatedLeaderboard));
    setNameSaved(true);
  };

  const getPerformanceMessage = () => {
    if (score === 10) return '🏆 Perfect Score! Incredible!';
    if (score >= 8) return '🌟 Excellent work!';
    if (score >= 6) return '👍 Good job!';
    if (score >= 4) return '📚 Not bad, keep practicing!';
    return '💪 Try again, you can do better!';
  };

  return (
    <div className="results-screen">
      <h1>Quiz Complete!</h1>
      
      <div className="score-display">
        <div className="final-score">{score}/10</div>
        <p className="performance-message">{getPerformanceMessage()}</p>
      </div>

      {!nameSaved ? (
        <div className="name-input-section">
          <h3>Save your score to the leaderboard</h3>
          <div className="name-input-container">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && saveScore()}
              maxLength={20}
            />
            <button onClick={saveScore} disabled={!playerName.trim()}>
              Save Score
            </button>
          </div>
        </div>
      ) : (
        <p className="score-saved">✓ Score saved!</p>
      )}

      <div className="leaderboard">
        <h2>Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="no-scores">No scores yet. Be the first!</p>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <div key={index} className="leaderboard-entry">
                <span className="rank">#{index + 1}</span>
                <span className="name">{entry.name}</span>
                <span className="entry-score">{entry.score}/10</span>
                <span className="date">{entry.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="restart-btn" onClick={onRestart}>
        Play Again
      </button>
    </div>
  );
}

export default ResultsScreen;
