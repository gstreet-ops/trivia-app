import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CommunityDetail.css';

function CommunityDetail({ communityId, currentUserId, onBack, onStartQuiz, onManageCommunity }) {
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunityData();
  }, [communityId]);

  const fetchCommunityData = async () => {
    try {
      const { data: communityData } = await supabase
        .from('communities')
        .select('*, profiles!communities_commissioner_id_fkey(username)')
        .eq('id', communityId)
        .single();
      setCommunity(communityData);

      const { data: membersData } = await supabase
        .from('community_members')
        .select('user_id, joined_at, profiles(username)')
        .eq('community_id', communityId)
        .order('joined_at', { ascending: true });
      setMembers(membersData || []);

      const { data: leaderboardData } = await supabase
        .from('community_leaderboards')
        .select('*')
        .eq('community_id', communityId)
        .order('rank', { ascending: true })
        .limit(10);
      setLeaderboard(leaderboardData || []);

      const { data: questionsData } = await supabase
        .from('community_questions')
        .select('*')
        .eq('community_id', communityId);
      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error fetching community:', error);
    }
    setLoading(false);
  };

  const isCommissioner = community?.commissioner_id === currentUserId;

  if (loading) return <div className="community-detail"><p>Loading...</p></div>;
  if (!community) return <div className="community-detail"><p>Community not found</p></div>;

  return (
    <div className="community-detail">
      <button className="back-btn" onClick={onBack}>← Back to My Leagues</button>
      
      <div className="community-header">
        <h1>{community.name}</h1>
        {isCommissioner && <span className="commissioner-badge">Commissioner</span>}
      </div>

      <div className="community-info">
        <div className="info-item">
          <span className="label">Commissioner:</span>
          <span className="value">{community.profiles?.username}</span>
        </div>
        <div className="info-item">
          <span className="label">Season:</span>
          <span className="value">{new Date(community.season_start).toLocaleDateString()} - {new Date(community.season_end).toLocaleDateString()}</span>
        </div>
        <div className="info-item">
          <span className="label">Invite Code:</span>
          <span className="value code">{community.invite_code}</span>
        </div>
        <div className="info-item">
          <span className="label">Members:</span>
          <span className="value">{members.length}</span>
        </div>
        <div className="info-item">
          <span className="label">Questions:</span>
          <span className="value">{questions.length}</span>
        </div>
      </div>

      {isCommissioner && (
        <button className="manage-community-btn" onClick={() => onManageCommunity(communityId)}>
          ⚙️ Manage Community
        </button>
      )}

      <button className="start-community-quiz-btn" onClick={() => onStartQuiz(communityId)}>
        Play Community Quiz
      </button>

      <div className="community-sections">
        <div className="section">
          <h2>🏆 Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="empty-message">No games played yet</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Games</th>
                  <th>Total Score</th>
                  <th>Avg %</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(player => (
                  <tr key={player.user_id} className={player.user_id === currentUserId ? 'current-user' : ''}>
                    <td>{player.rank}</td>
                    <td>{player.username}</td>
                    <td>{player.games_played}</td>
                    <td>{player.total_score}</td>
                    <td>{player.avg_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <h2>👥 Members ({members.length})</h2>
          <div className="members-list">
            {members.map(member => (
              <div key={member.user_id} className="member-card">
                <span className="member-name">{member.profiles?.username}</span>
                <span className="member-joined">Joined {new Date(member.joined_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunityDetail;
