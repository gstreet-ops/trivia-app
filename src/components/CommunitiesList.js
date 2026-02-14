import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CommunitiesList.css';

function CommunitiesList({ user, onViewCommunity, onBack }) {
  const [myCommunities, setMyCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newCommunityName, setNewCommunityName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => { fetchMyCommunities(); }, [user]);

  const fetchMyCommunities = async () => {
    try {
      const { data: memberships } = await supabase.from('community_members').select('community_id, communities(id, name, slug, invite_code, commissioner_id, season_start, season_end, profiles!communities_commissioner_id_fkey(username))').eq('user_id', user.id);
      setMyCommunities(memberships?.map(m => m.communities) || []);
    } catch (err) { console.error('Error:', err); }
    setLoading(false);
  };

  const joinCommunity = async () => {
    setError(null);
    try {
      const { data: community } = await supabase.from('communities').select('id').eq('invite_code', inviteCode.toUpperCase()).single();
      if (!community) { setError('Invalid invite code'); return; }
      const { error: joinError } = await supabase.from('community_members').insert([{ community_id: community.id, user_id: user.id }]);
      if (joinError) { if (joinError.code === '23505') { setError('Already a member'); } else { setError(joinError.message); } return; }
      setShowJoinModal(false);
      setInviteCode('');
      fetchMyCommunities();
    } catch (err) { setError(err.message); }
  };

  const createCommunity = async () => {
    setError(null);
    try {
      const slug = newCommunityName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data: community, error: createError } = await supabase.from('communities').insert([{ name: newCommunityName, slug: slug, commissioner_id: user.id, invite_code: inviteCode, season_start: new Date().toISOString(), season_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }]).select().single();
      if (createError) throw createError;
      await supabase.from('community_members').insert([{ community_id: community.id, user_id: user.id }]);
      setShowCreateModal(false);
      setNewCommunityName('');
      fetchMyCommunities();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="communities-list"><p>Loading...</p></div>;

  return (
    <div className="communities-list">
      <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
      <h1>My Communities</h1>
      <div className="action-buttons"><button className="create-btn" onClick={() => setShowCreateModal(true)}>Create Community</button><button className="join-btn" onClick={() => setShowJoinModal(true)}>Join Community</button></div>
      {myCommunities.length === 0 ? <div className="empty-state"><p>You haven't joined any communities yet.</p><p>Create your own or join with an invite code!</p></div> : (
        <div className="communities-grid">
          {myCommunities.map(community => (
            <div key={community.id} className="community-card" onClick={() => onViewCommunity(community.id)}>
              <h3>{community.name}</h3>
              <p className="commissioner">Commissioner: {community.profiles?.username}</p>
              <p className="dates">{new Date(community.season_start).toLocaleDateString()} - {new Date(community.season_end).toLocaleDateString()}</p>
              <p className="invite-code">Code: {community.invite_code}</p>
            </div>
          ))}
        </div>
      )}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Join Community</h2>{error && <p className="error">{error}</p>}<input type="text" placeholder="Enter invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} maxLength={8} /><div className="modal-buttons"><button onClick={joinCommunity}>Join</button><button onClick={() => { setShowJoinModal(false); setError(null); }}>Cancel</button></div></div></div>
      )}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Create Community</h2>{error && <p className="error">{error}</p>}<input type="text" placeholder="Community name" value={newCommunityName} onChange={e => setNewCommunityName(e.target.value)} /><div className="modal-buttons"><button onClick={createCommunity}>Create</button><button onClick={() => { setShowCreateModal(false); setError(null); }}>Cancel</button></div></div></div>
      )}
    </div>
  );
}

export default CommunitiesList;