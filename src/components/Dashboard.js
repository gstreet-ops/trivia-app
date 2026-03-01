import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';
import Achievements from './Achievements';
import { checkAchievements } from '../utils/achievementChecker';
import decodeHtml from '../utils/decodeHtml';
import { GamepadIcon, ChartIcon, TrophyIcon } from './Icons';

function Dashboard({ user, onStartQuiz, onReviewGame, onSettings, onCommunity, onAdmin, onCreateQuestion, onCommunities, onViewUserProfile }) {
  const [stats, setStats] = useState({ totalGames: 0, avgScore: 0, bestScore: 0 });
  const [recentGames, setRecentGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [expandedGameId, setExpandedGameId] = useState(null);
  const [gameAnswersCache, setGameAnswersCache] = useState({});

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    loadAchievements();
    checkAdminStatus();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLoading(true);
    setFetchError(null);
    const { data: games, error: gamesError } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500);
    if (gamesError) {
      console.error('fetchStats games error:', gamesError);
      setFetchError('Failed to load dashboard data. Please try again.');
      setLoading(false);
      return;
    }
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
    const { data: leaderboardData } = await supabase.from('games').select('user_id, score, total_questions, profiles(username, leaderboard_visibility, bot_flags)').eq('visibility', 'public').limit(50000);
    if (leaderboardData) {
      const userScores = {};
      leaderboardData.forEach(game => {
        if (game.profiles?.leaderboard_visibility === false && game.user_id !== user.id) return;
        if (game.profiles?.bot_flags?.flagged === true && game.user_id !== user.id) return;
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
    setLoading(false);
  };

  const toggleExpand = useCallback(async (gameId) => {
    if (expandedGameId === gameId) {
      setExpandedGameId(null);
      return;
    }
    setExpandedGameId(gameId);
    if (!gameAnswersCache[gameId]) {
      const { data } = await supabase.from('game_answers').select('*').eq('game_id', gameId).order('id', { ascending: true });
      setGameAnswersCache(prev => ({ ...prev, [gameId]: data || [] }));
    }
  }, [expandedGameId, gameAnswersCache]);

  if (loading) {
    return (
      <div className="dashboard">
        <h2 className="dashboard-welcome">Welcome back!</h2>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="dashboard">
        <h2 className="dashboard-welcome">Welcome back, {username || 'User'}!</h2>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--incorrect-text)', marginBottom: '12px' }}>{fetchError}</p>
          <button onClick={fetchStats} className="dashboard-start-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2 className="dashboard-welcome">Welcome back, {username}!</h2>
      <div className="dashboard-cta">
        <button onClick={onStartQuiz} className="dashboard-start-btn">Start New Quiz</button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><GamepadIcon size={22} /></div>
          <div className="stat-number">{stats.totalGames}</div>
          <div className="stat-label">Games</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><ChartIcon size={22} /></div>
          <div className="stat-number">{stats.avgScore}%</div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><TrophyIcon size={22} /></div>
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
        <h3><TrophyIcon size={18} /> Community Leaderboard</h3>
        <table aria-label="Community Leaderboard">
          <thead><tr><th>Rank</th><th>Player</th><th>Avg Score</th><th>Games</th></tr></thead>
          <tbody>{leaderboard.map((player, index) => (
            <tr key={player.userId}>
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
        <div className="recent-games-section">
          <h3>Recent Games</h3>
          <table className="recent-games-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Score</th>
                <th className="date-cell">Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentGames.map(game => (
                <React.Fragment key={game.id}>
                  <tr className={`recent-game-row ${expandedGameId === game.id ? 'expanded' : ''}`} onClick={(e) => { if (!e.target.closest('.review-btn-sm')) toggleExpand(game.id); }} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className={`expand-chevron ${expandedGameId === game.id ? 'expanded' : ''}`}>&#9658;</span>
                      <span className="cat-badge-sm">{game.category}</span>
                    </td>
                    <td><span className={`diff-badge-sm ${game.difficulty}`}>{game.difficulty}</span></td>
                    <td className="score-cell">
                      <strong>{game.score}/{game.total_questions}</strong>
                      <span className="score-pct">{game.total_questions > 0 ? Math.round(game.score / game.total_questions * 100) : 0}%</span>
                    </td>
                    <td className="date-cell">{new Date(game.created_at).toLocaleDateString()}</td>
                    <td><button className="review-btn-sm" onClick={() => onReviewGame(game.id)}>Review</button></td>
                  </tr>
                  {expandedGameId === game.id && (
                    <tr className="game-expand-row">
                      <td colSpan="5" style={{ padding: 0 }}>
                        <div className="game-expand-panel">
                          {!gameAnswersCache[game.id] ? (
                            <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
                          ) : gameAnswersCache[game.id].length === 0 ? (
                            <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '13px' }}>No answer data available.</div>
                          ) : (
                            gameAnswersCache[game.id].map((answer, idx) => (
                              <div key={idx} className="qa-item">
                                <div className="qa-question">Q{idx + 1}: {decodeHtml(answer.question_text)}</div>
                                {answer.is_correct ? (
                                  <div className="qa-correct">&#x2705; Your answer: {decodeHtml(answer.user_answer)} (correct)</div>
                                ) : (
                                  <div className="qa-wrong">&#x274C; Your answer: {decodeHtml(answer.user_answer)} &rarr; Correct: {decodeHtml(answer.correct_answer)}</div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
