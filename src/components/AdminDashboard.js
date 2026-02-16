import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './AdminDashboard.css';

function AdminDashboard({ onBack }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAdminData(); }, []);

  const fetchAdminData = async () => {
    try {
      const { data: allGames } = await supabase.from('games').select('*');
      const { data: allUsers } = await supabase.from('profiles').select('id, username, created_at, role');
      const { data: publicGames } = await supabase.from('games').select('*').eq('visibility', 'public');
      const categoryCount = {};
      allGames?.forEach(game => { categoryCount[game.category] = (categoryCount[game.category] || 0) + 1; });
      const mostPopularCategory = Object.keys(categoryCount).length > 0 ? Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0] : ['N/A', 0];
      setStats({ totalUsers: allUsers?.length || 0, totalGames: allGames?.length || 0, publicGames: publicGames?.length || 0, avgGamesPerUser: allUsers?.length > 0 ? (allGames?.length / allUsers.length).toFixed(1) : 0, mostPopularCategory: mostPopularCategory[0], categoryPlayCount: mostPopularCategory[1] });
      setUsers(allUsers?.slice(0, 10) || []);
      const { data: games } = await supabase.from('games').select('id, score, total_questions, category, difficulty, visibility, created_at, profiles(username)').order('created_at', { ascending: false }).limit(10);
      setRecentGames(games || []);
      const { data: pending } = await supabase.from('custom_questions').select('*, profiles!custom_questions_creator_id_fkey(username)').eq('status', 'pending').order('created_at', { ascending: false });
    } catch (err) { console.error('Error:', err); }
    setLoading(false);
  };

  const handleApprove = async (questionId) => {
    const { error } = await supabase.from('custom_questions').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', questionId);
    if (!error) setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleReject = async (questionId) => {
    const { error } = await supabase.from('custom_questions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', questionId);
    if (!error) setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  if (loading) return (<div className="admin-dashboard"><button className="back-btn" onClick={onBack}>Back to Dashboard</button><h1>Admin Dashboard</h1><p className="loading">Loading...</p></div>);

  return (
    <div className="admin-dashboard">
      <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
      <h1>Admin Dashboard</h1>
      <div className="admin-stats-grid">
        <div className="admin-stat-card"><div className="stat-icon">??</div><div className="stat-number">{stats.totalUsers}</div><div className="stat-label">Total Users</div></div>
        <div className="admin-stat-card"><div className="stat-icon">??</div><div className="stat-number">{stats.totalGames}</div><div className="stat-label">Total Games</div></div>
        <div className="admin-stat-card"><div className="stat-icon">??</div><div className="stat-number">{stats.publicGames}</div><div className="stat-label">Public Games</div></div>
        <div className="admin-stat-card"><div className="stat-icon">??</div><div className="stat-number">{stats.avgGamesPerUser}</div><div className="stat-label">Avg Games/User</div></div>
      </div>
      <div className="admin-section"><h2>Most Popular Category</h2><div className="popular-category"><span className="category-name">{stats.mostPopularCategory}</span><span className="category-count">{stats.categoryPlayCount} games played</span></div></div>
      <div className="admin-section"><h2>Pending Questions ({pendingQuestions.length})</h2>{pendingQuestions.length === 0 ? <p style={{textAlign:"center",color:"#999"}}>No pending questions</p> : <div className="pending-questions">{pendingQuestions.map(q => <div key={q.id} className="pending-question-card"><div className="question-header"><span className="category-badge">{q.category}</span><span className="difficulty-badge">{q.difficulty}</span></div><div className="question-text">{q.question_text}</div><div className="answers-list"><div className="answer correct">? {q.correct_answer}</div>{q.incorrect_answers.map((ans, i) => <div key={i} className="answer incorrect">? {ans}</div>)}</div><div className="question-footer"><span className="creator">By: {q.profiles?.username}</span><div className="review-actions"><button className="approve-btn" onClick={() => handleApprove(q.id)}>Approve</button><button className="reject-btn" onClick={() => handleReject(q.id)}>Reject</button></div></div></div>)}</div>}</div>
      <div className="admin-section"><h2>Recent Users</h2><div className="admin-table"><table><thead><tr><th>Username</th><th>Role</th><th>Joined</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.username}</td><td><span className={`role-badge ${user.role}`}>{user.role || 'user'}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></div>
      <div className="admin-section"><h2>Recent Games</h2><div className="admin-table"><table><thead><tr><th>User</th><th>Category</th><th>Score</th><th>Difficulty</th><th>Visibility</th><th>Date</th></tr></thead><tbody>{recentGames.map(game => <tr key={game.id}><td>{game.profiles?.username || 'Unknown'}</td><td>{game.category}</td><td>{game.score}/{game.total_questions}</td><td><span className={`difficulty-badge ${game.difficulty}`}>{game.difficulty}</span></td><td><span className={`visibility-badge ${game.visibility}`}>{game.visibility}</span></td><td>{new Date(game.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></div>
    </div>
  );
}

export default AdminDashboard;
