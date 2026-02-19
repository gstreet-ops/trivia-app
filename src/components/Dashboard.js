import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';
import Achievements from './Achievements';
import PerformanceCharts from './PerformanceCharts';
import { checkAchievements } from '../utils/achievementChecker';

function Dashboard({ user, onStartQuiz, onReviewGame, onSettings, onCommunity, onAdmin, onCreateQuestion, onCommunities, onViewUserProfile }) {
  const [stats, setStats] = useState({ totalGames: 0, avgScore: 0, bestScore: 0 });
  const [recentGames, setRecentGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetchStats();
    loadAchievements();
    fetchAllGames();
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    const { data } = await supabase.from('profiles').select('role, super_admin, username').eq('id', user.id).single();
    setIsAdmin(data?.role === 'admin' || data?.super_admin === true);
    setUsername(data?.username || 'User');
  };

  const fetchAllGames = async () => {
    const { data, error } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) console.error('fetchAllGames error:', error);
    setAllGames(data || []);
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
        const percentage = g.total_questions > 0 ? (g.score / g.total_questions) * 100 : 0;
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
      <h1 className="dashboard-title">Dashboard</h1>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'6px', marginBottom:'10px', width:'100%'}}>
        {[
          {num: stats.totalGames, label: 'Games'},
          {num: stats.avgScore + '%', label: 'Avg Score'},
          {num: stats.bestScore + '%', label: 'Best'},
        ].map(({num, label}) => (
          <div key={label} style={{background:'#fff', border:'1px solid #DEE2E6', borderTop:'2px solid #041E42', borderRadius:'6px', padding:'10px 3px', textAlign:'center'}}>
            <div style={{fontSize:'0.75rem', fontWeight:700, color:'#041E42', lineHeight:1.2}}>{num}</div>
            <div style={{fontSize:'0.5rem', color:'#54585A', marginTop:'1px', textTransform:'uppercase', letterSpacing:'0.02em'}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{textAlign:'center', marginBottom:'10px'}}>
        <button onClick={onStartQuiz} style={{display:'inline-block', padding:'12px 20px', fontSize:'0.72rem', fontWeight:600, background:'#041E42', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer'}}>Start New Quiz</button>
      </div>
      <Achievements earnedBadges={earnedBadges} />
      <PerformanceCharts games={allGames} />
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
      {recentGames.length > 0 && (
        <div className="recent-games">
          <h3>Recent Games</h3>
          {recentGames.map(game => (
            <div
              key={game.id}
              className="game-card"
              onClick={() => onReviewGame(game.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onReviewGame(game.id)}
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
      )}
    </div>
  );
}

export default Dashboard;
