import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Papa from 'papaparse';
import './CommissionerDashboard.css';
import { HomeIcon, MegaphoneIcon, HelpIcon, UsersIcon, SettingsIcon, ChartIcon, GamepadIcon, StarIcon, PlusIcon, UploadIcon, SparklesIcon, DownloadIcon, TagIcon, ImageIcon, VideoIcon, FileIcon, LightbulbIcon, ChevronDownIcon } from './Icons';
import CommissionerGenerator from './questionGenerator/CommissionerGenerator';
import { hasCommunityRole, canManageQuestions, canManageMembers, canManageSettings, canViewAnalytics, canDeleteCommunity, canTransferOwnership } from '../utils/permissions';
import { sendInvitationEmail } from '../utils/emailService';

function CommissionerDashboard({ communityId, currentUserId, onBack }) {
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({ totalGames: 0, activeMembers: 0, questionBankSize: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    season_start: '',
    season_end: '',
    max_members: 50,
    visibility: 'private',
    description: '',
    timer_enabled: false,
    timer_seconds: 30
  });
  const [csvData, setCsvData] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [importHistory, setImportHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showBulkTagging, setShowBulkTagging] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [username, setUsername] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'import' | 'ai' | null
  const [showGenerator, setShowGenerator] = useState(false);
  const [userCommunityRole, setUserCommunityRole] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferConfirmText, setTransferConfirmText] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [annForm, setAnnForm] = useState({ title: '', body: '', pinned: false });
  const [annEditing, setAnnEditing] = useState(null);
  const [annEditForm, setAnnEditForm] = useState({ title: '', body: '', pinned: false });
  const [toast, setToast] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [renamingCategory, setRenamingCategory] = useState(null);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // AI Generation state
  const [genRequests, setGenRequests] = useState([]);
  const [genForm, setGenForm] = useState({ theme: '', difficulty: 'mixed', question_count: 10, special_instructions: '' });
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [genReviewId, setGenReviewId] = useState(null);
  const [genAccepted, setGenAccepted] = useState({});
  const [genSelected, setGenSelected] = useState({});

  // Media editing state
  const [editingMediaId, setEditingMediaId] = useState(null);
  const [mediaUploading, setMediaUploading] = useState(false);

  // Media Library state
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [mediaUploadingLib, setMediaUploadingLib] = useState(false);
  const [mediaPreviewItem, setMediaPreviewItem] = useState(null);
  const [mediaBrowseTarget, setMediaBrowseTarget] = useState(null); // 'image' | 'video' | null — for picker modal
  const [mediaBrowseCallback, setMediaBrowseCallback] = useState(null); // fn(url) to call on pick

  // Theme / Appearance state
  const [themeColor, setThemeColor] = useState('#041E42');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // Season management state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [seasonArchives, setSeasonArchives] = useState([]);
  const [expandedArchive, setExpandedArchive] = useState(null);
  const [seasonStats, setSeasonStats] = useState({ gamesThisSeason: 0, activePlayers: 0, topPlayer: null });

  // Add Question form state
  const [addQForm, setAddQForm] = useState({ question_text: '', correct_answer: '', incorrect_1: '', incorrect_2: '', incorrect_3: '', category: '', difficulty: 'medium', tags: '', image_url: '', video_url: '', explanation: '' });
  const [addQErrors, setAddQErrors] = useState([]);
  const [addQSubmitting, setAddQSubmitting] = useState(false);
  const [addQImageFile, setAddQImageFile] = useState(null);
  const [addQImagePreview, setAddQImagePreview] = useState(null);

  useEffect(() => {
    fetchCommissionerData();
    fetchTemplates();
    fetchAnalytics();
    fetchAnnouncements();
    fetchGenRequests();
    fetchSeasonData();
    fetchMediaLibrary();
    fetchCategoryCounts();
  }, [communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterDifficulty, filterSource, selectedTags, pageSize]);

  // Poll for in-progress AI generation requests
  useEffect(() => {
    const hasInProgress = genRequests.some(r => r.status === 'approved' || r.status === 'generating');
    if (!hasInProgress) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('generation_requests')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      if (!data) return;

      // Check if any request just completed
      const prevInProgress = genRequests.filter(r => r.status === 'approved' || r.status === 'generating');
      const nowCompleted = prevInProgress.filter(prev => {
        const updated = data.find(d => d.id === prev.id);
        return updated && updated.status === 'completed';
      });
      if (nowCompleted.length > 0) {
        showToast('Questions ready for review!');
      }
      const nowFailed = prevInProgress.filter(prev => {
        const updated = data.find(d => d.id === prev.id);
        return updated && updated.status === 'failed';
      });
      if (nowFailed.length > 0) {
        showToast('Generation failed. You can retry.', 'error');
      }

      setGenRequests(data);
    }, 5000);

    return () => clearInterval(interval);
  }, [genRequests, communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when modal is open; close on Escape
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => { if (e.key === 'Escape') setActiveModal(null); };
      document.addEventListener('keydown', handleEsc);
      return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', handleEsc); };
    } else {
      document.body.style.overflow = '';
    }
  }, [activeModal]);

  const fetchCommissionerData = async () => {
    try {
      const { data: communityData } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();

      // Fetch current user's community membership for role check
      const { data: myMembership } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', currentUserId)
        .single();

      const myRole = myMembership?.role || null;
      setUserCommunityRole(myRole);

      // Also check legacy commissioner_id for backward compatibility
      const isLegacyCommissioner = communityData.commissioner_id === currentUserId;

      if (!hasCommunityRole(myRole, 'moderator') && !isLegacyCommissioner) {
        showToast('You are not authorized to access this page', 'error');
        onBack();
        return;
      }

      setCommunity(communityData);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, platform_role, super_admin')
        .eq('id', currentUserId)
        .single();
      setUsername(profileData?.username || '');

      setEditForm({
        name: communityData.name,
        season_start: communityData.season_start?.split('T')[0] || '',
        season_end: communityData.season_end?.split('T')[0] || '',
        max_members: communityData.settings?.max_members || 50,
        visibility: communityData.visibility || 'private',
        description: communityData.description || '',
        timer_enabled: communityData.settings?.timer_enabled || false,
        timer_seconds: communityData.settings?.timer_seconds || 30
      });

      // Initialize theme state
      setThemeColor(communityData.settings?.theme_color || '#041E42');
      setWelcomeMessage(communityData.settings?.welcome_message || '');

      const { data: membersData } = await supabase
        .from('community_members')
        .select('*, profiles(username)')
        .eq('community_id', communityId)
        .order('joined_at', { ascending: false });
      setMembers(membersData || []);

      const { data: questionsData } = await supabase
        .from('community_questions')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      setQuestions(questionsData || []);

      const { data: gamesData } = await supabase
        .from('games')
        .select('user_id')
        .eq('community_id', communityId);

      const uniqueActivePlayers = new Set(gamesData?.map(g => g.user_id) || []);

      setStats({
        totalGames: gamesData?.length || 0,
        activeMembers: uniqueActivePlayers.size,
        questionBankSize: questionsData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching commissioner data:', error);
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    if (editForm.season_start && editForm.season_end && editForm.season_end <= editForm.season_start) {
      showToast('Season end date must be after start date', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          name: editForm.name,
          season_start: editForm.season_start,
          season_end: editForm.season_end,
          settings: {
            ...community.settings,
            max_members: editForm.max_members,
            timer_enabled: editForm.timer_enabled,
            timer_seconds: editForm.timer_seconds
          },
          visibility: editForm.visibility,
          description: editForm.description || null
        })
        .eq('id', communityId);

      if (error) {
        showToast('Failed to update settings: ' + error.message, 'error');
      } else {
        showToast('Settings updated successfully!');
        setEditMode(false);
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const fetchCategoryCounts = async () => {
    try {
      const { data } = await supabase
        .from('community_questions')
        .select('category')
        .eq('community_id', communityId);
      const counts = {};
      (data || []).forEach(q => {
        const cat = q.category || 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
      });
      setCategoryCounts(Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])));
    } catch (err) {
      console.error('Error fetching category counts:', err);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const existing = community.settings?.categories || [];
    if (existing.some(c => c.toLowerCase() === name.toLowerCase())) {
      showToast('Category already exists', 'error');
      return;
    }
    const updated = [...existing, name].sort();
    const { error } = await supabase.from('communities').update({
      settings: { ...community.settings, categories: updated }
    }).eq('id', communityId);
    if (error) { showToast('Failed to add category', 'error'); return; }
    setNewCategory('');
    showToast(`Category "${name}" added`);
    fetchCommissionerData();
  };

  const handleRenameCategory = async (oldName) => {
    const newName = renameCategoryValue.trim();
    if (!newName || newName === oldName) { setRenamingCategory(null); return; }
    // Update all questions with the old category
    const { error: qError } = await supabase.from('community_questions')
      .update({ category: newName })
      .eq('community_id', communityId)
      .eq('category', oldName);
    if (qError) { showToast('Failed to rename questions: ' + qError.message, 'error'); return; }
    // Update the defined categories list
    const existing = community.settings?.categories || [];
    const updated = existing.map(c => c === oldName ? newName : c).sort();
    await supabase.from('communities').update({
      settings: { ...community.settings, categories: updated }
    }).eq('id', communityId);
    setRenamingCategory(null);
    showToast(`Renamed "${oldName}" → "${newName}"`);
    fetchCommissionerData();
    fetchCategoryCounts();
  };

  const handleDeleteCategory = async (name) => {
    const count = categoryCounts.find(([c]) => c === name)?.[1] || 0;
    if (count > 0) {
      showToast(`Cannot delete "${name}" — ${count} question${count > 1 ? 's' : ''} use it. Rename instead.`, 'error');
      return;
    }
    const existing = community.settings?.categories || [];
    const updated = existing.filter(c => c !== name);
    const { error } = await supabase.from('communities').update({
      settings: { ...community.settings, categories: updated }
    }).eq('id', communityId);
    if (error) { showToast('Failed to delete category', 'error'); return; }
    showToast(`Category "${name}" removed`);
    fetchCommissionerData();
  };

  const handleSaveTheme = async () => {
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          settings: {
            ...community.settings,
            theme_color: themeColor,
            welcome_message: welcomeMessage || null
          }
        })
        .eq('id', communityId);

      if (error) {
        showToast('Failed to save appearance: ' + error.message, 'error');
      } else {
        showToast('Appearance saved!');
        fetchCommissionerData();
      }
    } catch (err) {
      showToast('Failed to save appearance', 'error');
    }
  };

  const handleThemeImageUpload = async (file, type) => {
    if (!file) return;
    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`File too large. Max ${type === 'logo' ? '2MB' : '5MB'}.`, 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are allowed', 'error');
      return;
    }

    const setter = type === 'logo' ? setLogoUploading : setBannerUploading;
    setter(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `${communityId}/${type}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('community-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('community-images')
        .getPublicUrl(path);

      const urlKey = type === 'logo' ? 'logo_url' : 'banner_url';
      const { error: updateError } = await supabase
        .from('communities')
        .update({
          settings: {
            ...community.settings,
            [urlKey]: urlData.publicUrl
          }
        })
        .eq('id', communityId);

      if (updateError) throw updateError;

      showToast(`${type === 'logo' ? 'Logo' : 'Banner'} uploaded!`);
      fetchCommissionerData();
    } catch (err) {
      showToast(`Failed to upload ${type}: ${err.message}`, 'error');
    }
    setter(false);
  };

  const handleRemoveThemeImage = async (type) => {
    try {
      const urlKey = type === 'logo' ? 'logo_url' : 'banner_url';
      const newSettings = { ...community.settings };
      delete newSettings[urlKey];

      const { error } = await supabase
        .from('communities')
        .update({ settings: newSettings })
        .eq('id', communityId);

      if (error) throw error;
      showToast(`${type === 'logo' ? 'Logo' : 'Banner'} removed`);
      fetchCommissionerData();
    } catch (err) {
      showToast(`Failed to remove ${type}`, 'error');
    }
  };

  const fetchSeasonData = async () => {
    try {
      // Fetch season archives
      const { data: archives } = await supabase
        .from('season_archives')
        .select('*')
        .eq('community_id', communityId)
        .order('season_number', { ascending: false });
      setSeasonArchives(archives || []);

      // Fetch current season stats
      const { data: communityData } = await supabase
        .from('communities')
        .select('season_start')
        .eq('id', communityId)
        .single();

      if (communityData?.season_start) {
        const { data: seasonGames } = await supabase
          .from('games')
          .select('user_id, score, total_questions')
          .eq('community_id', communityId)
          .gte('created_at', communityData.season_start);

        const games = seasonGames || [];
        const playerSet = new Set(games.map(g => g.user_id));

        // Compute top player
        const playerStats = {};
        games.forEach(g => {
          if (!playerStats[g.user_id]) playerStats[g.user_id] = { totalScore: 0, totalQ: 0, games: 0 };
          playerStats[g.user_id].totalScore += g.score;
          playerStats[g.user_id].totalQ += g.total_questions;
          playerStats[g.user_id].games += 1;
        });
        let topId = null;
        let topAvg = 0;
        Object.entries(playerStats).forEach(([uid, s]) => {
          const avg = s.totalQ > 0 ? (s.totalScore / s.totalQ) * 100 : 0;
          if (avg > topAvg || (avg === topAvg && s.games > (playerStats[topId]?.games || 0))) {
            topAvg = avg;
            topId = uid;
          }
        });

        let topPlayer = null;
        if (topId) {
          const { data: profile } = await supabase.from('profiles').select('username').eq('id', topId).single();
          topPlayer = { id: topId, username: profile?.username || 'Unknown', avg: Math.round(topAvg), games: playerStats[topId].games };
        }

        setSeasonStats({ gamesThisSeason: games.length, activePlayers: playerSet.size, topPlayer });
      }
    } catch (err) {
      console.error('Error fetching season data:', err);
    }
  };

  const handleSeasonReset = async () => {
    if (!resetConfirmed) return;
    setResetting(true);
    try {
      const oldSeasonNumber = community.current_season || 1;

      // 1. Build leaderboard snapshot from current season games
      const { data: seasonGames } = await supabase
        .from('games')
        .select('user_id, score, total_questions, profiles(username)')
        .eq('community_id', communityId)
        .gte('created_at', community.season_start);

      const games = seasonGames || [];
      const playerMap = {};
      games.forEach(g => {
        const uid = g.user_id;
        if (!playerMap[uid]) playerMap[uid] = { user_id: uid, username: g.profiles?.username || 'Unknown', totalScore: 0, totalQ: 0, games: 0 };
        playerMap[uid].totalScore += g.score;
        playerMap[uid].totalQ += g.total_questions;
        playerMap[uid].games += 1;
      });

      const leaderboard = Object.values(playerMap)
        .map(p => ({
          user_id: p.user_id,
          username: p.username,
          avg_score: p.totalQ > 0 ? Math.round((p.totalScore / p.totalQ) * 100) : 0,
          total_games: p.games,
        }))
        .sort((a, b) => b.avg_score - a.avg_score || b.total_games - a.total_games)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      const totalQuestions = games.reduce((sum, g) => sum + g.total_questions, 0);
      const topPlayer = leaderboard[0] || null;

      // 2. Atomic archive + season update via RPC
      const { error: rpcError } = await supabase.rpc('reset_season', {
        p_community_id: communityId,
        p_archived_by: currentUserId,
        p_leaderboard_snapshot: leaderboard,
        p_total_games: games.length,
        p_total_questions_played: totalQuestions,
        p_top_player_id: topPlayer?.user_id || null,
        p_top_player_username: topPlayer?.username || null,
        p_top_player_avg: topPlayer?.avg_score || null
      });
      if (rpcError) throw rpcError;

      showToast(`Season ${oldSeasonNumber} archived! Season ${oldSeasonNumber + 1} has begun.`);
      setShowResetModal(false);
      setResetConfirmed(false);
      fetchCommissionerData();
      fetchSeasonData();
    } catch (err) {
      console.error('Error resetting season:', err);
      showToast('Failed to reset season: ' + err.message, 'error');
    }
    setResetting(false);
  };

  const handleRegenerateInviteCode = async () => {
    if (!window.confirm('Generate a new invite code? The current code will stop working immediately.')) return;
    setRegenerating(true);
    try {
      const { data: newCode, error: rpcError } = await supabase.rpc('generate_invite_code');
      if (rpcError) throw rpcError;
      const { error: updateError } = await supabase
        .from('communities')
        .update({ invite_code: newCode })
        .eq('id', communityId);
      if (updateError) throw updateError;
      await fetchCommissionerData();
    } catch (err) {
      showToast('Failed to regenerate invite code: ' + err.message, 'error');
    }
    setRegenerating(false);
  };

  const handleRemoveMember = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to remove ${username} from this community?`)) return;
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);

      if (error) {
        showToast('Failed to remove member: ' + error.message, 'error');
      } else {
        showToast(`${username} has been removed from the community`);
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      showToast('Failed to remove member', 'error');
    }
  };

  const handleRoleChange = async (userId, username, newRole) => {
    const roleLabels = { member: 'Member', moderator: 'Moderator', commissioner: 'Commissioner', owner: 'Owner' };
    if (!window.confirm(`Change ${username}'s role to ${roleLabels[newRole]}?`)) return;
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ role: newRole })
        .eq('community_id', communityId)
        .eq('user_id', userId);
      if (error) {
        showToast('Failed to change role: ' + error.message, 'error');
      } else {
        showToast(`${username} is now ${roleLabels[newRole]}`);
        fetchCommissionerData();
      }
    } catch (err) {
      console.error('Error changing role:', err);
      showToast('Failed to change role', 'error');
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTarget || transferConfirmText !== community?.name) return;
    setTransferLoading(true);
    try {
      const { error } = await supabase.rpc('transfer_community_ownership', {
        p_community_id: communityId,
        p_new_owner_id: transferTarget,
        p_current_owner_id: currentUserId,
      });
      if (error) throw error;

      showToast('Ownership transferred successfully');
      setShowTransferModal(false);
      setTransferTarget('');
      setTransferConfirmText('');
      fetchCommissionerData();
    } catch (err) {
      console.error('Error transferring ownership:', err);
      showToast('Failed to transfer ownership: ' + (err.message || err), 'error');
    }
    setTransferLoading(false);
  };

  const handleDeleteCommunity = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${community?.name}"? This cannot be undone.`)) return;
    if (!window.confirm('This will delete ALL community data including questions, games, members, and announcements. Type OK in the next prompt to confirm.')) return;
    const final = window.prompt('Type the community name to confirm deletion:');
    if (final !== community?.name) { showToast('Community name did not match', 'error'); return; }
    try {
      // Delete dependent data first
      await supabase.from('community_messages').delete().eq('community_id', communityId);
      await supabase.from('community_announcements').delete().eq('community_id', communityId);
      await supabase.from('question_templates').delete().eq('community_id', communityId);
      await supabase.from('generation_requests').delete().eq('community_id', communityId);
      await supabase.from('season_archives').delete().eq('community_id', communityId);
      await supabase.from('community_questions').delete().eq('community_id', communityId);
      await supabase.from('community_members').delete().eq('community_id', communityId);
      const { error } = await supabase.from('communities').delete().eq('id', communityId);
      if (error) throw error;
      showToast('Community deleted');
      onBack();
    } catch (err) {
      console.error('Error deleting community:', err);
      showToast('Failed to delete community: ' + (err.message || err), 'error');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const { error } = await supabase
        .from('community_questions')
        .delete()
        .eq('id', questionId)
        .eq('community_id', communityId);

      if (error) {
        showToast('Failed to delete question: ' + error.message, 'error');
      } else {
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showToast('Please upload a CSV file', 'error');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      showToast('CSV file must be under 1 MB', 'error');
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => { validateAndPreviewCSV(results.data); },
      error: (error) => { showToast('Error parsing CSV: ' + error.message, 'error'); }
    });
  };

  const validateAndPreviewCSV = (data) => {
    const MAX_ROWS = 500;
    const errors = [];
    const validQuestions = [];
    const requiredColumns = ['question_text', 'correct_answer', 'incorrect_answer_1', 'incorrect_answer_2', 'incorrect_answer_3', 'category', 'difficulty'];

    if (data.length > MAX_ROWS) {
      setCsvErrors([`CSV exceeds the ${MAX_ROWS}-row limit. This file has ${data.length} rows. Split it into smaller files and upload in batches.`]);
      setCsvData([]);
      setCsvPreview([]);
      return;
    }

    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      if (missingColumns.length > 0) {
        errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
        setCsvErrors(errors);
        setCsvData([]);
        setCsvPreview([]);
        return;
      }
    }

    data.forEach((row, index) => {
      const rowErrors = [];
      if (!row.question_text?.trim()) rowErrors.push(`Row ${index + 1}: Missing question text`);
      if (!row.correct_answer?.trim()) rowErrors.push(`Row ${index + 1}: Missing correct answer`);
      if (!row.incorrect_answer_1?.trim() || !row.incorrect_answer_2?.trim() || !row.incorrect_answer_3?.trim()) rowErrors.push(`Row ${index + 1}: Missing incorrect answers (need 3)`);
      if (!row.category?.trim()) rowErrors.push(`Row ${index + 1}: Missing category`);
      const validDifficulties = ['easy', 'medium', 'hard'];
      if (!row.difficulty || !validDifficulties.includes(row.difficulty.toLowerCase())) rowErrors.push(`Row ${index + 1}: Invalid difficulty (must be easy, medium, or hard)`);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        const q = {
          question_text: row.question_text.trim(),
          correct_answer: row.correct_answer.trim(),
          incorrect_answers: [row.incorrect_answer_1.trim(), row.incorrect_answer_2.trim(), row.incorrect_answer_3.trim()],
          category: row.category.trim(),
          difficulty: row.difficulty.toLowerCase().trim()
        };
        if (row.image_url?.trim()) q.image_url = row.image_url.trim();
        if (row.video_url?.trim()) q.video_url = row.video_url.trim();
        if (row.explanation?.trim()) q.explanation = row.explanation.trim();
        validQuestions.push(q);
      }
    });

    setCsvErrors(errors);
    setCsvData(validQuestions);
    setCsvPreview(validQuestions.slice(0, 5));
  };

  const handleBulkImport = async () => {
    if (csvData.length === 0) { showToast('No valid questions to import', 'error'); return; }
    if (!window.confirm(`Are you sure you want to import ${csvData.length} questions?`)) return;

    setUploading(true);
    try {
      const importTimestamp = new Date().toISOString();
      const questionsToInsert = csvData.map(q => {
        const row = {
          community_id: communityId,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          category: q.category,
          difficulty: q.difficulty,
          created_at: importTimestamp,
          imported_by: currentUserId,
          imported_at: importTimestamp
        };
        if (q.image_url) row.image_url = q.image_url;
        if (q.video_url) row.video_url = q.video_url;
        if (q.explanation) row.explanation = q.explanation;
        return row;
      });

      const { error } = await supabase.from('community_questions').insert(questionsToInsert);

      if (error) {
        showToast('Failed to import questions: ' + error.message, 'error');
      } else {
        showToast(`Successfully imported ${csvData.length} questions!`);
        const historyEntry = { timestamp: importTimestamp, count: csvData.length, user: currentUserId };
        setImportHistory(prev => [historyEntry, ...prev].slice(0, 10));
        setCsvData([]);
        setCsvPreview([]);
        setCsvErrors([]);
        setActiveModal(null);
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error importing questions:', error);
      showToast('Failed to import questions', 'error');
    }
    setUploading(false);
  };

  const downloadTemplate = () => {
    const template = `question_text,correct_answer,incorrect_answer_1,incorrect_answer_2,incorrect_answer_3,category,difficulty,image_url,video_url,explanation
"What is the capital of France?","Paris","London","Berlin","Madrid","Geography","easy","","","Paris has been the capital of France since the 10th century."
"Who painted the Mona Lisa?","Leonardo da Vinci","Michelangelo","Raphael","Donatello","Art","medium","https://example.com/mona-lisa.jpg","","Leonardo da Vinci painted the Mona Lisa between 1503 and 1519."
"What is the chemical symbol for gold?","Au","Ag","Fe","Cu","Science","easy","","https://www.youtube.com/watch?v=dQw4w9WgXcQ","Au comes from the Latin word 'aurum' meaning gold."`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sanitizeCSVField = (value) => {
    const str = String(value ?? '');
    const escaped = str.replace(/"/g, '""');
    // Prevent formula injection: prepend single-quote for dangerous leading chars
    const dangerous = /^[=+\-@\t\r]/;
    const safe = dangerous.test(escaped) ? "'" + escaped : escaped;
    return `"${safe}"`;
  };

  const exportToCSV = () => {
    if (questions.length === 0) { showToast('No questions to export', 'error'); return; }
    const csvRows = ['question_text,correct_answer,incorrect_answer_1,incorrect_answer_2,incorrect_answer_3,category,difficulty,explanation'];
    questions.forEach(q => {
      const row = [
        sanitizeCSVField(q.question_text),
        sanitizeCSVField(q.correct_answer),
        sanitizeCSVField(q.incorrect_answers[0] || ''),
        sanitizeCSVField(q.incorrect_answers[1] || ''),
        sanitizeCSVField(q.incorrect_answers[2] || ''),
        sanitizeCSVField(q.category),
        sanitizeCSVField(q.difficulty),
        sanitizeCSVField(q.explanation || '')
      ];
      csvRows.push(row.join(','));
    });
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = community.name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'community';
    a.download = `${safeName}_questions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectAllPages(false);
    setSelectedQuestions(prev =>
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = pagedQuestions.map(q => q.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedQuestions.includes(id));
    if (allPageSelected) {
      setSelectedQuestions(prev => prev.filter(id => !pageIds.includes(id)));
      setSelectAllPages(false);
    } else {
      setSelectedQuestions(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleSelectAllPages = () => {
    setSelectAllPages(true);
    setSelectedQuestions(filteredQuestions.map(q => q.id));
  };

  const handleDeselectAll = () => {
    setSelectedQuestions([]);
    setSelectAllPages(false);
    setShowBulkTagging(false);
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) { showToast('No questions selected', 'error'); return; }
    if (!window.confirm(`Are you sure you want to delete ${selectedQuestions.length} questions?`)) return;
    try {
      const { error } = await supabase.from('community_questions').delete().in('id', selectedQuestions).eq('community_id', communityId);
      if (error) {
        showToast('Failed to delete questions: ' + error.message, 'error');
      } else {
        setSelectedQuestions([]);
        setSelectAllPages(false);
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error deleting questions:', error);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const categoryMatch = filterCategory === 'all' || q.category === filterCategory;
    const difficultyMatch = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    const searchMatch = !searchQuery ||
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.correct_answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.incorrect_answers.some(ans => ans.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase());
    const tagMatch = selectedTags.length === 0 || (q.tags && selectedTags.every(tag => q.tags.includes(tag)));
    const sourceMatch = filterSource === 'all'
      || (filterSource === 'manual' && !q.source && !q.imported_at)
      || (filterSource === 'csv' && q.imported_at && q.source !== 'ai_generated')
      || (filterSource === 'ai' && (q.source === 'ai_generated' || (q.tags && q.tags.includes('ai-generated'))));
    return categoryMatch && difficultyMatch && searchMatch && tagMatch && sourceMatch;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedQuestions = filteredQuestions.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const pageStart = filteredQuestions.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredQuestions.length);

  const getSourceLabel = (q) => {
    if (q.source === 'ai_generated' || (q.tags && q.tags.includes('ai-generated'))) return 'AI';
    if (q.imported_at && q.source !== 'ai_generated') return 'CSV';
    return 'Manual';
  };

  const categories = [...new Set(questions.map(q => q.category))];
  const allTags = [...new Set(questions.flatMap(q => q.tags || []))];

  const handleAddTag = async (questionId, tag) => {
    if (!tag.trim()) return;
    const question = questions.find(q => q.id === questionId);
    const currentTags = question.tags || [];
    if (currentTags.includes(tag.trim())) { showToast('Tag already exists on this question', 'error'); return; }
    const updatedTags = [...currentTags, tag.trim()];
    await createVersionHistory(questionId, 'tag_added', { tag: tag.trim() });
    const { error } = await supabase.from('community_questions').update({ tags: updatedTags }).eq('id', questionId).eq('community_id', communityId);
    if (error) { showToast('Failed to add tag: ' + error.message, 'error'); } else { setNewTag(''); fetchCommissionerData(); }
  };

  const handleRemoveTag = async (questionId, tag) => {
    const question = questions.find(q => q.id === questionId);
    const updatedTags = (question.tags || []).filter(t => t !== tag);
    await createVersionHistory(questionId, 'tag_removed', { tag });
    const { error } = await supabase.from('community_questions').update({ tags: updatedTags }).eq('id', questionId).eq('community_id', communityId);
    if (error) { showToast('Failed to remove tag: ' + error.message, 'error'); } else { fetchCommissionerData(); }
  };

  const toggleTagFilter = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const createVersionHistory = async (questionId, changeType, changes) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    const historyEntry = {
      question_id: questionId,
      version_number: (question.version_number || 0) + 1,
      change_type: changeType,
      changes: changes,
      question_snapshot: question,
      changed_by: currentUserId,
      changed_at: new Date().toISOString()
    };
    const currentHistory = question.version_history || [];
    const updatedHistory = [historyEntry, ...currentHistory].slice(0, 10);
    await supabase.from('community_questions').update({ version_history: updatedHistory, version_number: historyEntry.version_number }).eq('id', questionId).eq('community_id', communityId);
  };

  const loadVersionHistory = async (questionId) => {
    const question = questions.find(q => q.id === questionId);
    setVersionHistory(question?.version_history || []);
    setShowVersionHistory(questionId);
  };

  const restoreVersion = async (questionId, versionSnapshot) => {
    if (!window.confirm('Are you sure you want to restore this version?')) return;
    await createVersionHistory(questionId, 'version_restored', { restored_from: versionSnapshot.version_number });
    const { error } = await supabase.from('community_questions').update({
      question_text: versionSnapshot.question_text,
      correct_answer: versionSnapshot.correct_answer,
      incorrect_answers: versionSnapshot.incorrect_answers,
      category: versionSnapshot.category,
      difficulty: versionSnapshot.difficulty,
      tags: versionSnapshot.tags || []
    }).eq('id', questionId).eq('community_id', communityId);
    if (error) { showToast('Failed to restore version: ' + error.message, 'error'); } else { setShowVersionHistory(null); fetchCommissionerData(); }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase.from('question_templates').select('*').eq('community_id', communityId).order('created_at', { ascending: false });
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const saveAsTemplate = async (questionId) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;
    try {
      const { error } = await supabase.from('question_templates').insert([{
        community_id: communityId,
        name: templateName,
        question_text: question.question_text,
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        category: question.category,
        difficulty: question.difficulty,
        tags: question.tags || [],
        created_by: currentUserId
      }]);
      if (error) { showToast('Failed to save template: ' + error.message, 'error'); } else { showToast('Template saved!'); fetchTemplates(); }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const createFromTemplate = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    if (!window.confirm(`Create a new question from template "${template.name}"?`)) return;
    try {
      const { error } = await supabase.from('community_questions').insert([{
        community_id: communityId,
        question_text: template.question_text,
        correct_answer: template.correct_answer,
        incorrect_answers: template.incorrect_answers,
        category: template.category,
        difficulty: template.difficulty,
        tags: template.tags || []
      }]);
      if (error) { showToast('Failed to create question: ' + error.message, 'error'); } else { fetchCommissionerData(); }
    } catch (error) {
      console.error('Error creating from template:', error);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      const { error } = await supabase.from('question_templates').delete().eq('id', templateId);
      if (error) { showToast('Failed to delete template: ' + error.message, 'error'); } else { fetchTemplates(); }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleBulkAddTag = async () => {
    if (selectedQuestions.length === 0) { showToast('No questions selected', 'error'); return; }
    if (!bulkTagInput.trim()) { showToast('Please enter a tag name', 'error'); return; }
    const tag = bulkTagInput.trim();
    try {
      // Filter to questions that don't already have this tag
      const toUpdate = selectedQuestions
        .map(id => questions.find(q => q.id === id))
        .filter(q => q && !(q.tags || []).includes(tag));
      if (toUpdate.length === 0) { showToast('All selected questions already have this tag', 'error'); return; }
      // Update all in parallel
      const results = await Promise.all(toUpdate.map(q =>
        supabase.from('community_questions')
          .update({ tags: [...(q.tags || []), tag] })
          .eq('id', q.id).eq('community_id', communityId)
      ));
      const failures = results.filter(r => r.error);
      if (failures.length > 0) {
        showToast(`Tagged ${results.length - failures.length} questions. ${failures.length} failed.`, 'error');
      } else {
        showToast(`Tag "${tag}" added to ${results.length} questions`);
      }
      setBulkTagInput('');
      setShowBulkTagging(false);
      fetchCommissionerData();
    } catch (error) {
      console.error('Error adding bulk tags:', error);
      showToast('Failed to add tags: ' + error.message, 'error');
    }
  };

  const handleBulkRemoveTag = async (tag) => {
    if (selectedQuestions.length === 0) { showToast('No questions selected', 'error'); return; }
    if (!window.confirm(`Remove tag "${tag}" from ${selectedQuestions.length} selected questions?`)) return;
    try {
      // Filter to questions that actually have this tag
      const toUpdate = selectedQuestions
        .map(id => questions.find(q => q.id === id))
        .filter(q => q && (q.tags || []).includes(tag));
      if (toUpdate.length === 0) { showToast('No selected questions have this tag', 'error'); return; }
      // Update all in parallel
      const results = await Promise.all(toUpdate.map(q =>
        supabase.from('community_questions')
          .update({ tags: (q.tags || []).filter(t => t !== tag) })
          .eq('id', q.id).eq('community_id', communityId)
      ));
      const failures = results.filter(r => r.error);
      if (failures.length > 0) {
        showToast(`Removed tag from ${results.length - failures.length} questions. ${failures.length} failed.`, 'error');
      } else {
        showToast(`Tag "${tag}" removed from ${results.length} questions`);
      }
      fetchCommissionerData();
    } catch (error) {
      console.error('Error removing bulk tags:', error);
      showToast('Failed to remove tags: ' + error.message, 'error');
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch games for this community
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('id')
        .eq('community_id', communityId);

      if (gamesError || !gamesData || gamesData.length === 0) {
        setAnalytics(null);
        return;
      }

      const gameIds = gamesData.map(g => g.id);

      // Fetch game_answers for these games
      const { data: answersData } = await supabase
        .from('game_answers')
        .select('question_id, is_correct')
        .in('game_id', gameIds);

      // Fetch questions directly (don't rely on state - may not be loaded yet)
      const { data: questionsData } = await supabase
        .from('community_questions')
        .select('id, category, difficulty, tags')
        .eq('community_id', communityId);

      const questionUsage = {};
      const questionPerformance = {};

      if (answersData) {
        answersData.forEach(answer => {
          const qId = answer.question_id;
          if (qId) {
            questionUsage[qId] = (questionUsage[qId] || 0) + 1;
            if (!questionPerformance[qId]) questionPerformance[qId] = { correct: 0, total: 0 };
            questionPerformance[qId].total += 1;
            if (answer.is_correct) questionPerformance[qId].correct += 1;
          }
        });
      }

      const categoryDist = {};
      const difficultyDist = { easy: 0, medium: 0, hard: 0 };
      const tagUsage = {};

      (questionsData || []).forEach(q => {
        if (q.category) categoryDist[q.category] = (categoryDist[q.category] || 0) + 1;
        if (q.difficulty) difficultyDist[q.difficulty] = (difficultyDist[q.difficulty] || 0) + 1;
        if (q.tags) q.tags.forEach(tag => { tagUsage[tag] = (tagUsage[tag] || 0) + 1; });
      });

      const sortedByUsage = Object.entries(questionUsage).sort(([, a], [, b]) => b - a).slice(0, 5);

      const questionsWithPerf = Object.entries(questionPerformance)
        .map(([qId, perf]) => ({ questionId: parseInt(qId), correctRate: perf.correct / perf.total, totalAnswers: perf.total }))
        .filter(q => q.totalAnswers >= 3);

      const hardestQuestions = [...questionsWithPerf].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
      const easiestQuestions = [...questionsWithPerf].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);

      setAnalytics({
        totalGamesPlayed: gamesData.length,
        totalAnswers: answersData ? answersData.length : 0,
        questionUsage,
        questionPerformance,
        categoryDistribution: categoryDist,
        difficultyDistribution: difficultyDist,
        tagUsage,
        mostUsedQuestions: sortedByUsage,
        hardestQuestions,
        easiestQuestions
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(null);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from('community_announcements')
        .select('*')
        .eq('community_id', communityId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  // AI Generation requests
  const fetchGenRequests = async () => {
    try {
      const { data } = await supabase
        .from('generation_requests')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      setGenRequests(data || []);
    } catch (error) {
      console.error('Error fetching generation requests:', error);
    }
  };

  const handleRetryGenRequest = async (requestId) => {
    try {
      const { error } = await supabase.from('generation_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);
      if (error) throw error;
      showToast('Retrying generation...');
      fetchGenRequests();
      // Fire-and-forget Edge Function call
      supabase.functions.invoke('generate-questions', {
        body: { request_id: requestId }
      }).then(({ error: fnError }) => {
        if (fnError) {
          console.error('Retry Edge Function error:', fnError);
          showToast('Generation failed: ' + fnError.message, 'error');
        }
        fetchGenRequests();
      });
    } catch (err) {
      showToast('Failed to retry: ' + err.message, 'error');
    }
  };

  const handleSubmitGenRequest = async () => {
    if (!genForm.theme.trim()) return;
    setGenSubmitting(true);
    try {
      const { error } = await supabase.from('generation_requests').insert([{
        community_id: communityId,
        requested_by: currentUserId,
        status: 'pending',
        theme: genForm.theme.trim(),
        difficulty: genForm.difficulty,
        question_count: genForm.question_count,
        special_instructions: genForm.special_instructions.trim() || null
      }]);
      if (error) throw error;
      setGenForm({ theme: '', difficulty: 'mixed', question_count: 10, special_instructions: '' });
      fetchGenRequests();
    } catch (err) {
      showToast('Failed to submit request: ' + err.message, 'error');
    }
    setGenSubmitting(false);
  };

  // eslint-disable-next-line no-unused-vars
  const handleAddGenQuestion = async (requestId, question) => {
    try {
      const req = genRequests.find(r => r.id === requestId);
      const row = {
        community_id: communityId,
        question_text: question.question_text,
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        category: question.category || 'General Knowledge',
        difficulty: question.difficulty || 'medium',
        tags: ['ai-generated'],
        version_number: 1,
        version_history: [],
        source: 'ai_generated',
        ai_request_id: requestId,
        ai_model: 'claude-sonnet-4-20250514',
        ai_theme: req?.theme || '',
        imported_by: currentUserId
      };
      if (question.explanation) row.explanation = question.explanation;
      const { error } = await supabase.from('community_questions').insert([row]);
      if (error) throw error;
      // Track accepted count
      const prevAccepted = genAccepted[requestId] || [];
      const newAccepted = [...prevAccepted, question.question_text];
      setGenAccepted(prev => ({
        ...prev,
        [requestId]: newAccepted
      }));
      // Update questions_accepted on the request (use local count, not stale state)
      await supabase.from('generation_requests').update({ questions_accepted: newAccepted.length }).eq('id', requestId);
      fetchCommissionerData();
    } catch (err) {
      showToast('Failed to add question: ' + err.message, 'error');
    }
  };

  const handleAddSelectedQuestions = async (req) => {
    const selected = genSelected[req.id];
    if (!selected || selected.size === 0) { showToast('No questions selected', 'error'); return; }
    const generatedQs = req.generated_questions || [];
    const acceptedTexts = genAccepted[req.id] || [];
    const toAdd = [...selected]
      .map(i => generatedQs[i])
      .filter(q => q && !acceptedTexts.includes(q.question_text));
    if (toAdd.length === 0) { showToast('All selected questions have already been added', 'error'); return; }
    try {
      const rows = toAdd.map(q => {
        const r = {
          community_id: communityId,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          category: q.category || 'General Knowledge',
          difficulty: q.difficulty || 'medium',
          tags: ['ai-generated'],
          version_number: 1,
          version_history: [],
          source: 'ai_generated',
          ai_request_id: req.id,
          ai_model: 'claude-sonnet-4-20250514',
          ai_theme: req.theme || '',
          imported_by: currentUserId
        };
        if (q.explanation) r.explanation = q.explanation;
        return r;
      });
      const { error } = await supabase.from('community_questions').insert(rows);
      if (error) throw error;
      const addedTexts = toAdd.map(q => q.question_text);
      const prevAccepted = genAccepted[req.id] || [];
      const newAccepted = [...prevAccepted, ...addedTexts];
      setGenAccepted(prev => ({
        ...prev,
        [req.id]: newAccepted
      }));
      await supabase.from('generation_requests').update({ questions_accepted: newAccepted.length }).eq('id', req.id);
      fetchCommissionerData();
    } catch (err) {
      showToast('Failed to add questions: ' + err.message, 'error');
    }
  };

  // --- Add Question handler ---
  const handleAddQuestion = async () => {
    // Resolve category: if "Other" was selected, use the custom input
    const resolvedCategory = addQForm.category === '__other__'
      ? (addQForm._customCategory || '').trim()
      : addQForm.category.trim();
    const errors = [];
    if (!addQForm.question_text.trim()) errors.push('Question text is required');
    if (!addQForm.correct_answer.trim()) errors.push('Correct answer is required');
    if (!addQForm.incorrect_1.trim()) errors.push('Incorrect answer 1 is required');
    if (!addQForm.incorrect_2.trim()) errors.push('Incorrect answer 2 is required');
    if (!addQForm.incorrect_3.trim()) errors.push('Incorrect answer 3 is required');
    if (!resolvedCategory) errors.push('Category is required');
    if (!addQForm.difficulty) errors.push('Difficulty is required');
    if (addQForm.video_url.trim() && !isValidYouTubeUrl(addQForm.video_url.trim())) errors.push('Invalid YouTube URL format');
    if (addQImageFile && addQImageFile.size > 500 * 1024) errors.push('Image must be under 500KB');
    setAddQErrors(errors);
    if (errors.length > 0) return;

    setAddQSubmitting(true);
    try {
      let imageUrl = null;
      if (addQImageFile) {
        const path = `${communityId}/${Date.now()}-${addQImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('question-images').upload(path, addQImageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const tags = addQForm.tags.trim() ? addQForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const row = {
        community_id: communityId,
        question_text: addQForm.question_text.trim(),
        correct_answer: addQForm.correct_answer.trim(),
        incorrect_answers: [addQForm.incorrect_1.trim(), addQForm.incorrect_2.trim(), addQForm.incorrect_3.trim()],
        category: resolvedCategory,
        difficulty: addQForm.difficulty,
        source: 'manual',
        version_number: 1,
        version_history: [],
        tags
      };
      if (imageUrl) row.image_url = imageUrl;
      if (addQForm.video_url.trim()) row.video_url = addQForm.video_url.trim();
      if (addQForm.explanation.trim()) row.explanation = addQForm.explanation.trim();

      const { error } = await supabase.from('community_questions').insert([row]);
      if (error) throw error;
      setAddQForm({ question_text: '', correct_answer: '', incorrect_1: '', incorrect_2: '', incorrect_3: '', category: '', difficulty: 'medium', tags: '', image_url: '', video_url: '', explanation: '' });
      setAddQImageFile(null);
      setAddQImagePreview(null);
      setAddQErrors([]);
      setActiveModal(null);
      showToast('Question added!');
      fetchCommissionerData();
      fetchCategoryCounts();
    } catch (err) {
      showToast('Failed to add question: ' + err.message, 'error');
    }
    setAddQSubmitting(false);
  };

  // --- Media helpers ---
  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const isValidYouTubeUrl = (url) => !!extractYouTubeId(url);

  const handleImageUpload = async (questionId, file) => {
    if (!file) return;
    if (file.size > 500 * 1024) { showToast('Image must be under 500KB. Please resize and try again.', 'error'); return; }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { showToast('Invalid file type. Use PNG, JPEG, WebP, or GIF.', 'error'); return; }
    setMediaUploading(true);
    try {
      const path = `${communityId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('question-images').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { error } = await supabase.from('community_questions').update({ image_url: publicUrl }).eq('id', questionId).eq('community_id', communityId);
      if (error) throw error;
      fetchCommissionerData();
    } catch (err) {
      showToast('Failed to upload image: ' + err.message, 'error');
    }
    setMediaUploading(false);
  };

  const handleRemoveImage = async (questionId) => {
    if (!window.confirm('Remove image from this question?')) return;
    const { error } = await supabase.from('community_questions').update({ image_url: null }).eq('id', questionId).eq('community_id', communityId);
    if (error) { showToast('Failed to remove image: ' + error.message, 'error'); } else { fetchCommissionerData(); }
  };

  const handleSaveVideoUrl = async (questionId, url) => {
    if (url && !isValidYouTubeUrl(url)) { showToast('Invalid YouTube URL. Use youtube.com/watch?v=... or youtu.be/... format.', 'error'); return; }
    const { error } = await supabase.from('community_questions').update({ video_url: url || null }).eq('id', questionId).eq('community_id', communityId);
    if (error) { showToast('Failed to save video URL: ' + error.message, 'error'); } else { fetchCommissionerData(); setEditingMediaId(null); }
  };

  // --- Media Library handlers ---
  const fetchMediaLibrary = async () => {
    setMediaLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMediaLibrary(data || []);
    } catch (err) {
      console.error('Error fetching media library:', err);
    }
    setMediaLibraryLoading(false);
  };

  const getMediaUsageCount = (fileUrl) => {
    return questions.filter(q => q.image_url === fileUrl || q.video_url === fileUrl).length;
  };

  const getMediaUsageQuestions = (fileUrl) => {
    return questions.filter(q => q.image_url === fileUrl || q.video_url === fileUrl);
  };

  const handleMediaLibraryUpload = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('File must be under 2MB.', 'error'); return; }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { showToast('Invalid file type. Use PNG, JPEG, WebP, or GIF.', 'error'); return; }
    setMediaUploadingLib(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `${communityId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('community-media').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(path);
      const { error: dbError } = await supabase.from('media_library').insert([{
        community_id: communityId,
        uploaded_by: currentUserId,
        file_url: urlData.publicUrl,
        file_type: 'image',
        filename: file.name,
        file_size: file.size,
        storage_path: path,
        tags: []
      }]);
      if (dbError) throw dbError;
      showToast('Image uploaded to library!');
      fetchMediaLibrary();
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    }
    setMediaUploadingLib(false);
  };

  const handleMediaLibraryAddVideo = async (url) => {
    if (!url || !isValidYouTubeUrl(url)) { showToast('Invalid YouTube URL.', 'error'); return; }
    try {
      const videoId = extractYouTubeId(url);
      const { error } = await supabase.from('media_library').insert([{
        community_id: communityId,
        uploaded_by: currentUserId,
        file_url: url,
        file_type: 'video',
        filename: `YouTube: ${videoId}`,
        file_size: null,
        storage_path: null,
        tags: []
      }]);
      if (error) throw error;
      showToast('Video added to library!');
      fetchMediaLibrary();
    } catch (err) {
      showToast('Failed to add video: ' + err.message, 'error');
    }
  };

  const handleMediaLibraryDelete = async (item) => {
    const usage = getMediaUsageCount(item.file_url);
    const msg = usage > 0
      ? `This media is used by ${usage} question(s). Deleting it will NOT remove it from those questions. Continue?`
      : 'Delete this media asset?';
    if (!window.confirm(msg)) return;
    try {
      if (item.storage_path) {
        await supabase.storage.from('community-media').remove([item.storage_path]);
      }
      const { error } = await supabase.from('media_library').delete().eq('id', item.id);
      if (error) throw error;
      showToast('Media deleted.');
      fetchMediaLibrary();
      if (mediaPreviewItem?.id === item.id) setMediaPreviewItem(null);
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  const filteredMediaLibrary = mediaLibrary.filter(item => {
    if (mediaTypeFilter !== 'all' && item.file_type !== mediaTypeFilter) return false;
    if (mediaSearch) {
      const q = mediaSearch.toLowerCase();
      return item.filename.toLowerCase().includes(q) || (item.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const handlePostAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.body.trim()) {
      showToast('Title and body are required', 'error');
      return;
    }
    try {
      const { error } = await supabase.from('community_announcements').insert([{
        community_id: communityId,
        author_id: currentUserId,
        title: annForm.title.trim(),
        body: annForm.body.trim(),
        pinned: annForm.pinned
      }]);
      if (error) { showToast('Failed to post: ' + error.message, 'error'); return; }
      setAnnForm({ title: '', body: '', pinned: false });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error posting announcement:', error);
    }
  };

  const handleUpdateAnnouncement = async (id) => {
    if (!annEditForm.title.trim() || !annEditForm.body.trim()) {
      showToast('Title and body are required', 'error');
      return;
    }
    try {
      const { error } = await supabase.from('community_announcements').update({
        title: annEditForm.title.trim(),
        body: annEditForm.body.trim(),
        pinned: annEditForm.pinned,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) { showToast('Failed to update: ' + error.message, 'error'); return; }
      setAnnEditing(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error updating announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const { error } = await supabase.from('community_announcements').delete().eq('id', id);
      if (error) { showToast('Failed to delete: ' + error.message, 'error'); return; }
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const handleTogglePin = async (id, currentPinned) => {
    try {
      const { error } = await supabase.from('community_announcements').update({
        pinned: !currentPinned,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) { showToast('Failed to update: ' + error.message, 'error'); return; }
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const formatRelativeTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="commissioner-dashboard">
        <button className="back-btn" onClick={onBack}>← Back to Community</button>
        <p className="loading">Loading...</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="commissioner-dashboard">
        <button className="back-btn" onClick={onBack}>← Back to Community</button>
        <p>Community not found</p>
      </div>
    );
  }

  return (
    <div className="commissioner-dashboard">
      {toast && (
        <div className={`cd-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
      <button className="back-btn" onClick={onBack}>← Back to Community</button>

      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1>Commissioner Dashboard</h1>
          <span className="community-name">{community.name}</span>
        </div>
        {username && (
          <div className="dashboard-user">
            <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
            <span className="username-label">{username}</span>
          </div>
        )}
      </div>

      {/* Dropdown Navigation */}
      <div className="dashboard-nav">
        <button
          className="nav-dropdown-btn"
          onClick={() => setNavOpen(prev => !prev)}
        >
          <span className="nav-current-label">
            {{
              overview: 'Overview',
              announcements: `Announcements (${announcements.length})`,
              questions: `Questions (${questions.length})`,
              media: `Media (${mediaLibrary.length})`,
              members: `Members (${members.length})`,
              settings: 'Settings',
              analytics: 'Analytics',
            }[activeTab] || activeTab}
          </span>
          <span className={`nav-chevron ${navOpen ? 'open' : ''}`}>▾</span>
        </button>

        {navOpen && (
          <>
            <div className="nav-backdrop" onClick={() => setNavOpen(false)} />
            <div className="nav-dropdown-menu">
              {[
                { id: 'overview', label: 'Overview', icon: <HomeIcon size={16} /> },
                { id: 'announcements', label: `Announcements (${announcements.length})`, icon: <MegaphoneIcon size={16} /> },
                canManageQuestions(userCommunityRole) && { id: 'questions', label: `Questions (${questions.length})`, icon: <HelpIcon size={16} /> },
                canManageQuestions(userCommunityRole) && { id: 'media', label: `Media (${mediaLibrary.length})`, icon: <ImageIcon size={16} /> },
                canManageMembers(userCommunityRole) && { id: 'members', label: `Members (${members.length})`, icon: <UsersIcon size={16} /> },
                canManageSettings(userCommunityRole) && { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
                canViewAnalytics(userCommunityRole) && { id: 'analytics', label: 'Analytics', icon: <ChartIcon size={16} /> }
              ].filter(Boolean).map(tab => (
                <button
                  key={tab.id}
                  className={`nav-dropdown-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(tab.id); setNavOpen(false); }}
                >
                  <span className="nav-item-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="tab-content">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="tab-pane">
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-icon"><GamepadIcon size={22} /></div>
                <div className="stat-number">{stats.totalGames}</div>
                <div className="stat-label">Total Games</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><UsersIcon size={22} /></div>
                <div className="stat-number">{members.length}</div>
                <div className="stat-label">Total Members</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><StarIcon size={22} /></div>
                <div className="stat-number">{stats.activeMembers}</div>
                <div className="stat-label">Active Players</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><HelpIcon size={22} /></div>
                <div className="stat-number">{stats.questionBankSize}</div>
                <div className="stat-label">Questions</div>
              </div>
            </div>

            {importHistory.length > 0 && (
              <div className="commissioner-section">
                <h2>Recent Imports</h2>
                <div className="import-history-list">
                  {importHistory.map((entry, index) => (
                    <div key={index} className="history-entry">
                      <span className="history-icon"><UploadIcon size={14} /></span>
                      <span className="history-text">Imported <strong>{entry.count}</strong> questions</span>
                      <span className="history-date">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importHistory.length === 0 && (
              <div className="commissioner-section overview-tips">
                <h2>Quick Actions</h2>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={() => setActiveTab('questions')}>
                    <span className="qa-icon"><HelpIcon size={18} /></span>
                    <span>Manage Questions</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => setActiveTab('members')}>
                    <span className="qa-icon"><UsersIcon size={18} /></span>
                    <span>Manage Members</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => setActiveTab('analytics')}>
                    <span className="qa-icon"><ChartIcon size={18} /></span>
                    <span>View Analytics</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => setActiveTab('settings')}>
                    <span className="qa-icon"><SettingsIcon size={18} /></span>
                    <span>Community Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="tab-pane">
            <div className="commissioner-section">
              <h2>Post Announcement</h2>
              <div className="ann-form">
                <input
                  type="text"
                  className="ann-title-input"
                  placeholder="Announcement title"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                />
                <textarea
                  className="ann-body-input"
                  placeholder="Write your announcement..."
                  value={annForm.body}
                  onChange={(e) => { if (e.target.value.length <= 500) setAnnForm({ ...annForm, body: e.target.value }); }}
                  rows={4}
                  maxLength={500}
                />
                <div className="ann-form-footer">
                  <label className="ann-pin-label">
                    <input
                      type="checkbox"
                      checked={annForm.pinned}
                      onChange={(e) => setAnnForm({ ...annForm, pinned: e.target.checked })}
                    />
                    Pin this announcement
                  </label>
                  <span className="ann-char-count">{annForm.body.length}/500</span>
                </div>
                <button className="btn-primary" onClick={handlePostAnnouncement} disabled={!annForm.title.trim() || !annForm.body.trim()}>
                  Post Announcement
                </button>
              </div>
            </div>

            <div className="commissioner-section">
              <h2>Announcements ({announcements.length})</h2>
              {announcements.length === 0 ? (
                <p className="empty-message">No announcements yet. Post one above!</p>
              ) : (
                <div className="ann-list">
                  {announcements.map(ann => (
                    <div key={ann.id} className={`ann-card ${ann.pinned ? 'pinned' : ''}`}>
                      {annEditing === ann.id ? (
                        <div className="ann-edit-form">
                          <input
                            type="text"
                            className="ann-title-input"
                            value={annEditForm.title}
                            onChange={(e) => setAnnEditForm({ ...annEditForm, title: e.target.value })}
                          />
                          <textarea
                            className="ann-body-input"
                            value={annEditForm.body}
                            onChange={(e) => { if (e.target.value.length <= 500) setAnnEditForm({ ...annEditForm, body: e.target.value }); }}
                            rows={3}
                            maxLength={500}
                          />
                          <div className="ann-form-footer">
                            <label className="ann-pin-label">
                              <input
                                type="checkbox"
                                checked={annEditForm.pinned}
                                onChange={(e) => setAnnEditForm({ ...annEditForm, pinned: e.target.checked })}
                              />
                              Pinned
                            </label>
                            <span className="ann-char-count">{annEditForm.body.length}/500</span>
                          </div>
                          <div className="ann-edit-actions">
                            <button className="btn-primary" onClick={() => handleUpdateAnnouncement(ann.id)}>Save</button>
                            <button className="btn-secondary" onClick={() => setAnnEditing(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="ann-card-header">
                            <div className="ann-card-title-row">
                              <h3 className="ann-title">{ann.title}</h3>
                              {ann.pinned && <span className="ann-pinned-badge">Pinned</span>}
                            </div>
                            <span className="ann-date">{formatRelativeTime(ann.created_at)}</span>
                          </div>
                          <p className="ann-body">{ann.body}</p>
                          <div className="ann-card-actions">
                            <button className="btn-icon" onClick={() => handleTogglePin(ann.id, ann.pinned)}>
                              {ann.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button className="btn-icon" onClick={() => { setAnnEditing(ann.id); setAnnEditForm({ title: ann.title, body: ann.body, pinned: ann.pinned }); }}>
                              Edit
                            </button>
                            <button className="btn-danger-sm" onClick={() => handleDeleteAnnouncement(ann.id)}>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUESTIONS TAB */}
        {activeTab === 'questions' && canManageQuestions(userCommunityRole) && (
          <div className="tab-pane">
            {showGenerator ? (
              <CommissionerGenerator onClose={() => setShowGenerator(false)} onOpenImport={() => { setShowGenerator(false); setActiveModal('import'); }} communityCategories={community?.settings?.categories || []} />
            ) : (
            <>
            {/* Action Bar */}
            <div className="q-action-bar">
              <h2 className="q-action-bar-title">Questions ({questions.length})</h2>
              <div className="q-action-bar-buttons">
                <button className="q-action-btn" onClick={() => setActiveModal('add')}><PlusIcon size={14} /> Add</button>
                <button className="q-action-btn" onClick={() => setActiveModal('import')}><UploadIcon size={14} /> Import CSV</button>
                <button className="q-action-btn" onClick={() => setShowGenerator(true)}><SparklesIcon size={14} /> Generate with AI</button>
                <button className="q-action-btn" onClick={exportToCSV} disabled={questions.length === 0}><DownloadIcon size={14} /> Export</button>
              </div>
            </div>

            {/* Search + Filters + Question List */}
            <div className="commissioner-section">
              {questions.length > 0 && (
                <>
                  <div className="search-section">
                    <div className="search-input-wrapper">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search questions, answers, or categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>}
                    </div>
                  </div>

                  <div className="question-filters">
                    <div className="filter-group">
                      <label>Category</label>
                      <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        <option value="all">All Categories</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Difficulty</label>
                      <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}>
                        <option value="all">All Difficulties</option>
                        {['easy', 'medium', 'hard'].map(diff => (
                          <option key={diff} value={diff}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-results">
                      Showing {filteredQuestions.length} of {questions.length}
                    </div>
                  </div>

                  {allTags.length > 0 && (
                    <div className="tag-filters">
                      <label>Filter by Tags:</label>
                      <div className="tag-filter-list">
                        {allTags.map(tag => (
                          <button
                            key={tag}
                            className={`tag-filter-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                            onClick={() => toggleTagFilter(tag)}
                          >
                            {tag} {selectedTags.includes(tag) && '✓'}
                          </button>
                        ))}
                        {selectedTags.length > 0 && (
                          <button className="clear-tags-btn" onClick={() => setSelectedTags([])}>Clear All</button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="source-filters">
                    <label>Source:</label>
                    <div className="source-filter-list">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'manual', label: 'Manual' },
                        { value: 'csv', label: 'CSV Import' },
                        { value: 'ai', label: 'AI Generated' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          className={`tag-filter-btn ${filterSource === opt.value ? 'active' : ''}`}
                          onClick={() => setFilterSource(opt.value)}
                        >
                          {opt.label} {filterSource === opt.value && '✓'}
                        </button>
                      ))}
                    </div>
                  </div>

                </>
              )}

              {questions.length === 0 ? (
                <p className="empty-message">No questions in the question bank yet. Use the buttons above to add questions.</p>
              ) : (
                <div className="qt-container">
                  {/* Table Header */}
                  <div className="qt-header">
                    <div className="qt-col-check">
                      <input
                        type="checkbox"
                        checked={pagedQuestions.length > 0 && pagedQuestions.every(q => selectedQuestions.includes(q.id))}
                        onChange={toggleSelectAll}
                      />
                    </div>
                    <div className="qt-col-question">Question</div>
                    <div className="qt-col-answer">Answer</div>
                    <div className="qt-col-category">Category</div>
                    <div className="qt-col-diff">Difficulty</div>
                    <div className="qt-col-source">Source</div>
                    <div className="qt-col-media">Media</div>
                    <div className="qt-col-expand"></div>
                  </div>

                  {/* Select-all-pages banner */}
                  {pagedQuestions.length > 0 && pagedQuestions.every(q => selectedQuestions.includes(q.id)) && !selectAllPages && filteredQuestions.length > pageSize && (
                    <div className="qt-select-all-banner">
                      All {pagedQuestions.length} on this page selected.{' '}
                      <button className="qt-select-all-link" onClick={handleSelectAllPages}>
                        Select all {filteredQuestions.length} questions across all pages
                      </button>
                    </div>
                  )}
                  {selectAllPages && (
                    <div className="qt-select-all-banner">
                      All {filteredQuestions.length} questions selected.{' '}
                      <button className="qt-select-all-link" onClick={handleDeselectAll}>Clear selection</button>
                    </div>
                  )}

                  {/* Compact Rows */}
                  {pagedQuestions.map((question, idx) => {
                    const isExpanded = expandedQuestionId === question.id;
                    const isSelected = selectedQuestions.includes(question.id);
                    const srcLabel = getSourceLabel(question);
                    return (
                      <React.Fragment key={question.id}>
                        <div
                          className={`qt-row${isSelected ? ' qt-row-selected' : ''}${idx % 2 === 1 ? ' qt-row-alt' : ''}${isExpanded ? ' qt-row-expanded' : ''}`}
                          onClick={(e) => {
                            if (e.target.closest('.qt-col-check') || e.target.tagName === 'INPUT') return;
                            setExpandedQuestionId(isExpanded ? null : question.id);
                          }}
                        >
                          <div className="qt-col-check" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleQuestionSelection(question.id)}
                            />
                          </div>
                          <div className="qt-col-question qt-truncate">{question.question_text}</div>
                          <div className="qt-col-answer qt-truncate">{question.correct_answer}</div>
                          <div className="qt-col-category"><span className="qt-chip">{question.category}</span></div>
                          <div className="qt-col-diff"><span className={`qt-chip qt-chip-${question.difficulty}`}>{question.difficulty}</span></div>
                          <div className="qt-col-source"><span className={`qt-source-badge qt-source-${srcLabel.toLowerCase()}`}>{srcLabel}</span></div>
                          <div className="qt-col-media">
                            {question.image_url && <ImageIcon size={14} color="var(--gt-text-muted)" />}
                            {question.video_url && <VideoIcon size={14} color="var(--gt-text-muted)" />}
                          </div>
                          <div className="qt-col-expand">
                            <span className={`qt-chevron${isExpanded ? ' qt-chevron-open' : ''}`}>
                              <ChevronDownIcon size={14} color="var(--gt-text-muted)" />
                            </span>
                          </div>
                        </div>

                        {/* Expanded panel */}
                        <div className={`qt-expand-panel${isExpanded ? ' qt-expand-open' : ''}`}>
                          {isExpanded && (
                            <div className="qt-expand-content">
                              {/* Full question text */}
                              <div className="qt-expand-question">{question.question_text}</div>

                              {/* All answers */}
                              <div className="qt-expand-answers">
                                <span className="qt-answer-pill qt-answer-correct">{question.correct_answer}</span>
                                {question.incorrect_answers?.map((ans, i) => (
                                  <span key={i} className="qt-answer-pill qt-answer-incorrect">{ans}</span>
                                ))}
                              </div>

                              {/* Tags */}
                              <div className="qt-expand-tags">
                                {question.tags && question.tags.length > 0 && question.tags.map(tag => (
                                  <span key={tag} className="question-tag">
                                    {tag}
                                    <button className="remove-tag" onClick={() => handleRemoveTag(question.id, tag)}>×</button>
                                  </span>
                                ))}
                                {editingQuestionId === question.id ? (
                                  <div className="tag-input-wrapper">
                                    <input type="text" className="tag-input" placeholder="Add tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') handleAddTag(question.id, newTag); }} />
                                    <button className="add-tag-btn" onClick={() => handleAddTag(question.id, newTag)}>Add</button>
                                    <button className="cancel-tag-btn" onClick={() => { setEditingQuestionId(null); setNewTag(''); }}>Cancel</button>
                                  </div>
                                ) : (
                                  <button className="add-tag-trigger" onClick={() => setEditingQuestionId(question.id)}>+ Add Tag</button>
                                )}
                              </div>

                              {/* Explanation */}
                              {question.explanation && (
                                <div className="qt-expand-explanation">
                                  <LightbulbIcon size={14} /> {question.explanation}
                                </div>
                              )}

                              {/* Media thumbnails */}
                              {(question.image_url || question.video_url) && (
                                <div className="qt-expand-media">
                                  {question.image_url && <img src={question.image_url} alt="Question" style={{ height: '80px', borderRadius: '6px', objectFit: 'cover' }} />}
                                  {question.video_url && extractYouTubeId(question.video_url) && (
                                    <img src={`https://img.youtube.com/vi/${extractYouTubeId(question.video_url)}/mqdefault.jpg`} alt="Video" style={{ height: '80px', borderRadius: '6px', objectFit: 'cover' }} />
                                  )}
                                </div>
                              )}

                              {/* Media edit panel */}
                              {editingMediaId === question.id && (
                                <div className="media-edit-panel">
                                  <div className="media-edit-section">
                                    <label className="media-edit-label">Image</label>
                                    {question.image_url ? (
                                      <div className="media-preview-row">
                                        <img src={question.image_url} alt="Question" className="media-preview-thumb" />
                                        <button className="btn-danger-sm" onClick={() => handleRemoveImage(question.id)}>Remove Image</button>
                                      </div>
                                    ) : (
                                      <div className="media-upload-row">
                                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" id={`img-upload-${question.id}`} style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleImageUpload(question.id, e.target.files[0]); }} />
                                        <label htmlFor={`img-upload-${question.id}`} className="btn-secondary media-upload-btn">{mediaUploading ? 'Uploading...' : 'Upload Image'}</label>
                                        <button className="btn-secondary ml-browse-btn" onClick={() => { const qId = question.id; setMediaBrowseTarget('image'); setMediaBrowseCallback(() => async (url) => { const { error } = await supabase.from('community_questions').update({ image_url: url }).eq('id', qId).eq('community_id', communityId); if (error) { showToast('Failed: ' + error.message, 'error'); } else { fetchCommissionerData(); } }); }}>Browse Library</button>
                                        <span className="media-hint">PNG, JPEG, WebP, GIF — max 500KB</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="media-edit-section">
                                    <label className="media-edit-label">YouTube Video</label>
                                    {question.video_url ? (
                                      <div className="media-preview-row">
                                        <img src={`https://img.youtube.com/vi/${extractYouTubeId(question.video_url)}/mqdefault.jpg`} alt="Video thumbnail" className="media-preview-thumb" />
                                        <span className="media-url-display">{question.video_url}</span>
                                        <button className="btn-danger-sm" onClick={() => handleSaveVideoUrl(question.id, '')}>Remove Video</button>
                                      </div>
                                    ) : (
                                      <div className="media-upload-row">
                                        <input type="text" className="media-video-input" placeholder="https://www.youtube.com/watch?v=..." onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVideoUrl(question.id, e.target.value); }} />
                                        <button className="btn-secondary" onClick={(e) => { const input = e.target.previousElementSibling; handleSaveVideoUrl(question.id, input.value); }}>Save</button>
                                        <button className="btn-secondary ml-browse-btn" onClick={() => { const qId = question.id; setMediaBrowseTarget('video'); setMediaBrowseCallback(() => async (url) => { const { error } = await supabase.from('community_questions').update({ video_url: url }).eq('id', qId).eq('community_id', communityId); if (error) { showToast('Failed: ' + error.message, 'error'); } else { fetchCommissionerData(); setEditingMediaId(null); } }); }}>Browse Library</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Metadata + Actions */}
                              <div className="qt-expand-footer">
                                <div className="qt-expand-meta">
                                  <span>Added {new Date(question.created_at).toLocaleDateString()}</span>
                                  <span>Source: {srcLabel}</span>
                                  {question.version_number > 0 && <span>v{question.version_number}</span>}
                                </div>
                                <div className="qt-expand-actions">
                                  <button className="btn-icon" onClick={() => setEditingMediaId(editingMediaId === question.id ? null : question.id)} title="Edit media"><ImageIcon size={13} /> Media</button>
                                  <button className="btn-icon" onClick={() => saveAsTemplate(question.id)} title="Save as template"><FileIcon size={13} /> Template</button>
                                  <button className="btn-icon" onClick={() => loadVersionHistory(question.id)} title="Version history"><FileIcon size={13} /> History</button>
                                  <button className="btn-danger-sm" onClick={() => handleDeleteQuestion(question.id)}>Delete</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Pagination */}
                  {filteredQuestions.length > 0 && (
                    <div className="qt-pagination">
                      <div className="qt-pagination-info">
                        Showing {pageStart}–{pageEnd} of {filteredQuestions.length} questions
                      </div>
                      <div className="qt-pagination-controls">
                        <button className="qt-page-btn" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                        <span className="qt-page-num">Page {safeCurrentPage} of {totalPages}</span>
                        <button className="qt-page-btn" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                      </div>
                      <div className="qt-page-size">
                        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Floating bulk actions bar */}
                  {selectedQuestions.length > 0 && (
                    <div className="qt-bulk-bar">
                      <span className="qt-bulk-count">{selectedQuestions.length} selected</span>
                      <div className="qt-bulk-actions">
                        <button className="qt-bulk-btn" onClick={() => setShowBulkTagging(!showBulkTagging)}><TagIcon size={13} color="#fff" /> Add Tag</button>
                        {showBulkTagging && (
                          <div className="qt-bulk-tag-input" onClick={(e) => e.stopPropagation()}>
                            <input type="text" placeholder="Tag name..." value={bulkTagInput} onChange={(e) => setBulkTagInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { handleBulkAddTag(); } }} />
                            <button onClick={handleBulkAddTag}>Add</button>
                          </div>
                        )}
                        {allTags.length > 0 && (
                          <div className="qt-bulk-remove-tags">
                            {allTags.slice(0, 5).map(tag => (
                              <button key={tag} className="qt-bulk-remove-tag-btn" onClick={() => handleBulkRemoveTag(tag)} title={`Remove "${tag}" from selected`}>{tag} ×</button>
                            ))}
                          </div>
                        )}
                        <button className="qt-bulk-btn qt-bulk-btn-danger" onClick={handleBulkDelete}>Delete Selected</button>
                        <button className="qt-bulk-btn qt-bulk-btn-ghost" onClick={handleDeselectAll}>Deselect All</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Templates */}
            {templates.length > 0 && (
              <div className="commissioner-section">
                <h2>Question Templates</h2>
                <p className="section-desc">Save frequently used question structures as templates for quick reuse. Click "Template" on any question to save it.</p>
                <div className="templates-grid">
                  {templates.map(template => (
                    <div key={template.id} className="template-card">
                      <div className="template-header">
                        <h3>{template.name}</h3>
                        <div className="template-badges">
                          <span className="category-badge">{template.category}</span>
                          <span className={`difficulty-badge ${template.difficulty}`}>{template.difficulty}</span>
                        </div>
                      </div>
                      <div className="template-content">
                        <div className="template-question">{template.question_text}</div>
                        <div className="template-answer">✓ {template.correct_answer}</div>
                        {template.tags && template.tags.length > 0 && (
                          <div className="template-tags">
                            {template.tags.map(tag => <span key={tag} className="tag-badge">{tag}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="template-actions">
                        <button className="btn-primary" onClick={() => createFromTemplate(template.id)}>Use Template</button>
                        <button className="btn-danger-sm" onClick={() => deleteTemplate(template.id)}>Delete</button>
                      </div>
                      <div className="template-footer">Created {new Date(template.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
            )}
          </div>
        )}

        {/* MEDIA LIBRARY TAB */}
        {activeTab === 'media' && canManageQuestions(userCommunityRole) && (
          <div className="tab-pane">
            <div className="ml-header">
              <h2>Media Library ({mediaLibrary.length})</h2>
              <div className="ml-header-actions">
                <label className="q-action-btn ml-upload-btn">
                  <UploadIcon size={14} /> {mediaUploadingLib ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} disabled={mediaUploadingLib} onChange={(e) => { if (e.target.files[0]) handleMediaLibraryUpload(e.target.files[0]); e.target.value = ''; }} />
                </label>
                <button className="q-action-btn" onClick={() => {
                  const url = window.prompt('Enter YouTube URL:');
                  if (url) handleMediaLibraryAddVideo(url);
                }}><VideoIcon size={14} /> Add Video</button>
              </div>
            </div>

            <div className="ml-filters">
              <div className="search-input-wrapper">
                <input type="text" className="search-input" placeholder="Search by filename or tags..." value={mediaSearch} onChange={(e) => setMediaSearch(e.target.value)} />
                {mediaSearch && <button className="clear-search" onClick={() => setMediaSearch('')}>✕</button>}
              </div>
              <div className="ml-type-pills">
                {['all', 'image', 'video'].map(t => (
                  <button key={t} className={`ml-type-pill${mediaTypeFilter === t ? ' active' : ''}`} onClick={() => setMediaTypeFilter(t)}>
                    {t === 'all' ? 'All' : t === 'image' ? 'Images' : 'Videos'}
                  </button>
                ))}
              </div>
            </div>

            {mediaLibraryLoading ? (
              <div className="commissioner-section"><p>Loading media...</p></div>
            ) : filteredMediaLibrary.length === 0 ? (
              <div className="commissioner-section">
                <p className="empty-message">{mediaLibrary.length === 0 ? 'No media uploaded yet. Upload images or add YouTube videos to build your library.' : 'No media matches your search.'}</p>
              </div>
            ) : (
              <div className="ml-grid">
                {filteredMediaLibrary.map(item => {
                  const usage = getMediaUsageCount(item.file_url);
                  const isVideo = item.file_type === 'video';
                  const ytId = isVideo ? extractYouTubeId(item.file_url) : null;
                  return (
                    <div key={item.id} className="ml-card" onClick={() => setMediaPreviewItem(item)}>
                      <div className="ml-card-thumb">
                        {isVideo && ytId ? (
                          <>
                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={item.filename} />
                            <div className="ml-card-play">▶</div>
                          </>
                        ) : (
                          <img src={item.file_url} alt={item.filename} />
                        )}
                      </div>
                      <div className="ml-card-info">
                        <div className="ml-card-name" title={item.filename}>{item.filename}</div>
                        <div className="ml-card-meta">
                          <span className={`ml-type-badge ${item.file_type}`}>{item.file_type}</span>
                          <span className="ml-card-date">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        {usage > 0 && <div className="ml-card-usage">{usage} question{usage !== 1 ? 's' : ''}</div>}
                      </div>
                      <div className="ml-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="ml-card-action-btn" title="Copy URL" onClick={() => { navigator.clipboard.writeText(item.file_url); showToast('URL copied!'); }}>Copy</button>
                        <button className="ml-card-action-btn danger" title="Delete" onClick={() => handleMediaLibraryDelete(item)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Media Preview Modal */}
            {mediaPreviewItem && (
              <div className="cd-modal-overlay" onClick={() => setMediaPreviewItem(null)}>
                <div className="cd-modal ml-preview-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="cd-modal-header">
                    <h2>{mediaPreviewItem.filename}</h2>
                    <button className="cd-modal-close" onClick={() => setMediaPreviewItem(null)}>×</button>
                  </div>
                  <div className="cd-modal-body">
                    <div className="ml-preview-media">
                      {mediaPreviewItem.file_type === 'video' && extractYouTubeId(mediaPreviewItem.file_url) ? (
                        <div className="ml-preview-video">
                          <iframe src={`https://www.youtube.com/embed/${extractYouTubeId(mediaPreviewItem.file_url)}`} title="Video preview" style={{ border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                        </div>
                      ) : (
                        <img src={mediaPreviewItem.file_url} alt={mediaPreviewItem.filename} className="ml-preview-img" />
                      )}
                    </div>
                    <div className="ml-preview-details">
                      <div className="ml-preview-row"><strong>Type:</strong> {mediaPreviewItem.file_type}</div>
                      {mediaPreviewItem.file_size && <div className="ml-preview-row"><strong>Size:</strong> {(mediaPreviewItem.file_size / 1024).toFixed(1)} KB</div>}
                      <div className="ml-preview-row"><strong>Uploaded:</strong> {new Date(mediaPreviewItem.created_at).toLocaleString()}</div>
                      <div className="ml-preview-row"><strong>URL:</strong> <code className="ml-url-code">{mediaPreviewItem.file_url}</code></div>
                    </div>
                    {(() => {
                      const usedBy = getMediaUsageQuestions(mediaPreviewItem.file_url);
                      if (usedBy.length === 0) return <p className="ml-preview-no-usage">Not used by any questions.</p>;
                      return (
                        <div className="ml-preview-usage">
                          <h4>Used by {usedBy.length} question{usedBy.length !== 1 ? 's' : ''}:</h4>
                          <ul>{usedBy.map(q => <li key={q.id}>{q.question_text}</li>)}</ul>
                        </div>
                      );
                    })()}
                    <div className="ml-preview-actions">
                      <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(mediaPreviewItem.file_url); showToast('URL copied!'); }}>Copy URL</button>
                      <button className="btn-danger-sm" onClick={() => { handleMediaLibraryDelete(mediaPreviewItem); }}>Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && canManageMembers(userCommunityRole) && (
          <div className="tab-pane">
            <div className="commissioner-section">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px',marginBottom:'16px'}}>
                <h2 style={{margin:0}}>Manage Members ({members.length})</h2>
                <button className="btn-primary" onClick={() => setShowInviteModal(true)} style={{fontSize:'13px',padding:'6px 14px'}}>
                  Invite by Email
                </button>
              </div>
              {members.length === 0 ? (
                <p className="empty-message">No members yet</p>
              ) : (
                <div className="members-table">
                  <table>
                    <thead>
                      <tr><th>Username</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {members.map(member => {
                        const mRole = member.role || 'member';
                        const isSelf = member.user_id === currentUserId;
                        const roleBadgeStyles = {
                          owner: { background: '#B8860B', color: '#fff' },
                          commissioner: { background: '#041E42', color: '#fff' },
                          moderator: { background: '#0D7377', color: '#fff' },
                          member: { background: '#E0E0E0', color: '#333' },
                        };
                        const badgeStyle = {
                          ...roleBadgeStyles[mRole] || roleBadgeStyles.member,
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          display: 'inline-block',
                        };

                        // Determine allowed role options for dropdown
                        let roleOptions = null;
                        if (!isSelf) {
                          if (userCommunityRole === 'owner' && mRole !== 'owner') {
                            roleOptions = ['member', 'moderator', 'commissioner'];
                          } else if (userCommunityRole === 'commissioner' && (mRole === 'member' || mRole === 'moderator')) {
                            roleOptions = ['member', 'moderator'];
                          }
                        }

                        return (
                          <tr key={member.user_id}>
                            <td>
                              {member.profiles?.username}
                              {isSelf && <span style={{ fontSize: '10px', color: '#8B9DC3', marginLeft: '6px' }}>(you)</span>}
                            </td>
                            <td>
                              {roleOptions ? (
                                <select
                                  value={mRole}
                                  onChange={(e) => handleRoleChange(member.user_id, member.profiles?.username, e.target.value)}
                                  style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '6px', border: '1px solid #DEE2E6' }}
                                >
                                  {roleOptions.map(r => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={badgeStyle}>{mRole}</span>
                              )}
                            </td>
                            <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                            <td>
                              {!isSelf && mRole !== 'owner' && hasCommunityRole(userCommunityRole, 'commissioner') && (
                                <button className="btn-danger-sm" onClick={() => handleRemoveMember(member.user_id, member.profiles?.username)}>
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {/* Invite by Email Modal */}
            {showInviteModal && (
              <div className="cd-modal-overlay" onClick={() => { if (!inviteSending) setShowInviteModal(false); }}>
                <div className="cd-modal" onClick={e => e.stopPropagation()} style={{maxWidth:'440px'}}>
                  <h3 style={{margin:'0 0 12px',color:'#041E42'}}>Invite by Email</h3>
                  <p style={{fontSize:'0.85rem',color:'#54585A',margin:'0 0 16px'}}>
                    Send an email invitation with the community invite code.
                  </p>
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'4px'}}>Email Address *</label>
                  <input
                    type="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    style={{width:'100%',padding:'8px 10px',borderRadius:'6px',border:'1px solid #DEE2E6',fontSize:'14px',boxSizing:'border-box',marginBottom:'12px'}}
                  />
                  <label style={{display:'block',fontSize:'13px',fontWeight:600,marginBottom:'4px'}}>Personal Message (optional)</label>
                  <textarea
                    placeholder="Add a note to your invitation..."
                    value={inviteMessage}
                    onChange={e => { if (e.target.value.length <= 300) setInviteMessage(e.target.value); }}
                    rows={3}
                    style={{width:'100%',padding:'8px 10px',borderRadius:'6px',border:'1px solid #DEE2E6',fontSize:'14px',boxSizing:'border-box',resize:'vertical',marginBottom:'4px'}}
                  />
                  <div style={{textAlign:'right',fontSize:'0.72rem',color:'#54585A',marginBottom:'16px'}}>
                    {inviteMessage.length}/300
                  </div>
                  <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                    <button
                      className="btn-primary"
                      disabled={inviteSending || !inviteEmail.trim()}
                      onClick={async () => {
                        setInviteSending(true);
                        sendInvitationEmail(
                          inviteEmail.trim(),
                          community.name,
                          community.invite_code,
                          community.description || '',
                          inviteMessage.trim()
                        );
                        showToast('Invitation sent to ' + inviteEmail.trim());
                        setInviteEmail('');
                        setInviteMessage('');
                        setShowInviteModal(false);
                        setInviteSending(false);
                      }}
                    >
                      {inviteSending ? 'Sending...' : 'Send Invitation'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => { setShowInviteModal(false); setInviteEmail(''); setInviteMessage(''); }}
                      disabled={inviteSending}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && canManageSettings(userCommunityRole) && (
          <div className="tab-pane">
            <div className="commissioner-section">
              <div className="section-header">
                <h2>Community Settings</h2>
                {!editMode && (
                  <button className="btn-primary" onClick={() => setEditMode(true)}>Edit Settings</button>
                )}
              </div>

              {editMode ? (
                <div className="settings-edit-form">
                  <div className="form-group">
                    <label>Community Name</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Season Start Date</label>
                      <input type="date" value={editForm.season_start} onChange={(e) => setEditForm({ ...editForm, season_start: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Season End Date</label>
                      <input type="date" value={editForm.season_end} onChange={(e) => setEditForm({ ...editForm, season_end: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Max Members</label>
                    <input type="number" value={editForm.max_members} onChange={(e) => setEditForm({ ...editForm, max_members: parseInt(e.target.value) })} min="1" max="200" />
                  </div>
                  <div className="form-group">
                    <label style={{display:'flex', alignItems:'center', gap:'12px'}}>
                      List in Marketplace
                      <span
                        className={`visibility-toggle ${editForm.visibility === 'public' ? 'on' : ''}`}
                        onClick={() => setEditForm({ ...editForm, visibility: editForm.visibility === 'public' ? 'private' : 'public' })}
                        role="switch"
                        aria-checked={editForm.visibility === 'public'}
                        tabIndex={0}
                        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditForm({ ...editForm, visibility: editForm.visibility === 'public' ? 'private' : 'public' }); }}
                      >
                        <span className="visibility-toggle-knob" />
                      </span>
                      <span style={{fontSize:'0.85rem', color:'#54585A', fontWeight:400}}>
                        {editForm.visibility === 'public' ? 'Public — discoverable in marketplace' : 'Private — invite only'}
                      </span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Community Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => { if (e.target.value.length <= 300) setEditForm({ ...editForm, description: e.target.value }); }}
                      placeholder="Describe your community for the marketplace..."
                      rows={3}
                      maxLength={300}
                      style={{width:'100%', padding:'10px 12px', border:'2px solid #DEE2E6', borderRadius:'6px', fontSize:'0.95rem', resize:'vertical', fontFamily:'inherit'}}
                    />
                    <span style={{fontSize:'0.8rem', color:'#54585A', textAlign:'right', display:'block', marginTop:'4px'}}>
                      {editForm.description.length}/300
                    </span>
                  </div>
                  <div className="form-group">
                    <label style={{display:'flex', alignItems:'center', gap:'12px'}}>
                      Enable Timer
                      <span
                        className={`visibility-toggle ${editForm.timer_enabled ? 'on' : ''}`}
                        onClick={() => setEditForm({ ...editForm, timer_enabled: !editForm.timer_enabled })}
                        role="switch"
                        aria-checked={editForm.timer_enabled}
                        tabIndex={0}
                        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditForm({ ...editForm, timer_enabled: !editForm.timer_enabled }); }}
                      >
                        <span className="visibility-toggle-knob" />
                      </span>
                      <span style={{fontSize:'0.85rem', color:'#54585A', fontWeight:400}}>
                        {editForm.timer_enabled ? 'On — countdown per question' : 'Off — no time limit'}
                      </span>
                    </label>
                  </div>
                  {editForm.timer_enabled && (
                    <div className="form-group">
                      <label>Timer Duration</label>
                      <select
                        value={editForm.timer_seconds}
                        onChange={(e) => setEditForm({ ...editForm, timer_seconds: parseInt(e.target.value) })}
                      >
                        <option value={15}>15 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={45}>45 seconds</option>
                        <option value={60}>60 seconds</option>
                        <option value={90}>90 seconds</option>
                        <option value={120}>120 seconds</option>
                      </select>
                    </div>
                  )}
                  <div className="form-actions">
                    <button className="btn-primary" onClick={handleSaveSettings}>Save Changes</button>
                    <button className="btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="settings-display">
                  <div className="setting-item">
                    <span className="setting-label">Community Name</span>
                    <span className="setting-value">{community.name}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Season</span>
                    <span className="setting-value">
                      {new Date(community.season_start).toLocaleDateString()} – {new Date(community.season_end).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Max Members</span>
                    <span className="setting-value">{community.settings?.max_members || 50}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Invite Code</span>
                    <span style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                      <span className="setting-value code">{community.invite_code}</span>
                      <button
                        onClick={handleRegenerateInviteCode}
                        disabled={regenerating}
                        style={{padding:'4px 10px', fontSize:'0.75rem', fontWeight:600, background:'#fff', color:'#041E42', border:'1px solid #041E42', borderRadius:'4px', cursor:regenerating ? 'not-allowed' : 'pointer', opacity:regenerating ? 0.6 : 1}}
                      >
                        {regenerating ? 'Regenerating…' : 'Regenerate'}
                      </button>
                    </span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Marketplace Listing</span>
                    <span className="setting-value">
                      {community.visibility === 'public' ? 'Public — listed in marketplace' : 'Private — invite only'}
                    </span>
                  </div>
                  {community.description && (
                    <div className="setting-item">
                      <span className="setting-label">Description</span>
                      <span className="setting-value">{community.description}</span>
                    </div>
                  )}
                  <div className="setting-item">
                    <span className="setting-label">Question Timer</span>
                    <span className="setting-value">
                      {community.settings?.timer_enabled
                        ? `Enabled — ${community.settings.timer_seconds || 30}s per question`
                        : 'Disabled'}
                    </span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Theme Color</span>
                    <span className="setting-value" style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <span style={{width:'18px', height:'18px', borderRadius:'50%', background: community.settings?.theme_color || '#041E42', display:'inline-block', border:'1px solid var(--border-color)'}} />
                      {community.settings?.theme_color || '#041E42'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Appearance */}
            <div className="commissioner-section" style={{marginTop: '24px'}}>
              <h2>Appearance</h2>
              <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'16px'}}>Customize how your community looks to members.</p>

              <div className="theme-section">
                <div className="form-group">
                  <label>Theme Color</label>
                  <div style={{display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap'}}>
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      style={{width:'48px', height:'36px', padding:'2px', border:'2px solid var(--border-color)', borderRadius:'6px', cursor:'pointer', background:'transparent'}}
                    />
                    <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                      {['#041E42','#1a5276','#2E86C1','#27AE60','#8E44AD','#C0392B','#D4AC0D','#E67E22'].map(c => (
                        <button
                          key={c}
                          onClick={() => setThemeColor(c)}
                          title={c}
                          style={{
                            width:'28px', height:'28px', borderRadius:'50%', border: themeColor === c ? '3px solid var(--text-primary)' : '2px solid var(--border-color)',
                            background: c, cursor:'pointer', padding:0, transition:'transform 0.15s',
                            transform: themeColor === c ? 'scale(1.15)' : 'scale(1)'
                          }}
                        />
                      ))}
                    </div>
                    <span style={{fontSize:'0.82rem', color:'var(--text-muted)', fontFamily:'monospace'}}>{themeColor}</span>
                  </div>
                </div>

                <div className="form-group" style={{marginTop:'16px'}}>
                  <label>Community Logo</label>
                  <p style={{fontSize:'0.8rem', color:'var(--text-muted)', margin:'2px 0 8px'}}>Square image, max 2 MB. Shown on cards and header.</p>
                  {community?.settings?.logo_url ? (
                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                      <img src={community.settings.logo_url} alt="Logo" style={{width:'64px', height:'64px', borderRadius:'8px', objectFit:'cover', border:'2px solid var(--border-color)'}} />
                      <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                        <label className="btn-secondary" style={{cursor:'pointer', padding:'6px 12px', fontSize:'0.82rem', textAlign:'center'}}>
                          Replace
                          <input type="file" accept="image/*" hidden onChange={(e) => handleThemeImageUpload(e.target.files[0], 'logo')} />
                        </label>
                        <button className="btn-danger-sm" onClick={() => handleRemoveThemeImage('logo')} style={{padding:'6px 12px', fontSize:'0.82rem'}}>Remove</button>
                      </div>
                      {logoUploading && <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Uploading…</span>}
                    </div>
                  ) : (
                    <label className="btn-secondary" style={{cursor:'pointer', display:'inline-block', padding:'8px 16px', fontSize:'0.85rem'}}>
                      {logoUploading ? 'Uploading…' : 'Upload Logo'}
                      <input type="file" accept="image/*" hidden disabled={logoUploading} onChange={(e) => handleThemeImageUpload(e.target.files[0], 'logo')} />
                    </label>
                  )}
                </div>

                <div className="form-group" style={{marginTop:'16px'}}>
                  <label>Banner Image</label>
                  <p style={{fontSize:'0.8rem', color:'var(--text-muted)', margin:'2px 0 8px'}}>Wide image (e.g. 1200×300), max 5 MB. Shown at top of community page.</p>
                  {community?.settings?.banner_url ? (
                    <div>
                      <img src={community.settings.banner_url} alt="Banner" style={{width:'100%', maxHeight:'120px', objectFit:'cover', borderRadius:'8px', border:'2px solid var(--border-color)', marginBottom:'8px'}} />
                      <div style={{display:'flex', gap:'8px'}}>
                        <label className="btn-secondary" style={{cursor:'pointer', padding:'6px 12px', fontSize:'0.82rem'}}>
                          Replace
                          <input type="file" accept="image/*" hidden onChange={(e) => handleThemeImageUpload(e.target.files[0], 'banner')} />
                        </label>
                        <button className="btn-danger-sm" onClick={() => handleRemoveThemeImage('banner')} style={{padding:'6px 12px', fontSize:'0.82rem'}}>Remove</button>
                        {bannerUploading && <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Uploading…</span>}
                      </div>
                    </div>
                  ) : (
                    <label className="btn-secondary" style={{cursor:'pointer', display:'inline-block', padding:'8px 16px', fontSize:'0.85rem'}}>
                      {bannerUploading ? 'Uploading…' : 'Upload Banner'}
                      <input type="file" accept="image/*" hidden disabled={bannerUploading} onChange={(e) => handleThemeImageUpload(e.target.files[0], 'banner')} />
                    </label>
                  )}
                </div>

                <div className="form-group" style={{marginTop:'16px'}}>
                  <label>Welcome Message</label>
                  <p style={{fontSize:'0.8rem', color:'var(--text-muted)', margin:'2px 0 8px'}}>Shown to members on the community page. Max 300 characters.</p>
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => { if (e.target.value.length <= 300) setWelcomeMessage(e.target.value); }}
                    placeholder="Welcome to our community! Have fun and play fair."
                    rows={3}
                    maxLength={300}
                    style={{width:'100%', padding:'10px 12px', border:'2px solid var(--border-color)', borderRadius:'6px', fontSize:'0.95rem', resize:'vertical', fontFamily:'inherit', background:'var(--bg-input)', color:'var(--text-primary)'}}
                  />
                  <span style={{fontSize:'0.8rem', color:'var(--text-muted)', textAlign:'right', display:'block', marginTop:'4px'}}>
                    {welcomeMessage.length}/300
                  </span>
                </div>

                <button className="btn-primary" onClick={handleSaveTheme} style={{marginTop:'8px'}}>
                  Save Appearance
                </button>
              </div>
            </div>

            {/* Category Management */}
            <div className="commissioner-section" style={{marginTop: '24px'}}>
              <h2>Categories</h2>
              <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'16px'}}>
                Define categories for your question bank. These appear in the quiz category dropdown and the Add Question form.
              </p>

              {/* Add category */}
              <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <input
                  type="text"
                  placeholder="New category name"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                  maxLength={50}
                  style={{flex:1,padding:'8px 10px',borderRadius:'6px',border:'2px solid var(--border-color)',fontSize:'0.9rem',background:'var(--bg-input)',color:'var(--text-primary)'}}
                />
                <button className="btn-primary" onClick={handleAddCategory} disabled={!newCategory.trim()} style={{fontSize:'13px',padding:'8px 14px'}}>
                  Add
                </button>
              </div>

              {/* Category list */}
              {(() => {
                const defined = community?.settings?.categories || [];
                const inUse = categoryCounts.map(([c]) => c);
                const allCats = [...new Set([...defined, ...inUse])].sort();
                if (allCats.length === 0) return <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>No categories defined yet. Add questions or define categories above.</p>;
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {allCats.map(cat => {
                      const count = categoryCounts.find(([c]) => c === cat)?.[1] || 0;
                      const isDefined = defined.includes(cat);
                      return (
                        <div key={cat} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'var(--bg-secondary)',borderRadius:'6px',fontSize:'0.9rem'}}>
                          {renamingCategory === cat ? (
                            <>
                              <input
                                type="text"
                                value={renameCategoryValue}
                                onChange={e => setRenameCategoryValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRenameCategory(cat); if (e.key === 'Escape') setRenamingCategory(null); }}
                                autoFocus
                                style={{flex:1,padding:'4px 8px',borderRadius:'4px',border:'1px solid var(--border-color)',fontSize:'0.9rem',background:'var(--bg-input)',color:'var(--text-primary)'}}
                              />
                              <button onClick={() => handleRenameCategory(cat)} style={{padding:'3px 10px',fontSize:'12px',borderRadius:'4px',border:'1px solid #041E42',background:'#041E42',color:'#fff',cursor:'pointer'}}>Save</button>
                              <button onClick={() => setRenamingCategory(null)} style={{padding:'3px 10px',fontSize:'12px',borderRadius:'4px',border:'1px solid var(--border-color)',background:'transparent',color:'var(--text-primary)',cursor:'pointer'}}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <span style={{flex:1,fontWeight:500,color:'var(--text-primary)'}}>{cat}</span>
                              <span style={{fontSize:'0.8rem',color:'var(--text-muted)',minWidth:'60px'}}>{count} question{count !== 1 ? 's' : ''}</span>
                              {!isDefined && <span style={{fontSize:'0.7rem',color:'#8B9DC3',background:'var(--bg-primary)',padding:'1px 6px',borderRadius:'8px'}}>in use</span>}
                              <button
                                onClick={() => { setRenamingCategory(cat); setRenameCategoryValue(cat); }}
                                title="Rename"
                                style={{padding:'3px 8px',fontSize:'11px',borderRadius:'4px',border:'1px solid var(--border-color)',background:'transparent',color:'var(--text-primary)',cursor:'pointer'}}
                              >Rename</button>
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                title={count > 0 ? 'Cannot delete — questions use this category' : 'Delete'}
                                style={{padding:'3px 8px',fontSize:'11px',borderRadius:'4px',border:'1px solid #dc3545',background:'transparent',color:'#dc3545',cursor:count > 0 ? 'not-allowed' : 'pointer',opacity:count > 0 ? 0.5 : 1}}
                              >Delete</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Season Management */}
            <div className="commissioner-section" style={{marginTop: '24px'}}>
              <h2>Season Management</h2>
              <div className="season-info-grid">
                <div className="season-info-card">
                  <div className="season-info-label">Current Season</div>
                  <div className="season-info-value">Season {community.current_season || 1}</div>
                </div>
                <div className="season-info-card">
                  <div className="season-info-label">Season Dates</div>
                  <div className="season-info-value">
                    {community.season_start ? new Date(community.season_start).toLocaleDateString() : '—'} – {community.season_end ? new Date(community.season_end).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div className="season-info-card">
                  <div className="season-info-label">Days Remaining</div>
                  <div className="season-info-value">
                    {community.season_end ? Math.max(0, Math.ceil((new Date(community.season_end) - new Date()) / (1000 * 60 * 60 * 24))) : '—'}
                  </div>
                </div>
                <div className="season-info-card">
                  <div className="season-info-label">Games This Season</div>
                  <div className="season-info-value">{seasonStats.gamesThisSeason}</div>
                </div>
                <div className="season-info-card">
                  <div className="season-info-label">Active Players</div>
                  <div className="season-info-value">{seasonStats.activePlayers}</div>
                </div>
                {seasonStats.topPlayer && (
                  <div className="season-info-card">
                    <div className="season-info-label">Top Player</div>
                    <div className="season-info-value">{seasonStats.topPlayer.username} ({seasonStats.topPlayer.avg}%)</div>
                  </div>
                )}
              </div>

              <button
                className="season-reset-btn"
                onClick={() => { setShowResetModal(true); setResetConfirmed(false); }}
              >
                Reset Season & Start New
              </button>

              {/* Reset Confirmation Modal */}
              {showResetModal && (
                <div className="season-modal-backdrop" onClick={() => setShowResetModal(false)}>
                  <div className="season-modal" onClick={e => e.stopPropagation()}>
                    <h3 className="season-modal-title">Reset Season {community.current_season || 1}?</h3>
                    <p className="season-modal-warning">
                      This will archive the current season's leaderboard and start fresh rankings. Game history is preserved but the community leaderboard resets to zero.
                    </p>
                    <div className="season-modal-stats">
                      <div className="season-modal-stat">
                        <span className="season-modal-stat-label">Games played</span>
                        <span className="season-modal-stat-value">{seasonStats.gamesThisSeason}</span>
                      </div>
                      <div className="season-modal-stat">
                        <span className="season-modal-stat-label">Active players</span>
                        <span className="season-modal-stat-value">{seasonStats.activePlayers}</span>
                      </div>
                      {seasonStats.topPlayer && (
                        <div className="season-modal-stat">
                          <span className="season-modal-stat-label">Top player</span>
                          <span className="season-modal-stat-value">{seasonStats.topPlayer.username} ({seasonStats.topPlayer.avg}%)</span>
                        </div>
                      )}
                    </div>
                    <label className="season-modal-confirm-label">
                      <input
                        type="checkbox"
                        checked={resetConfirmed}
                        onChange={e => setResetConfirmed(e.target.checked)}
                      />
                      I understand this cannot be undone
                    </label>
                    <div className="season-modal-actions">
                      <button className="btn-secondary" onClick={() => setShowResetModal(false)}>Cancel</button>
                      <button
                        className="season-reset-btn"
                        disabled={!resetConfirmed || resetting}
                        onClick={handleSeasonReset}
                        style={{marginTop: 0}}
                      >
                        {resetting ? 'Resetting...' : 'Reset Season'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Season History */}
              {seasonArchives.length > 0 && (
                <div className="season-history">
                  <h3 className="season-history-title">Past Seasons</h3>
                  {seasonArchives.map(archive => (
                    <div key={archive.id} className="season-archive-card">
                      <button
                        className="season-archive-header"
                        onClick={() => setExpandedArchive(expandedArchive === archive.id ? null : archive.id)}
                      >
                        <span className="season-archive-name">Season {archive.season_number}</span>
                        <span className="season-archive-dates">
                          {new Date(archive.season_start).toLocaleDateString()} – {new Date(archive.season_end).toLocaleDateString()}
                        </span>
                        <span className="season-archive-chevron">{expandedArchive === archive.id ? '▾' : '▸'}</span>
                      </button>
                      {expandedArchive === archive.id && (
                        <div className="season-archive-body">
                          <div className="season-archive-summary">
                            <span>{archive.total_games} games</span>
                            {archive.top_player_username && (
                              <span>MVP: {archive.top_player_username} ({archive.top_player_avg != null ? Math.round(archive.top_player_avg) : '—'}%)</span>
                            )}
                          </div>
                          {archive.leaderboard_snapshot && archive.leaderboard_snapshot.length > 0 ? (
                            <table className="season-archive-table">
                              <thead>
                                <tr><th>#</th><th>Player</th><th>Games</th><th>Avg</th></tr>
                              </thead>
                              <tbody>
                                {archive.leaderboard_snapshot.slice(0, 10).map((p, i) => (
                                  <tr key={i}>
                                    <td>{p.rank || i + 1}</td>
                                    <td>{p.username}</td>
                                    <td>{p.total_games}</td>
                                    <td>{p.avg_score}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="empty-message">No leaderboard data</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Owner-only danger zone */}
            {(canDeleteCommunity(userCommunityRole) || canTransferOwnership(userCommunityRole)) && (
              <div className="commissioner-section" style={{ marginTop: '32px' }}>
                <h2 style={{ color: '#C41E3A' }}>Danger Zone</h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {canTransferOwnership(userCommunityRole) && (
                    <button
                      className="btn-danger-sm"
                      style={{ padding: '8px 18px', fontSize: '13px' }}
                      onClick={() => setShowTransferModal(true)}
                    >
                      Transfer Ownership
                    </button>
                  )}
                  {canDeleteCommunity(userCommunityRole) && (
                    <button
                      className="btn-danger-sm"
                      style={{ padding: '8px 18px', fontSize: '13px', background: '#C41E3A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      onClick={handleDeleteCommunity}
                    >
                      Delete Community
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transfer Ownership Modal */}
        {showTransferModal && (
          <div className="cd-modal-overlay" onClick={() => setShowTransferModal(false)}>
            <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div className="cd-modal-header">
                <h2>Transfer Ownership</h2>
                <button className="cd-modal-close" onClick={() => setShowTransferModal(false)}>×</button>
              </div>
              <div className="cd-modal-body">
                <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', marginBottom: '16px', fontSize: '13px', color: '#991b1b' }}>
                  This will make the selected member the new owner. You will be demoted to Commissioner.
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#041E42', marginBottom: '4px' }}>New Owner</label>
                  <select
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DEE2E6', fontSize: '14px' }}
                  >
                    <option value="">Select a member...</option>
                    {members.filter(m => m.user_id !== currentUserId).map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.profiles?.username} ({m.role || 'member'})</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#041E42', marginBottom: '4px' }}>
                    Type <strong>{community?.name}</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={transferConfirmText}
                    onChange={(e) => setTransferConfirmText(e.target.value)}
                    placeholder={community?.name}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DEE2E6', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn-primary" style={{ background: '#E8ECF0', color: '#54585A' }} onClick={() => setShowTransferModal(false)} disabled={transferLoading}>Cancel</button>
                  <button
                    className="btn-primary"
                    style={{ background: '#C41E3A' }}
                    disabled={!transferTarget || transferConfirmText !== community?.name || transferLoading}
                    onClick={handleTransferOwnership}
                  >
                    {transferLoading ? 'Transferring...' : 'Transfer Ownership'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && canViewAnalytics(userCommunityRole) && (
          <div className="tab-pane">
            {analytics ? (
              <div className="analytics-container">
                <div className="analytics-overview">
                  <div className="analytics-stat-card">
                    <div className="analytics-stat-number">{analytics.totalGamesPlayed}</div>
                    <div className="analytics-stat-label">Total Games Played</div>
                  </div>
                  <div className="analytics-stat-card">
                    <div className="analytics-stat-number">{analytics.totalAnswers}</div>
                    <div className="analytics-stat-label">Total Answers</div>
                  </div>
                  <div className="analytics-stat-card">
                    <div className="analytics-stat-number">{Object.keys(analytics.categoryDistribution).length}</div>
                    <div className="analytics-stat-label">Categories</div>
                  </div>
                  <div className="analytics-stat-card">
                    <div className="analytics-stat-number">{Object.keys(analytics.tagUsage).length}</div>
                    <div className="analytics-stat-label">Unique Tags</div>
                  </div>
                </div>

                <div className="analytics-charts">
                  <div className="analytics-chart">
                    <h3>Category Distribution</h3>
                    <div className="distribution-bars">
                      {Object.entries(analytics.categoryDistribution).sort(([, a], [, b]) => b - a).map(([category, count]) => (
                        <div key={category} className="distribution-bar-row">
                          <span className="bar-label">{category}</span>
                          <div className="bar-container">
                            <div className="bar-fill" style={{ width: questions.length > 0 ? `${(count / questions.length) * 100}%` : '0%' }} />
                          </div>
                          <span className="bar-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="analytics-chart">
                    <h3>Difficulty Distribution</h3>
                    <div className="distribution-bars">
                      {Object.entries(analytics.difficultyDistribution).map(([difficulty, count]) => (
                        <div key={difficulty} className="distribution-bar-row">
                          <span className="bar-label">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                          <div className="bar-container">
                            <div className={`bar-fill ${difficulty}`} style={{ width: questions.length > 0 ? `${(count / questions.length) * 100}%` : '0%' }} />
                          </div>
                          <span className="bar-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {Object.keys(analytics.tagUsage).length > 0 && (
                    <div className="analytics-chart">
                      <h3>Most Used Tags</h3>
                      <div className="distribution-bars">
                        {Object.entries(analytics.tagUsage).sort(([, a], [, b]) => b - a).slice(0, 10).map(([tag, count]) => (
                          <div key={tag} className="distribution-bar-row">
                            <span className="bar-label">{tag}</span>
                            <div className="bar-container">
                              <div className="bar-fill tag" style={{ width: questions.length > 0 ? `${(count / questions.length) * 100}%` : '0%' }} />
                            </div>
                            <span className="bar-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {analytics.totalGamesPlayed > 0 && (
                  <div className="analytics-performance">
                    <div className="performance-section">
                      <h3>Most Used Questions</h3>
                      {analytics.mostUsedQuestions.length > 0 ? (
                        <div className="performance-list">
                          {analytics.mostUsedQuestions.map(([qId, count]) => {
                            const question = questions.find(q => q.id === parseInt(qId));
                            if (!question) return null;
                            return (
                              <div key={qId} className="performance-item">
                                <div className="performance-question-text">{question.question_text}</div>
                                <div className="performance-meta">
                                  <span className="category-badge">{question.category}</span>
                                  <span className="usage-count">Used {count}× in games</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : <p className="empty-message">No usage data yet</p>}
                    </div>

                    <div className="performance-section">
                      <h3>Hardest Questions</h3>
                      {analytics.hardestQuestions.length > 0 ? (
                        <div className="performance-list">
                          {analytics.hardestQuestions.map(perf => {
                            const question = questions.find(q => q.id === perf.questionId);
                            if (!question) return null;
                            return (
                              <div key={perf.questionId} className="performance-item">
                                <div className="performance-question-text">{question.question_text}</div>
                                <div className="performance-meta">
                                  <span className="category-badge">{question.category}</span>
                                  <span className="correct-rate hard">{(perf.correctRate * 100).toFixed(1)}% correct ({perf.totalAnswers} attempts)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : <p className="empty-message">Not enough data (need 3+ answers per question)</p>}
                    </div>

                    <div className="performance-section">
                      <h3>Easiest Questions</h3>
                      {analytics.easiestQuestions.length > 0 ? (
                        <div className="performance-list">
                          {analytics.easiestQuestions.map(perf => {
                            const question = questions.find(q => q.id === perf.questionId);
                            if (!question) return null;
                            return (
                              <div key={perf.questionId} className="performance-item">
                                <div className="performance-question-text">{question.question_text}</div>
                                <div className="performance-meta">
                                  <span className="category-badge">{question.category}</span>
                                  <span className="correct-rate easy">{(perf.correctRate * 100).toFixed(1)}% correct ({perf.totalAnswers} attempts)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : <p className="empty-message">Not enough data (need 3+ answers per question)</p>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="commissioner-section">
                <p className="empty-message">No analytics data available yet. Questions need to be used in games first.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ===== ADD QUESTION MODAL ===== */}
      {activeModal === 'add' && (
        <div className="cd-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>Add New Question</h2>
              <button className="cd-modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <div className="cd-modal-body">
              {addQErrors.length > 0 && (
                <div className="add-q-errors">
                  {addQErrors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
              <div className="add-q-field">
                <label>Question Text <span className="required">*</span></label>
                <textarea rows={3} value={addQForm.question_text} onChange={e => setAddQForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Enter your trivia question..." />
              </div>
              <div className="add-q-field">
                <label>Correct Answer <span className="required">*</span></label>
                <input type="text" value={addQForm.correct_answer} onChange={e => setAddQForm(f => ({ ...f, correct_answer: e.target.value }))} placeholder="The correct answer" />
              </div>
              <div className="add-q-row-3">
                <div className="add-q-field">
                  <label>Incorrect 1 <span className="required">*</span></label>
                  <input type="text" value={addQForm.incorrect_1} onChange={e => setAddQForm(f => ({ ...f, incorrect_1: e.target.value }))} />
                </div>
                <div className="add-q-field">
                  <label>Incorrect 2 <span className="required">*</span></label>
                  <input type="text" value={addQForm.incorrect_2} onChange={e => setAddQForm(f => ({ ...f, incorrect_2: e.target.value }))} />
                </div>
                <div className="add-q-field">
                  <label>Incorrect 3 <span className="required">*</span></label>
                  <input type="text" value={addQForm.incorrect_3} onChange={e => setAddQForm(f => ({ ...f, incorrect_3: e.target.value }))} />
                </div>
              </div>
              <div className="add-q-row-3">
                <div className="add-q-field">
                  <label>Category <span className="required">*</span></label>
                  {(community?.settings?.categories || []).length > 0 ? (
                    addQForm.category === '__other__' ? (
                      <div style={{display:'flex',gap:'6px'}}>
                        <input type="text" value={addQForm._customCategory || ''} onChange={e => setAddQForm(f => ({ ...f, _customCategory: e.target.value }))} placeholder="Enter category name" style={{flex:1}} />
                        <button type="button" onClick={() => setAddQForm(f => ({ ...f, category: '', _customCategory: undefined }))} style={{padding:'4px 8px',fontSize:'12px',border:'1px solid var(--border-color)',borderRadius:'4px',background:'transparent',cursor:'pointer',color:'var(--text-primary)'}}>Back</button>
                      </div>
                    ) : (
                      <select value={addQForm.category} onChange={e => setAddQForm(f => ({ ...f, category: e.target.value }))}>
                        <option value="">Select category...</option>
                        {(community.settings.categories || []).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__other__">Other (custom)</option>
                      </select>
                    )
                  ) : (
                    <input type="text" value={addQForm.category} onChange={e => setAddQForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Geography" />
                  )}
                </div>
                <div className="add-q-field">
                  <label>Difficulty <span className="required">*</span></label>
                  <select value={addQForm.difficulty} onChange={e => setAddQForm(f => ({ ...f, difficulty: e.target.value }))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="add-q-field">
                  <label>Tags (comma-separated)</label>
                  <input type="text" value={addQForm.tags} onChange={e => setAddQForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. history, europe" />
                </div>
              </div>
              <div className="add-q-row-2">
                <div className="add-q-field">
                  <label>Image (optional, max 500KB)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={e => {
                      const file = e.target.files[0];
                      setAddQImageFile(file || null);
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => setAddQImagePreview(ev.target.result);
                        reader.readAsDataURL(file);
                      } else { setAddQImagePreview(null); }
                    }}
                  />
                  {addQImagePreview && <img src={addQImagePreview} alt="Preview" className="add-q-img-preview" />}
                  <button type="button" className="btn-secondary ml-browse-btn" onClick={() => { setMediaBrowseTarget('image'); setMediaBrowseCallback(() => (url) => { setAddQForm(f => ({ ...f, image_url: url })); setAddQImagePreview(url); setAddQImageFile(null); }); }}>Browse Library</button>
                </div>
                <div className="add-q-field">
                  <label>YouTube Video URL (optional)</label>
                  <input type="text" value={addQForm.video_url} onChange={e => setAddQForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
                  {addQForm.video_url && extractYouTubeId(addQForm.video_url) && (
                    <img src={`https://img.youtube.com/vi/${extractYouTubeId(addQForm.video_url)}/mqdefault.jpg`} alt="Video thumbnail" className="add-q-img-preview" />
                  )}
                  <button type="button" className="btn-secondary ml-browse-btn" onClick={() => { setMediaBrowseTarget('video'); setMediaBrowseCallback(() => (url) => { setAddQForm(f => ({ ...f, video_url: url })); }); }}>Browse Library</button>
                </div>
              </div>
              <div className="add-q-field">
                <label>Explanation (optional)</label>
                <textarea rows={2} value={addQForm.explanation} onChange={e => setAddQForm(f => ({ ...f, explanation: e.target.value }))} placeholder="Why is this the correct answer? Shown after the player answers." />
              </div>
              <button className="add-q-submit" onClick={handleAddQuestion} disabled={addQSubmitting}>
                {addQSubmitting ? 'Adding...' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== IMPORT CSV MODAL ===== */}
      {activeModal === 'import' && (
        <div className="cd-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>Import Questions from CSV</h2>
              <button className="cd-modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <div className="cd-modal-body">
              <div className="upload-instructions">
                <p>Upload a CSV file to bulk import questions. Required columns: <code>question_text</code>, <code>correct_answer</code>, <code>incorrect_answer_1</code>, <code>incorrect_answer_2</code>, <code>incorrect_answer_3</code>, <code>category</code>, <code>difficulty</code>. Optional: <code>image_url</code>, <code>video_url</code>, <code>explanation</code></p>
                <button className="btn-secondary" onClick={downloadTemplate}>
                  <DownloadIcon size={14} /> Download CSV Template
                </button>
              </div>
              <div className="file-upload-section">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="file-input" id="csv-upload-modal" />
                <label htmlFor="csv-upload-modal" className="file-upload-label">Choose CSV File</label>
              </div>

              {csvErrors.length > 0 && (
                <div className="csv-errors">
                  <h3>Validation Errors</h3>
                  <ul>{csvErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>
                </div>
              )}

              {csvPreview.length > 0 && (
                <div className="csv-preview">
                  <div className="preview-header">
                    <h3>Preview ({csvPreview.length} of {csvData.length} questions)</h3>
                    {csvErrors.length === 0 && (
                      <button className="btn-primary" onClick={handleBulkImport} disabled={uploading}>
                        {uploading ? 'Importing...' : `Import ${csvData.length} Questions`}
                      </button>
                    )}
                  </div>
                  <div className="preview-table">
                    <table>
                      <thead>
                        <tr><th>#</th><th>Question</th><th>Correct Answer</th><th>Incorrect Answers</th><th>Category</th><th>Difficulty</th></tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((q, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{q.question_text}</td>
                            <td className="correct">{q.correct_answer}</td>
                            <td>{q.incorrect_answers.join(', ')}</td>
                            <td><span className="category-badge">{q.category}</span></td>
                            <td><span className={`difficulty-badge ${q.difficulty}`}>{q.difficulty}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 5 && <p className="preview-note">... and {csvData.length - 5} more questions</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== AI GENERATE MODAL ===== */}
      {activeModal === 'ai' && (
        <div className="cd-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="cd-modal cd-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>AI Question Generator</h2>
              <button className="cd-modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <div className="cd-modal-body">
              <div className="gen-form">
                <div className="gen-form-group">
                  <label>Theme / Topic <span className="gen-required">*</span></label>
                  <input
                    type="text"
                    value={genForm.theme}
                    onChange={e => setGenForm(f => ({ ...f, theme: e.target.value }))}
                    placeholder='e.g. "American Revolution", "Python programming", "90s Hip-Hop"'
                    maxLength={100}
                  />
                </div>
                <div className="gen-form-group">
                  <label>Difficulty</label>
                  <div className="gen-radio-group">
                    {['easy', 'medium', 'hard', 'mixed'].map(d => (
                      <label key={d} className={`gen-radio ${genForm.difficulty === d ? 'active' : ''}`}>
                        <input type="radio" name="gen-diff" value={d} checked={genForm.difficulty === d} onChange={() => setGenForm(f => ({ ...f, difficulty: d }))} />
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="gen-form-group">
                  <label>Number of Questions ({genForm.question_count})</label>
                  <input
                    type="range"
                    min={5}
                    max={25}
                    value={genForm.question_count}
                    onChange={e => setGenForm(f => ({ ...f, question_count: parseInt(e.target.value) }))}
                    className="gen-slider"
                  />
                  <div className="gen-slider-labels"><span>5</span><span>15</span><span>25</span></div>
                </div>
                <div className="gen-form-group">
                  <label>Special Instructions <span className="gen-optional">(optional)</span></label>
                  <textarea
                    value={genForm.special_instructions}
                    onChange={e => setGenForm(f => ({ ...f, special_instructions: e.target.value.slice(0, 200) }))}
                    placeholder='e.g. "Focus on battles" or "Include code snippets"'
                    maxLength={200}
                    rows={2}
                  />
                  <span className="gen-char-count">{genForm.special_instructions.length}/200</span>
                </div>
                <button
                  className="gen-submit-btn"
                  onClick={handleSubmitGenRequest}
                  disabled={genSubmitting || !genForm.theme.trim()}
                >
                  {genSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>

              {genRequests.length > 0 && (
                <div style={{marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
                  <h3 style={{fontSize: '15px', fontWeight: 600, marginBottom: '12px'}}>Request History</h3>
                  <div className="gen-requests-list">
                    {genRequests.map(req => {
                      const statusClass = req.status === 'pending' ? 'gen-status-pending'
                        : req.status === 'approved' ? 'gen-status-generating'
                        : req.status === 'generating' ? 'gen-status-generating'
                        : req.status === 'completed' ? 'gen-status-completed'
                        : req.status === 'failed' ? 'gen-status-failed'
                        : 'gen-status-rejected';
                      const statusLabel = req.status === 'pending' ? 'Pending approval'
                        : (req.status === 'approved' || req.status === 'generating') ? 'Generating...'
                        : req.status === 'completed' ? 'Completed'
                        : req.status === 'failed' ? 'Failed'
                        : 'Rejected';
                      const isReviewing = genReviewId === req.id;
                      const generatedQs = req.generated_questions || [];
                      const acceptedTexts = genAccepted[req.id] || [];
                      return (
                        <div key={req.id} className="gen-request-card">
                          <div className="gen-request-top">
                            <div className="gen-request-info">
                              <span className="gen-request-theme">{req.theme}</span>
                              <div className="gen-request-meta">
                                <span className="gen-tag">{req.question_count} Qs</span>
                                <span className="gen-tag">{req.difficulty}</span>
                                <span className={`gen-status-badge ${statusClass}`}>{statusLabel}</span>
                              </div>
                            </div>
                            <span className="gen-request-date">{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                          {req.special_instructions && (
                            <p className="gen-request-instructions">"{req.special_instructions}"</p>
                          )}
                          {req.status === 'rejected' && req.admin_notes && (
                            <div className="gen-admin-notes">
                              <strong>Admin notes:</strong> {req.admin_notes}
                            </div>
                          )}
                          {req.status === 'failed' && (
                            <div className="gen-admin-notes" style={{borderLeftColor: '#d9534f'}}>
                              <strong>Error:</strong> {req.generation_error || 'Unknown error during generation'}
                              <button
                                className="gen-review-btn"
                                style={{marginTop:'8px', display:'block'}}
                                onClick={() => handleRetryGenRequest(req.id)}
                              >
                                Retry Generation
                              </button>
                            </div>
                          )}
                          {req.status === 'completed' && generatedQs.length > 0 && (() => {
                            const selectableIndices = generatedQs.map((q, i) => ({ q, i })).filter(({ q }) => !acceptedTexts.includes(q.question_text)).map(({ i }) => i);
                            const currentSelected = genSelected[req.id] || new Set(selectableIndices);
                            const selectedCount = [...currentSelected].filter(i => selectableIndices.includes(i)).length;
                            const allSelected = selectedCount === selectableIndices.length && selectableIndices.length > 0;
                            return (
                            <>
                              <button
                                className="gen-review-btn"
                                onClick={() => {
                                  if (!isReviewing && !genSelected[req.id]) {
                                    setGenSelected(prev => ({ ...prev, [req.id]: new Set(selectableIndices) }));
                                  }
                                  setGenReviewId(isReviewing ? null : req.id);
                                }}
                              >
                                {isReviewing ? 'Hide Questions' : `Review Questions (${generatedQs.length})`}
                              </button>
                              {isReviewing && (
                                <div className="gen-review-panel">
                                  {selectableIndices.length > 0 && (
                                    <div className="gen-select-bar">
                                      <button
                                        className="gen-select-toggle"
                                        onClick={() => {
                                          if (allSelected) {
                                            setGenSelected(prev => ({ ...prev, [req.id]: new Set() }));
                                          } else {
                                            setGenSelected(prev => ({ ...prev, [req.id]: new Set(selectableIndices) }));
                                          }
                                        }}
                                      >
                                        {allSelected ? 'Deselect All' : 'Select All'}
                                      </button>
                                      <span className="gen-select-count">{selectedCount} of {selectableIndices.length} selected</span>
                                    </div>
                                  )}
                                  {generatedQs.map((q, qi) => {
                                    const alreadyAdded = acceptedTexts.includes(q.question_text);
                                    const isChecked = currentSelected.has(qi);
                                    return (
                                      <div key={qi} className={`gen-q-card ${alreadyAdded ? 'gen-q-added' : ''}`}>
                                        <div className="gen-q-row">
                                          {!alreadyAdded && (
                                            <input
                                              type="checkbox"
                                              className="gen-q-checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                setGenSelected(prev => {
                                                  const s = new Set(prev[req.id] || selectableIndices);
                                                  if (s.has(qi)) s.delete(qi); else s.add(qi);
                                                  return { ...prev, [req.id]: s };
                                                });
                                              }}
                                            />
                                          )}
                                          <div className="gen-q-content">
                                            <p className="gen-q-text">{q.question_text}</p>
                                            <div className="gen-q-answers">
                                              <span className="gen-q-correct">{q.correct_answer}</span>
                                              {q.incorrect_answers?.map((a, ai) => (
                                                <span key={ai} className="gen-q-wrong">{a}</span>
                                              ))}
                                            </div>
                                            {q.explanation && (
                                              <div style={{background:'#E8F4FD', border:'1px solid #B8D4E8', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', color:'#333', marginTop:'6px', lineHeight:'1.45'}}>
                                                {q.explanation}
                                              </div>
                                            )}
                                            <div className="gen-q-meta">
                                              <span className="gen-tag">{q.category}</span>
                                              <span className="gen-tag">{q.difficulty}</span>
                                            </div>
                                            {alreadyAdded && <span className="gen-q-added-label">Added</span>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {selectedCount > 0 && (
                                    <button
                                      className="gen-bulk-add-btn"
                                      onClick={() => handleAddSelectedQuestions(req)}
                                    >
                                      Add Selected to Question Bank ({selectedCount})
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="modal-overlay" onClick={() => setShowVersionHistory(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Version History</h2>
              <button className="close-modal" onClick={() => setShowVersionHistory(null)}>×</button>
            </div>
            <div className="modal-body">
              {versionHistory.length === 0 ? (
                <p className="empty-message">No version history available for this question</p>
              ) : (
                <div className="version-history-list">
                  {versionHistory.map((version, index) => (
                    <div key={index} className="version-entry">
                      <div className="version-header">
                        <span className="version-number">Version {version.version_number}</span>
                        <span className="version-date">{new Date(version.changed_at).toLocaleString()}</span>
                      </div>
                      <div className="version-change-type">
                        {version.change_type === 'tag_added' && `Tag added: ${version.changes.tag}`}
                        {version.change_type === 'tag_removed' && `Tag removed: ${version.changes.tag}`}
                        {version.change_type === 'question_updated' && 'Question updated'}
                        {version.change_type === 'version_restored' && `Restored from version ${version.changes.restored_from}`}
                      </div>
                      {version.question_snapshot && (
                        <div className="version-snapshot">
                          <div className="snapshot-question">{version.question_snapshot.question_text}</div>
                          <div className="snapshot-meta">
                            Category: {version.question_snapshot.category} | Difficulty: {version.question_snapshot.difficulty}
                          </div>
                          <button className="btn-secondary" onClick={() => restoreVersion(showVersionHistory, version.question_snapshot)}>
                            Restore This Version
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== BROWSE MEDIA LIBRARY MODAL ===== */}
      {mediaBrowseTarget && (
        <div className="cd-modal-overlay" onClick={() => { setMediaBrowseTarget(null); setMediaBrowseCallback(null); }}>
          <div className="cd-modal ml-browse-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>Browse Media Library — {mediaBrowseTarget === 'image' ? 'Images' : 'Videos'}</h2>
              <button className="cd-modal-close" onClick={() => { setMediaBrowseTarget(null); setMediaBrowseCallback(null); }}>×</button>
            </div>
            <div className="cd-modal-body">
              {mediaLibrary.filter(m => mediaBrowseTarget === 'image' ? m.file_type === 'image' : m.file_type === 'video').length === 0 ? (
                <p className="empty-message">No {mediaBrowseTarget === 'image' ? 'images' : 'videos'} in your library yet. Upload from the Media tab first.</p>
              ) : (
                <div className="ml-browse-grid">
                  {mediaLibrary.filter(m => mediaBrowseTarget === 'image' ? m.file_type === 'image' : m.file_type === 'video').map(item => {
                    const isVideo = item.file_type === 'video';
                    const ytId = isVideo ? extractYouTubeId(item.file_url) : null;
                    return (
                      <div key={item.id} className="ml-browse-card" onClick={() => {
                        if (mediaBrowseCallback) mediaBrowseCallback(item.file_url);
                        setMediaBrowseTarget(null);
                        setMediaBrowseCallback(null);
                      }}>
                        <div className="ml-card-thumb">
                          {isVideo && ytId ? (
                            <>
                              <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={item.filename} />
                              <div className="ml-card-play">▶</div>
                            </>
                          ) : (
                            <img src={item.file_url} alt={item.filename} />
                          )}
                        </div>
                        <div className="ml-browse-card-name" title={item.filename}>{item.filename}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommissionerDashboard;
