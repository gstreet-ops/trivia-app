import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './UserProfile.css';
import Achievements from './Achievements';
import { checkAchievements } from '../utils/achievementChecker';

function UserProfile({ userId, username, currentUserId, onBack, onViewGame }) {
  const [stats, setStats] = useState(null);
  const [games, setGames] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const { data: userGames } = await supabase.from('games').select('*').eq('user_id', userId).eq('visibility', 'public').order('created_at', { ascending: false }).limit(10);
      setGames(userGames || []);
      if (userGames && userGames.length > 0) {
        const totalGames = userGames.length;
        const totalScore = userGames.reduce((sum, g) => sum + g.score, 0);
        const totalQuestions = userGames.reduce((sum, g) => sum + g.total_questions, 0);
        const avgScore = ((totalScore / totalQuestions) * 100).toFixed(1);
        const categories = [...new Set(userGames.map(g => g.category))].length;
        const bestGame = userGames.reduce((best, g) => {
          const percentage = (g.score / g.total_questions) * 100;
          return percentage > best ? percentage : best;
        }, 0).toFixed(1);
        const badges = await checkAchievements(userId, supabase);
        setEarnedBadges(badges);
        setStats({ totalGames, avgScore, categories, bestGame });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    setLoading(false);
  };

  if (loading) return <div className="user-profile"><p>Loading...</p></div>;
  if (!stats) return <div className="user-profile"><p>No public games found for this user.</p></div>;

  return (
    <div className="user-profile">
      <button className="back-btn" onClick={onBack}>Back to Community</button>
      <h1>{username}'s Profile</h1>
      <div className="profile-stats-grid">
        <div className="profile-stat-card"><div className="stat-number">{stats.avgScore}%</div><div className="stat-label">Average Score</div></div>
        <div className="profile-stat-card"><div className="stat-number">{stats.totalGames}</div><div className="stat-label">Games Played</div></div>
        <div className="profile-stat-card"><div className="stat-number">{stats.categories}</div><div className="stat-label">Categories</div></div>
        <div className="profile-stat-card"><div className="stat-number">{stats.bestGame}%</div><div className="stat-label">Best Game</div></div>
      </div>
      <Achievements earnedBadges={earnedBadges} />
      <h3>Recent Games</h3>
      <div className="profile-games-grid">
        {games.map(game => (
          <div
            key={game.id}
            className="profile-game-card"
            onClick={() => onViewGame(game.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onViewGame(game.id)}
            aria-label={`Review ${game.category} quiz, ${game.difficulty} difficulty, ${game.score} of ${game.total_questions} correct, played ${new Date(game.created_at).toLocaleDateString()}`}
          >
            <div className="game-info">
              <span className="game-category">{game.category}</span>
              <span className="game-difficulty">{game.difficulty}</span>
            </div>
            <div className="game-score">{game.score}/{game.total_questions}</div>
            <div className="game-date">{new Date(game.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserProfile;
