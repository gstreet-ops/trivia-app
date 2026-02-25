import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import './CommunityMarketplace.css';

const CATEGORY_MAP = {
  'grade-school-trivia': 'Education',
  'middle-school-brain-bowl': 'Education',
  'barber-shop-talk': 'Workplace',
  'fast-food-challenge': 'Workplace',
  'cashier-champions': 'Workplace',
  'food-server-academy': 'Workplace',
  'music-masters': 'Music',
  'hip-hop-heads': 'Music',
  'baseball-nation': 'Sports',
  'ncaa-madness': 'Sports',
  'soccer-world': 'Sports',
  'nfl-fanatics': 'Sports',
  'nba-court-vision': 'Sports',
  'adult-trivia-night': 'General'
};

const CATEGORIES = ['All', 'Education', 'Workplace', 'Music', 'Sports', 'General'];

const SORT_OPTIONS = [
  { value: 'members', label: 'Most Members' },
  { value: 'questions', label: 'Most Questions' },
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A-Z' }
];

function getCategory(slug) {
  return CATEGORY_MAP[slug] || 'General';
}

function CommunityMarketplace({ user, onBack }) {
  const [communities, setCommunities] = useState([]);
  const [myMemberships, setMyMemberships] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('members');

  useEffect(() => {
    fetchMarketplace();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMarketplace = async () => {
    try {
      // Fetch public communities
      const { data: publicCommunities } = await supabase
        .from('communities')
        .select('id, name, slug, description, season_start, season_end, created_at, commissioner_id, settings, profiles!communities_commissioner_id_fkey(username)')
        .eq('visibility', 'public')
        .order('name');

      // Scope member/question count queries to public community IDs only
      const publicIds = (publicCommunities || []).map(c => c.id);

      // Fetch member counts
      const { data: memberCounts } = publicIds.length > 0
        ? await supabase.from('community_members').select('community_id').in('community_id', publicIds)
        : { data: [] };

      // Fetch question counts
      const { data: questionCounts } = publicIds.length > 0
        ? await supabase.from('community_questions').select('community_id').in('community_id', publicIds)
        : { data: [] };

      // Build count maps
      const memberCountMap = {};
      (memberCounts || []).forEach(m => {
        memberCountMap[m.community_id] = (memberCountMap[m.community_id] || 0) + 1;
      });

      const questionCountMap = {};
      (questionCounts || []).forEach(q => {
        questionCountMap[q.community_id] = (questionCountMap[q.community_id] || 0) + 1;
      });

      // Enrich communities with counts and category
      const enriched = (publicCommunities || []).map(c => ({
        ...c,
        memberCount: memberCountMap[c.id] || 0,
        questionCount: questionCountMap[c.id] || 0,
        category: getCategory(c.slug)
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

  const filtered = useMemo(() => {
    let result = communities.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (activeCategory !== 'All') {
      result = result.filter(c => c.category === activeCategory);
    }
    switch (sortBy) {
      case 'members': result.sort((a, b) => b.memberCount - a.memberCount); break;
      case 'questions': result.sort((a, b) => b.questionCount - a.questionCount); break;
      case 'newest': result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'az': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break;
    }
    return result;
  }, [communities, searchQuery, activeCategory, sortBy]);

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

      <div className="marketplace-toolbar">
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
        <select
          className="marketplace-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="marketplace-chips">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`marketplace-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="marketplace-result-count">
        Showing {filtered.length} of {communities.length} {communities.length === 1 ? 'community' : 'communities'}
      </div>

      {filtered.length === 0 ? (
        <div className="marketplace-empty">
          {searchQuery || activeCategory !== 'All'
            ? <p>No communities match your filters</p>
            : <p>No public communities available yet</p>
          }
        </div>
      ) : (
        <div className="marketplace-grid">
          {filtered.map(community => (
            <div key={community.id} className="marketplace-card" style={community.settings?.theme_color ? {borderTopColor: community.settings.theme_color, borderTopWidth: '3px'} : undefined}>
              <div className="marketplace-card-header">
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  {community.settings?.logo_url && <img src={community.settings.logo_url} alt="" style={{width:'32px', height:'32px', borderRadius:'6px', objectFit:'cover'}} />}
                  <h3>{community.name}</h3>
                </div>
                <span className={`marketplace-category-badge cat-${community.category.toLowerCase()}`}>
                  {community.category}
                </span>
              </div>
              <span className="marketplace-commissioner">
                by {community.profiles?.username || 'Unknown'}
              </span>

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
