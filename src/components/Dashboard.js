import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';
import Achievements from './Achievements';
import { checkAchievements } from '../utils/achievementChecker';

function Dashboard({ user, onStartQuiz, onReviewGame, onSettings, onCommunity, onAdmin, onCreateQuestion, onCommunities, onViewUserProfile }) {
  const [stats, setStats] = useState({ totalGames: 0, avgScore: 0, bestScore: 0 });
  const [recentGames, setRecentGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [username, setUsername] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchStats();
    loadAchievements();
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    const { data } = await supabase.from('profiles').select('role, super_admin, username').eq('id', user.id).single();
    setUsername(data?.username || 'User');
  };

  const loadAchievements = async () => {
    const badges = await checkAchievements(user.id, supabase);
    setEarnedBadges(badges);
  };

  const fetchStats = async () => {
    const { data: games, error: gamesError } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (gamesError) console.error('fetchStats games error:', gamesError);
    if (games && games.length > 0) {
      const totalGames = games.length;
      const totalScore = games.reduce((sum, g) => sum + g.score, 0);
      const totalQuestions = games.reduce((sum, g) => sum + g.total_questions, 0);
      const avgScore = totalQuestions > 0 ? ((totalScore / totalQuestions) * 100).toFixed(1) : '0.0';
      const bestGame = games.reduce((best, g) => {
        const percentage = g.total_questions > 0 ? Math.min((g.score / g.total_questions) * 100, 100) : 0;
        return percentage > best ? percentage : best;
      }, 0);
      setStats({ totalGames, avgScore: Math.min(avgScore, 100), bestScore: Math.min(bestGame, 100).toFixed(1) });
      setRecentGames(games.slice(0, 5));
    }
    const { data: leaderboardData } = await supabase.from('games').select('user_id, score, total_questions, profiles(username, leaderboard_visibility)').eq('visibility', 'public').order('created_at', { ascending: false }).limit(100);
    if (leaderboardData) {
      const userScores = {};
      leaderboardData.forEach(game => {
        if (game.profiles?.leaderboard_visibility === false && game.user_id !== user.id) return;
        if (!userScores[game.user_id]) {
          userScores[game.user_id] = { userId: game.user_id, username: game.profiles?.username, totalScore: 0, totalQuestions: 0, games: 0 };
        }
        userScores[game.user_id].totalScore += game.score;
        userScores[game.user_id].totalQuestions += game.total_questions;
        userScores[game.user_id].games += 1;
      });
      const leaderboardArray = Object.values(userScores).map(u => ({ ...u, avgPercentage: u.totalQuestions > 0 ? ((u.totalScore / u.totalQuestions) * 100).toFixed(1) : '0.0' })).sort((a, b) => b.avgPercentage - a.avgPercentage).slice(0, 10);
      setLeaderboard(leaderboardArray);
    }
  };

  return (
    <div className="dashboard">
      <h2 className="dashboard-welcome">Welcome back, {username}!</h2>
      <div className="dashboard-cta">
        <button onClick={onStartQuiz} className="dashboard-start-btn">Start New Quiz</button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-number">{stats.totalGames}</div>
          <div className="stat-label">Games</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-number">{stats.avgScore}%</div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-number">{stats.bestScore}%</div>
          <div className="stat-label">Best</div>
        </div>
      </div>

      {/* Achievements */}
      <div className="dashboard-section">
        <Achievements earnedBadges={earnedBadges} />
      </div>

      {/* Leaderboard */}
      <div className="leaderboard">
        <h3>🏆 Community Leaderboard</h3>
        <table aria-label="Community Leaderboard">
          <thead><tr><th>Rank</th><th>Player</th><th>Avg Score</th><th>Games</th></tr></thead>
          <tbody>{leaderboard.map((player, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>
                {player.userId !== user.id && onViewUserProfile ? (
                  <button className="leaderboard-player-link" onClick={() => onViewUserProfile(player.userId, player.username)}>
                    {player.username}
                  </button>
                ) : player.username}
              </td>
              <td>{player.avgPercentage}%</td>
              <td>{player.games}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <div className="recent-games">
          <h3>Recent Games</h3>
          {recentGames.map(game => {
            const pct = game.total_questions > 0 ? Math.min(Math.round((game.score / game.total_questions) * 100), 100) : 0;
            return (
              <div
                key={game.id}
                className="game-card"
                onClick={() => onReviewGame(game.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onReviewGame(game.id)}
                aria-label={`Review ${game.category} quiz, ${game.difficulty} difficulty, ${game.score} of ${game.total_questions} correct, played ${new Date(game.created_at).toLocaleDateString()}`}
              >
                <div className="game-left">
                  <span className="game-category">{game.category}</span>
                  <span className={`game-difficulty diff-${game.difficulty}`}>{game.difficulty}</span>
                </div>
                <div className="game-center">
                  <span className="game-score">{game.score}/{game.total_questions}</span>
                  <span className="game-pct">{pct}%</span>
                </div>
                <div className="game-date">{new Date(game.created_at).toLocaleDateString()}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
