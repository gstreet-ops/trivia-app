import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './AdminDashboard.css';
import { ShieldIcon, UsersIcon, GamepadIcon, ChartIcon, StarIcon, PlusIcon } from './Icons';
import { isSuperAdmin, isPlatformAdmin, getPlatformRole } from '../utils/permissions';
import ConfirmModal from './ConfirmModal';
import { sendGenericEmail, sendQuestionNotification } from '../utils/emailService';

function AdminDashboard({ onBack, currentUserId }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Users tab state
  const [activeTab, setActiveTab] = useState('overview');
  const [allUsers, setAllUsers] = useState([]);
  const [userGameCounts, setUserGameCounts] = useState({});
  const [userCommunityCounts, setUserCommunityCounts] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSort, setUserSort] = useState({ key: 'created_at', dir: 'desc' });
  const [userPage, setUserPage] = useState(0);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteCommissioned, setDeleteCommissioned] = useState([]);
  const USERS_PER_PAGE = 20;

  // AI Requests tab state
  const [aiRequests, setAiRequests] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);
  const [rejectNotes, setRejectNotes] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [currentAdminProfile, setCurrentAdminProfile] = useState(null);

  // Community Requests tab state
  const [communityRequests, setCommunityRequests] = useState([]);
  const [communityRequestHistory, setCommunityRequestHistory] = useState([]);
  const [crRejectNotes, setCrRejectNotes] = useState({});
  const [crRejectingId, setCrRejectingId] = useState(null);
  const [crProcessingId, setCrProcessingId] = useState(null);

  // Flagged Users tab state
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [unflaggingId, setUnflaggingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => { fetchAdminData(); fetchAiRequests(); fetchCommunityRequests(); fetchFlaggedUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toastTimerRef = useRef(null);
  const showToast = (msg, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const fetchAdminData = async () => {
    try {
      // --- Authorization gate: verify admin role BEFORE fetching data ---
      const { data: profileCheck } = await supabase.from('profiles').select('platform_role, super_admin, role').eq('id', currentUserId).single();
      if (!isPlatformAdmin(profileCheck)) {
        setLoading(false);
        onBack();
        return;
      }
      setCurrentAdminProfile(profileCheck);

      const [
        { data: allGames },
        { data: profilesData },
        { data: memberships },
        { data: games },
        { data: pending }
      ] = await Promise.all([
        supabase.from('games').select('id, score, total_questions, category, difficulty, visibility, created_at, user_id').limit(10000),
        supabase.from('profiles').select('id, username, created_at, role, super_admin, platform_role').limit(5000),
        supabase.from('community_members').select('user_id').limit(10000),
        supabase.from('games').select('id, score, total_questions, category, difficulty, visibility, created_at, profiles(username)').order('created_at', { ascending: false }).limit(10),
        supabase.from('custom_questions').select('*, profiles!custom_questions_creator_id_fkey(username)').eq('status', 'pending').order('created_at', { ascending: false })
      ]);

      const categoryCount = {};
      const publicGameCount = (allGames || []).filter(g => g.visibility === 'public').length;
      allGames?.forEach(game => { categoryCount[game.category] = (categoryCount[game.category] || 0) + 1; });
      const mostPopularCategory = Object.keys(categoryCount).length > 0 ? Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0] : ['N/A', 0];
      setStats({ totalUsers: profilesData?.length || 0, totalGames: allGames?.length || 0, publicGames: publicGameCount, avgGamesPerUser: profilesData?.length > 0 ? (allGames?.length / profilesData.length).toFixed(1) : 0, mostPopularCategory: mostPopularCategory[0], categoryPlayCount: mostPopularCategory[1] });
      setUsers(profilesData?.slice(0, 10) || []);
      setAllUsers(profilesData || []);

      // Build game counts per user
      const gameCounts = {};
      allGames?.forEach(g => { gameCounts[g.user_id] = (gameCounts[g.user_id] || 0) + 1; });
      setUserGameCounts(gameCounts);

      // Build community membership counts
      const commCounts = {};
      memberships?.forEach(m => { commCounts[m.user_id] = (commCounts[m.user_id] || 0) + 1; });
      setUserCommunityCounts(commCounts);

      setRecentGames(games || []);
      setPendingQuestions(pending || []);
    } catch (err) { console.error('Error:', err); }
    setLoading(false);
  };

  // AI Request handlers
  const fetchAiRequests = async () => {
    try {
      const { data: pending } = await supabase
        .from('generation_requests')
        .select('*, communities(name), profiles:requested_by(username)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      setAiRequests(pending || []);

      const { data: history } = await supabase
        .from('generation_requests')
        .select('*, communities(name), profiles:requested_by(username), reviewer:reviewed_by(username)')
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);
      setAiHistory(history || []);
    } catch (err) {
      console.error('Error fetching AI requests:', err);
    }
  };

  const handleApproveAiRequest = async (requestId) => {
    const { error } = await supabase.from('generation_requests').update({
      status: 'approved',
      reviewed_by: currentUserId,
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);
    if (error) { showToast('Failed to approve: ' + error.message, 'error'); return; }

    // Notify requester
    const req = aiRequests.find(r => r.id === requestId);
    if (req?.requested_by) {
      await supabase.from('notifications').insert([{
        user_id: req.requested_by,
        type: 'ai_request_approved',
        title: 'AI Request Approved!',
        message: `Your AI question request for "${req.theme}" has been approved and questions are being generated.`,
        link_screen: 'commissioner'
      }]);
      sendGenericEmail(req.requested_by, req.profiles?.username || '', 'AI Request Approved!', `Your AI question request for "${req.theme}" has been approved and questions are being generated.`);
    }

    showToast('Request approved! Questions are being generated...');
    fetchAiRequests();

    // Fire-and-forget: invoke Edge Function to generate questions
    supabase.functions.invoke('generate-questions', {
      body: { request_id: requestId }
    }).then(({ error: fnError }) => {
      if (fnError) {
        console.error('Edge Function error:', fnError);
        showToast('Generation failed: ' + fnError.message, 'error');
      }
      fetchAiRequests();
    });
  };

  const handleRejectAiRequest = async (requestId) => {
    const notes = rejectNotes[requestId]?.trim() || '';
    const { error } = await supabase.from('generation_requests').update({
      status: 'rejected',
      reviewed_by: currentUserId,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes || null
    }).eq('id', requestId);
    if (error) { showToast('Failed to reject: ' + error.message, 'error'); return; }

    // Notify requester
    const req = aiRequests.find(r => r.id === requestId);
    if (req?.requested_by) {
      const notesSuffix = notes ? ` Reason: "${notes}"` : '';
      await supabase.from('notifications').insert([{
        user_id: req.requested_by,
        type: 'ai_request_rejected',
        title: 'AI Request Declined',
        message: `Your AI question request for "${req.theme}" was not approved.${notesSuffix}`,
        link_screen: 'commissioner'
      }]);
      sendGenericEmail(req.requested_by, req.profiles?.username || '', 'AI Request Declined', `Your AI question request for "${req.theme}" was not approved.${notesSuffix}`);
    }

    setRejectingId(null);
    setRejectNotes(prev => { const n = { ...prev }; delete n[requestId]; return n; });
    showToast('Request rejected.');
    fetchAiRequests();
  };

  // Community Request handlers
  const fetchCommunityRequests = async () => {
    try {
      const { data: pending } = await supabase
        .from('community_requests')
        .select('*, profiles:requester_id(username)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      setCommunityRequests(pending || []);

      const { data: history } = await supabase
        .from('community_requests')
        .select('*, profiles:requester_id(username), reviewer:reviewed_by(username)')
        .neq('status', 'pending')
        .order('reviewed_at', { ascending: false })
        .limit(20);
      setCommunityRequestHistory(history || []);
    } catch (err) {
      console.error('Error fetching community requests:', err);
    }
  };

  const handleApproveCommunityRequest = async (requestId) => {
    const req = communityRequests.find(r => r.id === requestId);
    if (!req) return;
    setCrProcessingId(requestId);
    try {
      // Create the community
      const slug = req.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const randomBytes = crypto.getRandomValues(new Uint8Array(8));
      const inviteCode = Array.from(randomBytes, b => chars[b % chars.length]).join('');
      const { data: community, error: createError } = await supabase.from('communities').insert([{
        name: req.name,
        slug,
        description: req.description || null,
        commissioner_id: req.requester_id,
        invite_code: inviteCode,
        season_start: new Date().toISOString(),
        season_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      }]).select().single();
      if (createError) throw createError;

      // Add requester as owner member
      await supabase.from('community_members').insert([{
        community_id: community.id,
        user_id: req.requester_id,
        role: 'owner'
      }]);

      // Update request status
      await supabase.from('community_requests').update({
        status: 'approved',
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString()
      }).eq('id', requestId);

      // Notify requester
      await supabase.from('notifications').insert([{
        user_id: req.requester_id,
        type: 'community_request_approved',
        title: 'Community Request Approved!',
        message: `Your community "${req.name}" has been created! You are now the commissioner.`,
        link_screen: 'communities'
      }]);
      sendGenericEmail(req.requester_id, req.profiles?.username || '', 'Community Request Approved!', `Your community "${req.name}" has been created! You are now the commissioner.`);

      showToast(`"${req.name}" created — ${req.profiles?.username} is now commissioner`);
      fetchCommunityRequests();
    } catch (err) {
      showToast('Failed to approve: ' + err.message, 'error');
    }
    setCrProcessingId(null);
  };

  const handleRejectCommunityRequest = async (requestId) => {
    const notes = crRejectNotes[requestId]?.trim() || '';
    setCrProcessingId(requestId);
    try {
      await supabase.from('community_requests').update({
        status: 'rejected',
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: notes || null
      }).eq('id', requestId);

      // Notify requester
      const req = communityRequests.find(r => r.id === requestId);
      if (req?.requester_id) {
        const notesSuffix = notes ? ` Reason: "${notes}"` : '';
        await supabase.from('notifications').insert([{
          user_id: req.requester_id,
          type: 'community_request_rejected',
          title: 'Community Request Declined',
          message: `Your request for "${req.name}" was not approved.${notesSuffix}`,
          link_screen: 'communities'
        }]);
        sendGenericEmail(req.requester_id, req.profiles?.username || '', 'Community Request Declined', `Your request for "${req.name}" was not approved.${notesSuffix}`);
      }

      setCrRejectingId(null);
      setCrRejectNotes(prev => { const n = { ...prev }; delete n[requestId]; return n; });
      showToast('Request rejected.');
      fetchCommunityRequests();
    } catch (err) {
      showToast('Failed to reject: ' + err.message, 'error');
    }
    setCrProcessingId(null);
  };

  // Flagged Users handlers
  const fetchFlaggedUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, bot_flags, created_at')
        .eq('bot_flags->>flagged', 'true')
        .order('created_at', { ascending: false });

      // Fetch game counts for flagged users
      if (data && data.length > 0) {
        const userIds = data.map(u => u.id);
        const { data: games } = await supabase
          .from('games')
          .select('user_id')
          .in('user_id', userIds);

        const gameCounts = {};
        (games || []).forEach(g => { gameCounts[g.user_id] = (gameCounts[g.user_id] || 0) + 1; });

        setFlaggedUsers(data.map(u => ({ ...u, gameCount: gameCounts[u.id] || 0 })));
      } else {
        setFlaggedUsers([]);
      }
    } catch (err) {
      console.error('Error fetching flagged users:', err);
    }
  };

  const handleUnflagUser = (userId, username) => {
    setConfirmAction({
      message: `Unflag ${username}? This will restore them to leaderboards.`,
      onConfirm: async () => {
        setConfirmAction(null);
        setUnflaggingId(userId);
        try {
          const { error } = await supabase.from('profiles').update({
            bot_flags: { flagged: false, reasons: [], flagged_at: null }
          }).eq('id', userId);
          if (error) throw error;
          showToast(`${username} has been unflagged`);
          fetchFlaggedUsers();
        } catch (err) {
          showToast('Failed to unflag: ' + err.message, 'error');
        }
        setUnflaggingId(null);
      }
    });
  };

  const handleApprove = async (questionId) => {
    const { error } = await supabase.from('custom_questions').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', questionId);
    if (error) {
      console.error('Error approving question:', error);
      showToast('Failed to approve question: ' + error.message, 'error');
    } else {
      // Notify submitter
      const q = pendingQuestions.find(q => q.id === questionId);
      if (q?.creator_id) {
        const preview = q.question_text.length > 50 ? q.question_text.slice(0, 50) + '...' : q.question_text;
        await supabase.from('notifications').insert([{
          user_id: q.creator_id,
          type: 'question_approved',
          title: 'Question Approved!',
          message: `Your question "${preview}" has been approved and is now available in quizzes!`,
          link_screen: 'dashboard'
        }]);
        sendQuestionNotification(q.creator_id, q.profiles?.username || '', q.question_text, 'approved');
      }
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
    }
  };

  const handleReject = async (questionId) => {
    const { error } = await supabase.from('custom_questions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', questionId);
    if (error) {
      console.error('Error rejecting question:', error);
      showToast('Failed to reject question: ' + error.message, 'error');
    } else {
      // Notify submitter
      const q = pendingQuestions.find(q => q.id === questionId);
      if (q?.creator_id) {
        const preview = q.question_text.length > 50 ? q.question_text.slice(0, 50) + '...' : q.question_text;
        await supabase.from('notifications').insert([{
          user_id: q.creator_id,
          type: 'question_rejected',
          title: 'Question Not Approved',
          message: `Your question "${preview}" was not approved. You can edit and resubmit from the question creator.`,
          link_screen: 'createQuestion'
        }]);
        sendQuestionNotification(q.creator_id, q.profiles?.username || '', q.question_text, 'rejected');
      }
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
    }
  };

  // Users tab logic

  const handlePlatformRoleChange = (userId, username, newRole) => {
    if (userId === currentUserId) return;
    const labels = { user: 'User', admin: 'Admin', super_admin: 'Super Admin' };
    setConfirmAction({
      message: `Change ${username}'s platform role to ${labels[newRole]}?${newRole === 'super_admin' ? ' Super admins have full platform access.' : ''}`,
      confirmLabel: 'Change Role',
      destructive: newRole === 'super_admin',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const updates = { platform_role: newRole };
          if (newRole === 'super_admin') {
            updates.super_admin = true;
            updates.role = 'admin';
          } else if (newRole === 'admin') {
            updates.super_admin = false;
            updates.role = 'admin';
          } else {
            updates.super_admin = false;
            updates.role = 'user';
          }
          const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
          if (error) { showToast('Failed to change role: ' + error.message, 'error'); return; }
          setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
          showToast(`${username} is now ${labels[newRole]}`);
        } catch (err) {
          showToast('Failed to change role', 'error');
        }
      }
    });
  };

  const handleViewActivity = async (userId) => {
    if (expandedUser === userId) { setExpandedUser(null); setExpandedData(null); return; }
    setExpandedUser(userId);
    try {
      const { data: games } = await supabase.from('games').select('score, total_questions, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(500);
      const { data: memberships } = await supabase.from('community_members').select('communities(name)').eq('user_id', userId).limit(100);
      const totalGames = games?.length || 0;
      const avgPct = totalGames > 0
        ? Math.round(games.reduce((sum, g) => sum + (g.total_questions > 0 ? (g.score / g.total_questions) * 100 : 0), 0) / totalGames)
        : 0;
      const communities = memberships?.map(m => m.communities?.name).filter(Boolean) || [];
      const lastGame = games?.[0]?.created_at || null;
      const user = allUsers.find(u => u.id === userId);
      setExpandedData({ totalGames, avgPct, communities, lastGame, createdAt: user?.created_at });
    } catch (err) {
      console.error('Error fetching activity:', err);
      setExpandedData({ totalGames: 0, avgPct: 0, communities: [], lastGame: null, createdAt: null });
    }
  };

  const handleOpenDeleteModal = async (user) => {
    setDeleteTarget(user);
    setDeleteConfirmText('');
    setDeleteLoading(false);
    try {
      const { data } = await supabase.from('communities').select('id, name').eq('commissioner_id', user.id);
      setDeleteCommissioned(data || []);
    } catch { setDeleteCommissioned([]); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.username) return;
    setDeleteLoading(true);
    const userId = deleteTarget.id;

    // Abort-on-error: throws on first failure to prevent partial corrupt state
    const delStep = async (label, queryFn) => {
      const { error } = await queryFn();
      if (error) throw new Error(`${label}: ${error.message}`);
    };

    try {
      // 1. Delete user's direct data
      await delStep('game_answers', () => supabase.from('game_answers').delete().eq('user_id', userId));
      await delStep('games', () => supabase.from('games').delete().eq('user_id', userId));
      await delStep('community_members', () => supabase.from('community_members').delete().eq('user_id', userId));
      await delStep('custom_questions', () => supabase.from('custom_questions').delete().eq('creator_id', userId));
      await delStep('notifications', () => supabase.from('notifications').delete().eq('user_id', userId));
      await delStep('multiplayer_answers', () => supabase.from('multiplayer_answers').delete().eq('user_id', userId));
      await delStep('multiplayer_participants', () => supabase.from('multiplayer_participants').delete().eq('user_id', userId));
      await delStep('community_messages', () => supabase.from('community_messages').delete().eq('user_id', userId));
      await delStep('multiplayer_rooms', () => supabase.from('multiplayer_rooms').delete().eq('host_id', userId));
      await delStep('generation_requests', () => supabase.from('generation_requests').delete().eq('requested_by', userId));

      // 2. Delete commissioner-owned communities and their data
      for (const comm of deleteCommissioned) {
        const cid = comm.id;
        await delStep(`community_members (${comm.name})`, () => supabase.from('community_members').delete().eq('community_id', cid));
        // Delete game_answers for games in this community
        const { data: communityGames } = await supabase.from('games').select('id').eq('community_id', cid);
        if (communityGames?.length > 0) {
          const gameIds = communityGames.map(g => g.id);
          await delStep(`game_answers (${comm.name})`, () => supabase.from('game_answers').delete().in('game_id', gameIds));
        }
        await delStep(`games (${comm.name})`, () => supabase.from('games').delete().eq('community_id', cid));
        await delStep(`generation_requests (${comm.name})`, () => supabase.from('generation_requests').delete().eq('community_id', cid));
        await delStep(`question_templates (${comm.name})`, () => supabase.from('question_templates').delete().eq('community_id', cid));
        await delStep(`community_questions (${comm.name})`, () => supabase.from('community_questions').delete().eq('community_id', cid));
        await delStep(`community_announcements (${comm.name})`, () => supabase.from('community_announcements').delete().eq('community_id', cid));
        await delStep(`season_archives (${comm.name})`, () => supabase.from('season_archives').delete().eq('community_id', cid));
        await delStep(`community_messages (${comm.name})`, () => supabase.from('community_messages').delete().eq('community_id', cid));
        await delStep(`media_library (${comm.name})`, () => supabase.from('media_library').delete().eq('community_id', cid));
        await delStep(`multiplayer_rooms (${comm.name})`, () => supabase.from('multiplayer_rooms').delete().eq('community_id', cid));
        await delStep(`community (${comm.name})`, () => supabase.from('communities').delete().eq('id', cid));
      }

      // 3. Delete profile
      await delStep('profile', () => supabase.from('profiles').delete().eq('id', userId));

      // Note: auth.users row is orphaned — anon key cannot call supabase.auth.admin.deleteUser()

      showToast(`${deleteTarget.username} permanently deleted`);
    } catch (err) {
      console.error('User deletion aborted:', err);
      showToast(`Deletion aborted: ${err.message}`, 'error');
    }

    setDeleteTarget(null);
    setDeleteLoading(false);
    fetchAdminData();
  };

  const getRoleLabel = (user) => {
    return getPlatformRole(user);
  };

  const filteredUsers = allUsers
    .filter(u => {
      if (userSearch && !u.username?.toLowerCase().includes(userSearch.toLowerCase())) return false;
      if (userRoleFilter === 'user') return !u.super_admin && u.role !== 'admin';
      if (userRoleFilter === 'admin') return u.role === 'admin' && !u.super_admin;
      if (userRoleFilter === 'super_admin') return u.super_admin;
      return true;
    })
    .sort((a, b) => {
      const dir = userSort.dir === 'asc' ? 1 : -1;
      switch (userSort.key) {
        case 'username': return dir * (a.username || '').localeCompare(b.username || '');
        case 'role': return dir * (getRoleLabel(a).localeCompare(getRoleLabel(b)));
        case 'created_at': return dir * (new Date(a.created_at) - new Date(b.created_at));
        case 'games': return dir * ((userGameCounts[a.id] || 0) - (userGameCounts[b.id] || 0));
        default: return 0;
      }
    });

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const pagedUsers = filteredUsers.slice(userPage * USERS_PER_PAGE, (userPage + 1) * USERS_PER_PAGE);

  const handleSort = (key) => {
    setUserSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    setUserPage(0);
  };

  const sortArrow = (key) => {
    if (userSort.key !== key) return '';
    return userSort.dir === 'asc' ? ' ▲' : ' ▼';
  };

  // User stats summary
  const adminCount = allUsers.filter(u => u.role === 'admin' && !u.super_admin).length;
  const superAdminCount = allUsers.filter(u => u.super_admin).length;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsersThisWeek = allUsers.filter(u => new Date(u.created_at) >= oneWeekAgo).length;

  if (loading) return (<div className="admin-dashboard"><button className="admin-back-btn" onClick={onBack}>← Back to Dashboard</button><h1 className="admin-title"><ShieldIcon size={20} /> Super Admin</h1><p className="admin-empty">Loading...</p></div>);

  return (
    <div className="admin-dashboard">
      <button className="admin-back-btn" onClick={onBack}>← Back to Dashboard</button>
      <h1 className="admin-title"><ShieldIcon size={20} /> Super Admin</h1>

      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel || 'Confirm'}
          destructive={confirmAction.destructive || false}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users ({allUsers.length})</button>
        <button className={`admin-tab ${activeTab === 'ai-requests' ? 'active' : ''}`} onClick={() => setActiveTab('ai-requests')}>AI Requests{aiRequests.length > 0 ? ` (${aiRequests.length})` : ''}</button>
        <button className={`admin-tab ${activeTab === 'community-requests' ? 'active' : ''}`} onClick={() => setActiveTab('community-requests')}>Communities{communityRequests.length > 0 ? ` (${communityRequests.length})` : ''}</button>
        <button className={`admin-tab ${activeTab === 'flagged' ? 'active' : ''}`} onClick={() => setActiveTab('flagged')}>Flagged{flaggedUsers.length > 0 ? ` (${flaggedUsers.length})` : ''}</button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon"><UsersIcon size={22} /></div>
              <div className="admin-stat-number">{stats.totalUsers}</div>
              <div className="admin-stat-label">Total Users</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon"><GamepadIcon size={22} /></div>
              <div className="admin-stat-number">{stats.totalGames}</div>
              <div className="admin-stat-label">Total Games</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon"><GamepadIcon size={22} /></div>
              <div className="admin-stat-number">{stats.publicGames}</div>
              <div className="admin-stat-label">Public Games</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon"><ChartIcon size={22} /></div>
              <div className="admin-stat-number">{stats.avgGamesPerUser}</div>
              <div className="admin-stat-label">Avg Games/User</div>
            </div>
          </div>

          <div className="admin-section">
            <h2>Most Popular Category</h2>
            <div className="popular-category">
              <span className="category-name">{stats.mostPopularCategory}</span>
              <span className="category-count">{stats.categoryPlayCount} games played</span>
            </div>
          </div>

          <div className="admin-section">
            <h2>Pending Questions ({pendingQuestions.length})</h2>
            {pendingQuestions.length === 0 ? (
              <p className="admin-empty">No pending questions</p>
            ) : (
              <div className="pending-questions">
                {pendingQuestions.map(q => (
                  <div key={q.id} className="pending-question-card">
                    <div className="question-header">
                      <span className="admin-category-badge">{q.category}</span>
                      <span className={`admin-difficulty-badge diff-${q.difficulty}`}>{q.difficulty}</span>
                    </div>
                    <div className="question-text">{q.question_text}</div>
                    <div className="answers-list">
                      <div className="answer correct">✓ {q.correct_answer}</div>
                      {q.incorrect_answers.map((ans, i) => (
                        <div key={i} className="answer incorrect">✗ {ans}</div>
                      ))}
                    </div>
                    <div className="question-footer">
                      <span className="creator">By: {q.profiles?.username}</span>
                      <div className="review-actions">
                        <button className="approve-btn" onClick={() => handleApprove(q.id)}>✓ Approve</button>
                        <button className="reject-btn" onClick={() => handleReject(q.id)}>✗ Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-section">
            <h2>Recent Users</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Username</th><th>Role</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td><span className={`role-badge role-${user.super_admin ? 'admin' : 'user'}`}>{user.super_admin ? 'super admin' : 'user'}</span></td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-section">
            <h2>Recent Games</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>User</th><th>Category</th><th>Score</th><th>Diff</th><th>Vis</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {recentGames.map(game => (
                    <tr key={game.id}>
                      <td>{game.profiles?.username || 'Unknown'}</td>
                      <td>{game.category}</td>
                      <td className="admin-score">{game.score}/{game.total_questions}</td>
                      <td><span className={`admin-difficulty-badge diff-${game.difficulty}`}>{game.difficulty}</span></td>
                      <td><span className={`vis-badge vis-${game.visibility}`}>{game.visibility}</span></td>
                      <td>{new Date(game.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon"><UsersIcon size={22} /></div>
              <div className="admin-stat-number">{allUsers.length}</div>
              <div className="admin-stat-label">Total Users</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon"><ShieldIcon size={22} /></div>
              <div className="admin-stat-number">{adminCount}</div>
              <div className="admin-stat-label">Admins</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon"><StarIcon size={22} /></div>
              <div className="admin-stat-number">{superAdminCount}</div>
              <div className="admin-stat-label">Super Admins</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon"><PlusIcon size={22} /></div>
              <div className="admin-stat-number">{newUsersThisWeek}</div>
              <div className="admin-stat-label">New This Week</div>
            </div>
          </div>

          <div className="admin-section">
            <h2>Manage Users</h2>
            <div className="um-toolbar">
              <div className="um-search-wrap">
                <input
                  type="text"
                  className="um-search"
                  placeholder="Search username..."
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }}
                />
                {userSearch && <button className="um-search-clear" onClick={() => { setUserSearch(''); setUserPage(0); }}>×</button>}
              </div>
              <select className="um-filter" value={userRoleFilter} onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(0); }}>
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
            </div>

            <div className="um-count">
              Showing {pagedUsers.length} of {filteredUsers.length} users
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table um-table">
                <thead>
                  <tr>
                    <th className="um-sortable" onClick={() => handleSort('username')}>Username{sortArrow('username')}</th>
                    <th className="um-sortable" onClick={() => handleSort('role')}>Platform Role{sortArrow('role')}</th>
                    <th className="um-sortable" onClick={() => handleSort('games')}>Games{sortArrow('games')}</th>
                    <th>Communities</th>
                    <th className="um-sortable" onClick={() => handleSort('created_at')}>Joined{sortArrow('created_at')}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map(user => {
                    const roleLabel = getRoleLabel(user);
                    const isSelf = user.id === currentUserId;
                    return (
                      <React.Fragment key={user.id}>
                        <tr className={expandedUser === user.id ? 'um-expanded-row' : ''}>
                          <td className="um-username">{user.username}{isSelf && <span className="um-you-badge">you</span>}</td>
                          <td>
                            {isSuperAdmin(currentAdminProfile) && !isSelf ? (
                              <select
                                value={roleLabel}
                                onChange={(e) => handlePlatformRoleChange(user.id, user.username, e.target.value)}
                                style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '6px', border: '1px solid #DEE2E6' }}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                              </select>
                            ) : (
                              <span className={`role-badge role-${roleLabel === 'user' ? 'user' : 'admin'}`}>
                                {roleLabel === 'super_admin' ? 'super admin' : roleLabel}
                              </span>
                            )}
                          </td>
                          <td>{userGameCounts[user.id] || 0}</td>
                          <td>{userCommunityCounts[user.id] || 0}</td>
                          <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          <td className="um-actions">
                            <button className="um-action-btn um-view" onClick={() => handleViewActivity(user.id)}>
                              {expandedUser === user.id ? 'Hide' : 'Activity'}
                            </button>
                            {!isSelf && !isSuperAdmin(user) && (
                              <button className="um-action-btn um-delete" onClick={() => handleOpenDeleteModal(user)}>Delete</button>
                            )}
                          </td>
                        </tr>
                        {expandedUser === user.id && expandedData && (
                          <tr className="um-detail-row">
                            <td colSpan={6}>
                              <div className="um-detail-panel">
                                <div className="um-detail-grid">
                                  <div className="um-detail-item">
                                    <span className="um-detail-label">Total Games</span>
                                    <span className="um-detail-value">{expandedData.totalGames}</span>
                                  </div>
                                  <div className="um-detail-item">
                                    <span className="um-detail-label">Avg Score</span>
                                    <span className="um-detail-value">{expandedData.avgPct}%</span>
                                  </div>
                                  <div className="um-detail-item">
                                    <span className="um-detail-label">Last Game</span>
                                    <span className="um-detail-value">{expandedData.lastGame ? new Date(expandedData.lastGame).toLocaleDateString() : 'Never'}</span>
                                  </div>
                                  <div className="um-detail-item">
                                    <span className="um-detail-label">Account Created</span>
                                    <span className="um-detail-value">{expandedData.createdAt ? new Date(expandedData.createdAt).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="um-detail-communities">
                                  <span className="um-detail-label">Communities:</span>
                                  {expandedData.communities.length > 0
                                    ? expandedData.communities.map((name, i) => <span key={i} className="um-community-tag">{name}</span>)
                                    : <span className="um-detail-none">None</span>
                                  }
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="um-pagination">
                <button className="um-page-btn" onClick={() => setUserPage(p => p - 1)} disabled={userPage === 0}>← Previous</button>
                <span className="um-page-info">Page {userPage + 1} of {totalPages}</span>
                <button className="um-page-btn" onClick={() => setUserPage(p => p + 1)} disabled={userPage >= totalPages - 1}>Next →</button>
              </div>
            )}
          </div>
        </>
      )}

      {deleteTarget && (
        <div className="um-delete-overlay" onClick={() => { if (!deleteLoading) setDeleteTarget(null); }}>
          <div className="um-delete-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', color: 'var(--navy)', fontSize: '1rem' }}>Delete User Account</h3>
            <div className="um-delete-warning">
              This will permanently delete all data for this user. This action cannot be undone.
            </div>
            <div className="um-delete-stats">
              <div><span className="um-delete-stats-label">Username</span><span className="um-delete-stats-value">{deleteTarget.username}</span></div>
              <div><span className="um-delete-stats-label">Games</span><span className="um-delete-stats-value">{userGameCounts[deleteTarget.id] || 0}</span></div>
              <div><span className="um-delete-stats-label">Communities</span><span className="um-delete-stats-value">{userCommunityCounts[deleteTarget.id] || 0}</span></div>
              <div><span className="um-delete-stats-label">Joined</span><span className="um-delete-stats-value">{new Date(deleteTarget.created_at).toLocaleDateString()}</span></div>
            </div>
            {deleteCommissioned.length > 0 && (
              <div className="um-delete-commissioner-warning">
                This user is commissioner of {deleteCommissioned.length} community(ies): {deleteCommissioned.map(c => c.name).join(', ')}. These communities and all their data will also be deleted.
              </div>
            )}
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Type <strong>{deleteTarget.username}</strong> to confirm:
            </label>
            <input
              className="um-delete-confirm-input"
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTarget.username}
              disabled={deleteLoading}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'flex-end' }}>
              <button
                className="um-action-btn um-view"
                style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="um-delete-confirm-btn"
                disabled={deleteConfirmText !== deleteTarget.username || deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai-requests' && (
        <>
          <div className="admin-section">
            <h2>Pending Requests</h2>
            {aiRequests.length === 0 ? (
              <div className="admin-empty">No pending AI generation requests</div>
            ) : (
              <div className="pending-questions">
                {aiRequests.map(req => (
                  <div key={req.id} className="ai-request-card">
                    <div className="ai-req-header">
                      <span className="ai-req-community">{req.communities?.name || 'Unknown'}</span>
                      <span className="ai-req-date">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="ai-req-theme">{req.theme}</div>
                    <div className="ai-req-meta">
                      <span className="ai-req-tag">{req.question_count} questions</span>
                      <span className="ai-req-tag">{req.difficulty}</span>
                      <span className="ai-req-by">by {req.profiles?.username || 'Unknown'}</span>
                    </div>
                    {req.special_instructions && (
                      <p className="ai-req-instructions">"{req.special_instructions}"</p>
                    )}
                    <div className="review-actions">
                      <button className="approve-btn" onClick={() => handleApproveAiRequest(req.id)}>Approve</button>
                      {rejectingId === req.id ? (
                        <div className="ai-reject-form">
                          <textarea
                            placeholder="Rejection reason (optional)"
                            value={rejectNotes[req.id] || ''}
                            onChange={e => setRejectNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                            rows={2}
                          />
                          <div className="ai-reject-btns">
                            <button className="reject-btn" onClick={() => handleRejectAiRequest(req.id)}>Confirm Reject</button>
                            <button className="ai-cancel-btn" onClick={() => setRejectingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="reject-btn" onClick={() => setRejectingId(req.id)}>Reject</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-section">
            <h2>Request History</h2>
            {aiHistory.length === 0 ? (
              <div className="admin-empty">No processed requests yet</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Community</th>
                      <th>Theme</th>
                      <th>Status</th>
                      <th>Reviewer</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiHistory.map(req => (
                      <tr key={req.id}>
                        <td>{req.communities?.name || '—'}</td>
                        <td style={{ fontWeight: 600, color: '#041E42' }}>{req.theme}</td>
                        <td>
                          <span className={`ai-status-badge ai-status-${req.status}`}>{req.status}</span>
                        </td>
                        <td>{req.reviewer?.username || '—'}</td>
                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'community-requests' && (
        <>
          <div className="admin-section">
            <h2>Pending Community Requests</h2>
            {communityRequests.length === 0 ? (
              <div className="admin-empty">No pending community requests</div>
            ) : (
              <div className="pending-questions">
                {communityRequests.map(req => (
                  <div key={req.id} className="cr-request-card">
                    <div className="cr-header">
                      <span className="cr-name">{req.name}</span>
                      <span className="cr-date">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="cr-by">Requested by {req.profiles?.username || 'Unknown'}</div>
                    {req.description && <p className="cr-description">{req.description}</p>}
                    <p className="cr-reason">"{req.reason}"</p>
                    <div className="review-actions">
                      <button
                        className="approve-btn"
                        onClick={() => handleApproveCommunityRequest(req.id)}
                        disabled={crProcessingId === req.id}
                      >
                        {crProcessingId === req.id ? 'Processing...' : 'Approve'}
                      </button>
                      {crRejectingId === req.id ? (
                        <div className="ai-reject-form">
                          <textarea
                            placeholder="Rejection reason (optional)"
                            value={crRejectNotes[req.id] || ''}
                            onChange={e => setCrRejectNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                            rows={2}
                          />
                          <div className="ai-reject-btns">
                            <button
                              className="reject-btn"
                              onClick={() => handleRejectCommunityRequest(req.id)}
                              disabled={crProcessingId === req.id}
                            >
                              Confirm Reject
                            </button>
                            <button className="ai-cancel-btn" onClick={() => setCrRejectingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="reject-btn" onClick={() => setCrRejectingId(req.id)}>Reject</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-section">
            <h2>Request History</h2>
            {communityRequestHistory.length === 0 ? (
              <div className="admin-empty">No processed requests yet</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Community</th>
                      <th>Requester</th>
                      <th>Status</th>
                      <th>Reviewer</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communityRequestHistory.map(req => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{req.name}</td>
                        <td>{req.profiles?.username || '—'}</td>
                        <td>
                          <span className={`request-status-badge status-${req.status}`}>{req.status}</span>
                        </td>
                        <td>{req.reviewer?.username || '—'}</td>
                        <td>{req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'flagged' && (
        <>
          <div className="admin-section">
            <h2>Flagged Users</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Users automatically flagged for suspicious activity. Flagged users can still play but are excluded from public leaderboards.
            </p>
            {flaggedUsers.length === 0 ? (
              <div className="admin-empty">No flagged users</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Reasons</th>
                      <th>Games</th>
                      <th>Flagged</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedUsers.map(u => (
                      <tr key={u.id}>
                        <td className="um-username">{u.username}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(u.bot_flags?.reasons || []).map((reason, i) => (
                              <span key={i} className="flag-reason-badge">{reason.replace(/_/g, ' ')}</span>
                            ))}
                          </div>
                        </td>
                        <td>{u.gameCount}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {u.bot_flags?.flagged_at ? new Date(u.bot_flags.flagged_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <button
                            className="um-action-btn um-view"
                            onClick={() => handleUnflagUser(u.id, u.username)}
                            disabled={unflaggingId === u.id}
                          >
                            {unflaggingId === u.id ? 'Unflagging...' : 'Unflag'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
