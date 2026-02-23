import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CommunityMarketplace.css';

function CommunityMarketplace({ user, onBack }) {
  const [communities, setCommunities] = useState([]);
  const [myMemberships, setMyMemberships] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    fetchMarketplace();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMarketplace = async () => {
    try {
      // Fetch public communities
      const { data: publicCommunities } = await supabase
        .from('communities')
        .select('id, name, description, season_start, season_end, commissioner_id, profiles!communities_commissioner_id_fkey(username)')
        .eq('visibility', 'public')
        .order('name');

      // Fetch member counts
      const { data: memberCounts } = await supabase
        .from('community_members')
        .select('community_id');

      // Fetch question counts
      const { data: questionCounts } = await supabase
        .from('community_questions')
        .select('community_id');

      // Build count maps
      const memberCountMap = {};
      (memberCounts || []).forEach(m => {
        memberCountMap[m.community_id] = (memberCountMap[m.community_id] || 0) + 1;
      });

      const questionCountMap = {};
      (questionCounts || []).forEach(q => {
        questionCountMap[q.community_id] = (questionCountMap[q.community_id] || 0) + 1;
      });

      // Enrich communities with counts
      const enriched = (publicCommunities || []).map(c => ({
        ...c,
        memberCount: memberCountMap[c.id] || 0,
        questionCount: questionCountMap[c.id] || 0
      }));

      setCommunities(enriched);

      // Fetch current user's memberships
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      setMyMemberships(new Set((memberships || []).map(m => m.community_id)));
    } catch (err) {
      console.error('Error fetching marketplace:', err);
    }
    setLoading(false);
  };

  const handleJoin = async (communityId) => {
    setJoiningId(communityId);
    try {
      const { error } = await supabase
        .from('community_members')
        .insert([{ community_id: communityId, user_id: user.id }]);

      if (error) {
        if (error.code === '23505') {
          // Already a member — update UI state
          setMyMemberships(prev => new Set([...prev, communityId]));
        } else {
          alert('Failed to join: ' + error.message);
        }
      } else {
        setMyMemberships(prev => new Set([...prev, communityId]));
        // Update member count locally
        setCommunities(prev => prev.map(c =>
          c.id === communityId ? { ...c, memberCount: c.memberCount + 1 } : c
        ));
      }
    } catch (err) {
      alert('Failed to join community');
    }
    setJoiningId(null);
  };

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="marketplace">
        <button className="back-btn" onClick={onBack}>Back to My Communities</button>
        <div className="marketplace-loading">
          <div className="marketplace-spinner"></div>
          <p>Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace">
      <button className="back-btn" onClick={onBack}>Back to My Communities</button>

      <div className="marketplace-header">
        <h1>Community Marketplace</h1>
        <p className="marketplace-subtitle">Discover and join public trivia communities</p>
      </div>

      <div className="marketplace-search">
        <input
          type="text"
          placeholder="Search communities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="marketplace-search-input"
        />
        {searchQuery && (
          <button className="marketplace-search-clear" onClick={() => setSearchQuery('')}>×</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="marketplace-empty">
          {searchQuery
            ? <p>No communities match "{searchQuery}"</p>
            : <p>No public communities available yet</p>
          }
        </div>
      ) : (
        <div className="marketplace-grid">
          {filtered.map(community => (
            <div key={community.id} className="marketplace-card">
              <div className="marketplace-card-header">
                <h3>{community.name}</h3>
                <span className="marketplace-commissioner">
                  by {community.profiles?.username || 'Unknown'}
                </span>
              </div>

              <p className="marketplace-description">
                {community.description || 'No description'}
              </p>

              <div className="marketplace-stats">
                <span className="marketplace-stat">
                  <span className="marketplace-stat-icon">👥</span>
                  {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                </span>
                <span className="marketplace-stat">
                  <span className="marketplace-stat-icon">❓</span>
                  {community.questionCount} {community.questionCount === 1 ? 'question' : 'questions'}
                </span>
              </div>

              {community.season_start && community.season_end && (
                <p className="marketplace-dates">
                  {new Date(community.season_start).toLocaleDateString()} – {new Date(community.season_end).toLocaleDateString()}
                </p>
              )}

              <div className="marketplace-card-footer">
                {myMemberships.has(community.id) ? (
                  <span className="marketplace-joined-badge">Joined ✓</span>
                ) : (
                  <button
                    className="marketplace-join-btn"
                    onClick={() => handleJoin(community.id)}
                    disabled={joiningId === community.id}
                  >
                    {joiningId === community.id ? 'Joining...' : 'Join'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommunityMarketplace;
