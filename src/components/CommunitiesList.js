import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CommunitiesList.css';
import { sendJoinConfirmation } from '../utils/emailService';

function CommunitiesList({ user, userRole, onViewCommunity, onBack, onBrowseMarketplace, onMembershipChange }) {
  const [myCommunities, setMyCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newCommunityName, setNewCommunityName] = useState('');
  const [error, setError] = useState(null);

  // Request form state
  const [requestName, setRequestName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // User's past requests
  const [myRequests, setMyRequests] = useState([]);
  const [showMyRequests, setShowMyRequests] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMyCommunities(); fetchMyRequests(); }, [user]);

  const fetchMyCommunities = async () => {
    try {
      const { data: memberships } = await supabase.from('community_members').select('community_id, communities(id, name, slug, invite_code, commissioner_id, season_start, season_end, settings, profiles!communities_commissioner_id_fkey(username))').eq('user_id', user.id);
      setMyCommunities(memberships?.map(m => m.communities) || []);
    } catch (err) { console.error('Error:', err); }
    setLoading(false);
  };

  const fetchMyRequests = async () => {
    try {
      const { data } = await supabase
        .from('community_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });
      setMyRequests(data || []);
    } catch (err) { console.error('Error fetching requests:', err); }
  };

  const joinCommunity = async () => {
    setError(null);
    try {
      const { data: community } = await supabase.from('communities').select('id, name').eq('invite_code', inviteCode.toUpperCase()).single();
      if (!community) { setError('Invalid invite code'); return; }
      const { error: joinError } = await supabase.from('community_members').insert([{ community_id: community.id, user_id: user.id }]);
      if (joinError) { if (joinError.code === '23505') { setError('Already a member'); } else { setError(joinError.message); } return; }
      // Fire-and-forget join confirmation email
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      sendJoinConfirmation(user.id, profile?.username || '', community.name);
      setShowJoinModal(false);
      setInviteCode('');
      fetchMyCommunities();
      onMembershipChange?.();
    } catch (err) { setError(err.message); }
  };

  const createCommunity = async () => {
    setError(null);
    const trimmedName = newCommunityName.trim();
    if (trimmedName.length < 3) { setError('Community name must be at least 3 characters'); return; }
    if (trimmedName.length > 50) { setError('Community name must be 50 characters or fewer'); return; }
    try {
      const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const randomBytes = crypto.getRandomValues(new Uint8Array(8));
      const inviteCode = Array.from(randomBytes, b => chars[b % chars.length]).join('');
      const { data: community, error: createError } = await supabase.from('communities').insert([{ name: trimmedName, slug: slug, commissioner_id: user.id, invite_code: inviteCode, season_start: new Date().toISOString(), season_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }]).select().single();
      if (createError) throw createError;
      await supabase.from('community_members').insert([{ community_id: community.id, user_id: user.id, role: 'owner' }]);
      setShowCreateModal(false);
      setNewCommunityName('');
      fetchMyCommunities();
      onMembershipChange?.();
    } catch (err) { setError(err.message); }
  };

  const submitRequest = async () => {
    setRequestError(null);
    const trimmedName = requestName.trim();
    if (trimmedName.length < 3) { setRequestError('Community name must be at least 3 characters'); return; }
    if (trimmedName.length > 50) { setRequestError('Community name must be 50 characters or fewer'); return; }
    if (!requestReason.trim()) { setRequestError('Please provide a reason for your request'); return; }

    setRequestSubmitting(true);
    try {
      const { error } = await supabase.from('community_requests').insert([{
        requester_id: user.id,
        name: trimmedName,
        description: requestDescription.trim() || null,
        reason: requestReason.trim()
      }]);
      if (error) throw error;
      setRequestSuccess(true);
      setRequestName('');
      setRequestDescription('');
      setRequestReason('');
      fetchMyRequests();
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess(false);
      }, 2000);
    } catch (err) {
      setRequestError(err.message);
    }
    setRequestSubmitting(false);
  };

  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  if (loading) return <div className="communities-list"><p>Loading...</p></div>;

  return (
    <div className="communities-list">
      <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
      <h1>My Communities</h1>
      <div className="action-buttons">
        {(userRole === 'super_admin' || userRole === 'admin') && (
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>Create Community</button>
        )}
        <button className="join-btn" onClick={() => setShowJoinModal(true)}>Join Community</button>
        <button className="browse-btn" onClick={onBrowseMarketplace}>Browse Marketplace</button>
        <button className="request-btn" onClick={() => setShowRequestModal(true)}>
          Request a Community
        </button>
      </div>

      {/* My Requests toggle */}
      {myRequests.length > 0 && (
        <div style={{marginBottom: '20px'}}>
          <button
            className="my-requests-toggle"
            onClick={() => setShowMyRequests(!showMyRequests)}
          >
            My Requests ({myRequests.length})
            {pendingCount > 0 && <span className="request-pending-count">{pendingCount} pending</span>}
            <span style={{marginLeft: '6px', fontSize: '0.75rem'}}>{showMyRequests ? '▲' : '▼'}</span>
          </button>
          {showMyRequests && (
            <div className="my-requests-list">
              {myRequests.map(req => (
                <div key={req.id} className="my-request-card">
                  <div className="my-request-header">
                    <span className="my-request-name">{req.name}</span>
                    <span className={`request-status-badge status-${req.status}`}>{req.status}</span>
                  </div>
                  {req.description && <p className="my-request-desc">{req.description}</p>}
                  <p className="my-request-reason">Reason: {req.reason}</p>
                  <p className="my-request-date">Submitted {new Date(req.created_at).toLocaleDateString()}</p>
                  {req.status === 'rejected' && req.rejection_reason && (
                    <div className="my-request-rejection">
                      Rejection reason: {req.rejection_reason}
                    </div>
                  )}
                  {req.status === 'approved' && req.reviewed_at && (
                    <p className="my-request-approved-date">Approved {new Date(req.reviewed_at).toLocaleDateString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {myCommunities.length === 0 ? <div className="empty-state"><p>You haven't joined any communities yet.</p><p>Create your own or join with an invite code!</p></div> : (
        <div className="communities-grid">
          {myCommunities.map(community => (
            <div key={community.id} className="community-card" role="button" tabIndex={0} onClick={() => onViewCommunity(community.id, community.name)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewCommunity(community.id, community.name); } }} style={community.settings?.theme_color ? {borderTopColor: community.settings.theme_color} : undefined}>
              <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom: community.settings?.logo_url ? '0' : undefined}}>
                {community.settings?.logo_url && <img src={community.settings.logo_url} alt="" style={{width:'36px', height:'36px', borderRadius:'6px', objectFit:'cover'}} />}
                <h3 style={{margin:0}}>{community.name}</h3>
              </div>
              <p className="commissioner">Commissioner: {community.profiles?.username}</p>
              <p className="dates">{new Date(community.season_start).toLocaleDateString()} - {new Date(community.season_end).toLocaleDateString()}</p>
              {community.commissioner_id === user.id && <p className="invite-code">Code: {community.invite_code}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Join Community</h2>{error && <p className="error">{error}</p>}<input type="text" placeholder="Enter invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} maxLength={8} /><div className="modal-buttons"><button onClick={joinCommunity}>Join</button><button onClick={() => { setShowJoinModal(false); setError(null); }}>Cancel</button></div></div></div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Create Community</h2>{error && <p className="error">{error}</p>}<input type="text" placeholder="Community name" value={newCommunityName} onChange={e => setNewCommunityName(e.target.value)} /><div className="modal-buttons"><button onClick={createCommunity}>Create</button><button onClick={() => { setShowCreateModal(false); setError(null); }}>Cancel</button></div></div></div>
      )}

      {/* Request a Community Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => { if (!requestSubmitting) { setShowRequestModal(false); setRequestError(null); setRequestSuccess(false); } }}>
          <div className="modal request-modal" onClick={e => e.stopPropagation()}>
            <h2>Request a Community</h2>
            <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 16px'}}>
              Submit a request to create a new community. A platform admin will review and approve it.
            </p>
            {requestSuccess ? (
              <div className="request-success-msg">
                Request submitted! You'll be notified when it's reviewed.
              </div>
            ) : (
              <>
                {requestError && <p className="error">{requestError}</p>}
                <label className="request-label">Community Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Trivia Night Champions"
                  value={requestName}
                  onChange={e => setRequestName(e.target.value)}
                  maxLength={50}
                />
                <label className="request-label">Description</label>
                <textarea
                  className="request-textarea"
                  placeholder="What is this community about?"
                  value={requestDescription}
                  onChange={e => { if (e.target.value.length <= 300) setRequestDescription(e.target.value); }}
                  rows={3}
                />
                <div style={{textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '-8px', marginBottom: '12px'}}>
                  {requestDescription.length}/300
                </div>
                <label className="request-label">Why do you want this community? *</label>
                <textarea
                  className="request-textarea"
                  placeholder="Tell us why you'd like to create this community..."
                  value={requestReason}
                  onChange={e => { if (e.target.value.length <= 500) setRequestReason(e.target.value); }}
                  rows={3}
                />
                <div className="modal-buttons">
                  <button onClick={submitRequest} disabled={requestSubmitting}>
                    {requestSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button onClick={() => { setShowRequestModal(false); setRequestError(null); }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunitiesList;
