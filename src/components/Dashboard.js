import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';
import Achievements from './Achievements';
import PerformanceCharts from './PerformanceCharts';
import { checkAchievements } from '../utils/achievementChecker';

function Dashboard({ user, onStartQuiz, onReviewGame, onSettings, onCommunity, onAdmin, onCreateQuestion, onCommunities }) {
  const [stats, setStats] = useState({ totalGames: 0, avgScore: 0, bestScore: 0 });
  const [recentGames, setRecentGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchStats();
    loadAchievements();
    fetchAllGames();
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    const { data } = await supabase.from('profiles').select('role, super_admin').eq('id', user.id).single();
    setIsAdmin(data?.role === 'admin' || data?.super_admin === true);
  };

  const fetchAllGames = async () => {
    const { data } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAllGames(data || []);
  };

  const loadAchievements = async () => {
    const badges = await checkAchievements(user.id, supabase);
    setEarnedBadges(badges);
  };

  const fetchStats = async () => {
    const { data: games } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (games && games.length > 0) {
      const totalGames = games.length;
      const totalScore = games.reduce((sum, g) => sum + g.score, 0);
      const totalQuestions = games.reduce((sum, g) => sum + g.total_questions, 0);
      const avgScore = ((totalScore / totalQuestions) * 100).toFixed(1);
      const bestGame = games.reduce((best, g) => {
        const percentage = (g.score / g.total_questions) * 100;
        return percentage > best ? percentage : best;
      }, 0);
      setStats({ totalGames, avgScore, bestScore: bestGame.toFixed(1) });
      setRecentGames(games.slice(0, 5));
    }
    const { data: leaderboardData } = await supabase.from('games').select('user_id, score, total_questions, profiles(username, leaderboard_visibility)').eq('visibility', 'public').order('created_at', { ascending: false }).limit(100);
    if (leaderboardData) {
      const userScores = {};
      leaderboardData.forEach(game => {
        if (game.profiles?.leaderboard_visibility === false && game.user_id !== user.id) return;
        if (!userScores[game.user_id]) {
          userScores[game.user_id] = { username: game.profiles?.username, totalScore: 0, totalQuestions: 0, games: 0 };
        }
        userScores[game.user_id].totalScore += game.score;
        userScores[game.user_id].totalQuestions += game.total_questions;
        userScores[game.user_id].games += 1;
      });
      const leaderboardArray = Object.values(userScores).map(u => ({ ...u, avgPercentage: ((u.totalScore / u.totalQuestions) * 100).toFixed(1) })).sort((a, b) => b.avgPercentage - a.avgPercentage).slice(0, 10);
      setLeaderboard(leaderboardArray);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          {isAdmin && <button className="admin-btn" onClick={onAdmin}>Admin</button>}
          {onCommunities && <button className="communities-btn" onClick={onCommunities}>My Leagues</button>}
          <button className="community-btn" onClick={onCommunity}>Community</button>
          <button className="settings-btn" onClick={onSettings}>Settings</button>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-number">{stats.totalGames}</div><div className="stat-label">Games Played</div></div>
        <div className="stat-card"><div className="stat-number">{stats.avgScore}%</div><div className="stat-label">Average Score</div></div>
        <div className="stat-card"><div className="stat-number">{stats.bestScore}%</div><div className="stat-label">Best Score</div></div>
      </div>
      <button className="create-question-btn" onClick={onCreateQuestion}>✍️ Create Question</button>
      <button className="start-quiz-btn" onClick={onStartQuiz}>Start New Quiz</button>
      <Achievements earnedBadges={earnedBadges} />
      <PerformanceCharts games={allGames} />
      <div className="leaderboard">
        <h3>🏆 Community Leaderboard</h3>
        <table>
          <thead><tr><th>Rank</th><th>Player</th><th>Avg Score</th><th>Games</th></tr></thead>
          <tbody>{leaderboard.map((player, index) => (<tr key={index}><td>{index + 1}</td><td>{player.username}</td><td>{player.avgPercentage}%</td><td>{player.games}</td></tr>))}</tbody>
        </table>
      </div>
      {recentGames.length > 0 && (
        <div className="recent-games">
          <h3>Recent Games</h3>
          {recentGames.map(game => (
            <div key={game.id} className="game-card" onClick={() => onReviewGame(game.id)}>
              <div className="game-info">
                <span className="game-category">{game.category}</span>
                <span className="game-difficulty">{game.difficulty}</span>
              </div>
              <div className="game-score">{game.score}/{game.total_questions}</div>
              <div className="game-date">{new Date(game.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
