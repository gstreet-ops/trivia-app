import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CommunityFeed.css';

function CommunityFeed({ currentUserId, onBack, onViewGame, onViewUserProfile }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    fetchPublicGames();
  }, [categoryFilter, difficultyFilter, sortBy]);

  const fetchPublicGames = async () => {
    try {
      let query = supabase.from('games').select('*, profiles(username, profile_visibility)').eq('visibility', 'public');
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      if (difficultyFilter !== 'all') query = query.eq('difficulty', difficultyFilter);
      if (sortBy === 'recent') { query = query.order('created_at', { ascending: false }); } else { query = query.order('score', { ascending: false }); }
      query = query.limit(20);
      const { data } = await query;
      const filteredGames = (data || []).filter(game => game.profiles?.profile_visibility !== false || game.user_id === currentUserId);
      setGames(filteredGames);
    } catch (error) { console.error('Error:', error); }
    setLoading(false);
  };

  const categories = ['General Knowledge', 'Film', 'Music', 'Geography', 'History', 'Sports', 'Science & Nature', 'Arts & Literature'];

  return (
    <div className="community-feed">
      <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
      <h1>Community Feed</h1>
      <div className="filters-section">
        <div className="filter-group"><label>Category</label><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All Categories</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
        <div className="filter-group"><label>Difficulty</label><select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}><option value="all">All Difficulties</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
        <div className="filter-group"><label>Sort By</label><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="recent">Most Recent</option><option value="highest">Highest Score</option></select></div>
      </div>
      {loading ? <p>Loading...</p> : games.length === 0 ? <p className="no-games">No public games yet!</p> : (
        <div className="games-grid">
          {games.map(game => (
            <div key={game.id} className="game-card-feed">
              <div className="game-header"><span className="username" onClick={() => onViewUserProfile(game.user_id, game.profiles?.username)}>{game.profiles?.username}</span><span className="game-date">{new Date(game.created_at).toLocaleDateString()}</span></div>
              <div className="game-details"><span className="category-badge">{game.category}</span><span className={'difficulty-badge ' + game.difficulty}>{game.difficulty}</span></div>
              <div className="game-score-large">{game.score}/{game.total_questions}<span className="percentage">({((game.score / game.total_questions) * 100).toFixed(0)}%)</span></div>
              <button className="view-btn" onClick={() => onViewGame(game.id)}>View Details</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommunityFeed;