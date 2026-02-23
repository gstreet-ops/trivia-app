import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PerformanceCharts from './PerformanceCharts';
import './MyStats.css';

function MyStats({ user, onBack }) {
  const [allGames, setAllGames] = useState([]);

  useEffect(() => {
    const fetchAllGames = async () => {
      const { data, error } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) console.error('fetchAllGames error:', error);
      setAllGames(data || []);
    };
    fetchAllGames();
  }, [user]);

  return (
    <div className="my-stats">
      <h2>My Stats</h2>
      <div style={{background:'#fff', borderRadius:'10px', boxShadow:'0 2px 12px rgba(4,30,66,0.08)', padding:'14px 16px', marginBottom:'14px'}}>
        <PerformanceCharts games={allGames} />
      </div>
      <button onClick={onBack} style={{display:'inline-block', padding:'10px 24px', fontSize:'0.85rem', fontWeight:600, background:'#041E42', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer'}}>
        Back to Dashboard
      </button>
    </div>
  );
}

export default MyStats;
