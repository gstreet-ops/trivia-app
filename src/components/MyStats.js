import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PerformanceCharts from './PerformanceCharts';
import './MyStats.css';

function MyStats({ user, onBack }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) console.error('MyStats fetchGames error:', error);
      setGames(data || []);
      setLoading(false);
    };
    fetchGames();
  }, [user]);

  return (
    <div className="my-stats">
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
      <h2 className="my-stats-title">My Stats</h2>
      {loading ? (
        <p className="my-stats-loading">Loading stats...</p>
      ) : (
        <div className="my-stats-section">
          <PerformanceCharts games={games} />
        </div>
      )}
    </div>
  );
}

export default MyStats;
