import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Papa from 'papaparse';
import './CommissionerDashboard.css';

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
    max_members: 50
  });
  const [csvData, setCsvData] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [importHistory, setImportHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showBulkTagging, setShowBulkTagging] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [username, setUsername] = useState('');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    fetchCommissionerData();
    fetchTemplates();
    fetchAnalytics();
  }, [communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCommissionerData = async () => {
    try {
      const { data: communityData } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();

      if (communityData.commissioner_id !== currentUserId) {
        alert('You are not authorized to access this page');
        onBack();
        return;
      }

      setCommunity(communityData);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();
      setUsername(profileData?.username || '');

      setEditForm({
        name: communityData.name,
        season_start: communityData.season_start?.split('T')[0] || '',
        season_end: communityData.season_end?.split('T')[0] || '',
        max_members: communityData.settings?.max_members || 50
      });

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
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          name: editForm.name,
          season_start: editForm.season_start,
          season_end: editForm.season_end,
          settings: { max_members: editForm.max_members }
        })
        .eq('id', communityId);

      if (error) {
        alert('Failed to update settings: ' + error.message);
      } else {
        alert('Settings updated successfully!');
        setEditMode(false);
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to update settings');
    }
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
        alert('Failed to remove member: ' + error.message);
      } else {
        alert(`${username} has been removed from the community`);
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const { error } = await supabase
        .from('community_questions')
        .delete()
        .eq('id', questionId);

      if (error) {
        alert('Failed to delete question: ' + error.message);
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
      alert('Please upload a CSV file');
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => { validateAndPreviewCSV(results.data); },
      error: (error) => { alert('Error parsing CSV: ' + error.message); }
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
      if (!row.incorrect_answer_1 || !row.incorrect_answer_2 || !row.incorrect_answer_3) rowErrors.push(`Row ${index + 1}: Missing incorrect answers (need 3)`);
      if (!row.category?.trim()) rowErrors.push(`Row ${index + 1}: Missing category`);
      const validDifficulties = ['easy', 'medium', 'hard'];
      if (!row.difficulty || !validDifficulties.includes(row.difficulty.toLowerCase())) rowErrors.push(`Row ${index + 1}: Invalid difficulty (must be easy, medium, or hard)`);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validQuestions.push({
          question_text: row.question_text.trim(),
          correct_answer: row.correct_answer.trim(),
          incorrect_answers: [row.incorrect_answer_1.trim(), row.incorrect_answer_2.trim(), row.incorrect_answer_3.trim()],
          category: row.category.trim(),
          difficulty: row.difficulty.toLowerCase().trim()
        });
      }
    });

    setCsvErrors(errors);
    setCsvData(validQuestions);
    setCsvPreview(validQuestions.slice(0, 5));
  };

  const handleBulkImport = async () => {
    if (csvData.length === 0) { alert('No valid questions to import'); return; }
    if (!window.confirm(`Are you sure you want to import ${csvData.length} questions?`)) return;

    setUploading(true);
    try {
      const importTimestamp = new Date().toISOString();
      const questionsToInsert = csvData.map(q => ({
        community_id: communityId,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers,
        category: q.category,
        difficulty: q.difficulty,
        created_at: importTimestamp,
        imported_by: currentUserId,
        imported_at: importTimestamp
      }));

      const { error } = await supabase.from('community_questions').insert(questionsToInsert);

      if (error) {
        alert('Failed to import questions: ' + error.message);
      } else {
        alert(`Successfully imported ${csvData.length} questions!`);
        const historyEntry = { timestamp: importTimestamp, count: csvData.length, user: currentUserId };
        setImportHistory(prev => [historyEntry, ...prev].slice(0, 10));
        setCsvData([]);
        setCsvPreview([]);
        setCsvErrors([]);
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error importing questions:', error);
      alert('Failed to import questions');
    }
    setUploading(false);
  };

  const downloadTemplate = () => {
    const template = `question_text,correct_answer,incorrect_answer_1,incorrect_answer_2,incorrect_answer_3,category,difficulty
"What is the capital of France?","Paris","London","Berlin","Madrid","Geography","easy"
"Who painted the Mona Lisa?","Leonardo da Vinci","Michelangelo","Raphael","Donatello","Art","medium"
"What is the chemical symbol for gold?","Au","Ag","Fe","Cu","Science","easy"`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (questions.length === 0) { alert('No questions to export'); return; }
    const csvRows = ['question_text,correct_answer,incorrect_answer_1,incorrect_answer_2,incorrect_answer_3,category,difficulty'];
    questions.forEach(q => {
      const row = [
        `"${q.question_text.replace(/"/g, '""')}"`,
        `"${q.correct_answer.replace(/"/g, '""')}"`,
        `"${q.incorrect_answers[0]?.replace(/"/g, '""') || ''}"`,
        `"${q.incorrect_answers[1]?.replace(/"/g, '""') || ''}"`,
        `"${q.incorrect_answers[2]?.replace(/"/g, '""') || ''}"`,
        `"${q.category}"`,
        `"${q.difficulty}"`
      ];
      csvRows.push(row.join(','));
    });
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${community.name}_questions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) { alert('No questions selected'); return; }
    if (!window.confirm(`Are you sure you want to delete ${selectedQuestions.length} questions?`)) return;
    try {
      const { error } = await supabase.from('community_questions').delete().in('id', selectedQuestions);
      if (error) {
        alert('Failed to delete questions: ' + error.message);
      } else {
        setSelectedQuestions([]);
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
    return categoryMatch && difficultyMatch && searchMatch && tagMatch;
  });

  const categories = [...new Set(questions.map(q => q.category))];
  const allTags = [...new Set(questions.flatMap(q => q.tags || []))];

  const handleAddTag = async (questionId, tag) => {
    if (!tag.trim()) return;
    const question = questions.find(q => q.id === questionId);
    const currentTags = question.tags || [];
    if (currentTags.includes(tag.trim())) { alert('Tag already exists on this question'); return; }
    const updatedTags = [...currentTags, tag.trim()];
    await createVersionHistory(questionId, 'tag_added', { tag: tag.trim() });
    const { error } = await supabase.from('community_questions').update({ tags: updatedTags }).eq('id', questionId);
    if (error) { alert('Failed to add tag: ' + error.message); } else { setNewTag(''); fetchCommissionerData(); }
  };

  const handleRemoveTag = async (questionId, tag) => {
    const question = questions.find(q => q.id === questionId);
    const updatedTags = (question.tags || []).filter(t => t !== tag);
    await createVersionHistory(questionId, 'tag_removed', { tag });
    const { error } = await supabase.from('community_questions').update({ tags: updatedTags }).eq('id', questionId);
    if (error) { alert('Failed to remove tag: ' + error.message); } else { fetchCommissionerData(); }
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
    await supabase.from('community_questions').update({ version_history: updatedHistory, version_number: historyEntry.version_number }).eq('id', questionId);
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
    }).eq('id', questionId);
    if (error) { alert('Failed to restore version: ' + error.message); } else { setShowVersionHistory(null); fetchCommissionerData(); }
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
      if (error) { alert('Failed to save template: ' + error.message); } else { alert('Template saved!'); fetchTemplates(); }
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
      if (error) { alert('Failed to create question: ' + error.message); } else { fetchCommissionerData(); }
    } catch (error) {
      console.error('Error creating from template:', error);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      const { error } = await supabase.from('question_templates').delete().eq('id', templateId);
      if (error) { alert('Failed to delete template: ' + error.message); } else { fetchTemplates(); }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleBulkAddTag = async () => {
    if (selectedQuestions.length === 0) { alert('No questions selected'); return; }
    if (!bulkTagInput.trim()) { alert('Please enter a tag name'); return; }
    const tag = bulkTagInput.trim();
    try {
      for (const questionId of selectedQuestions) {
        const question = questions.find(q => q.id === questionId);
        const currentTags = question.tags || [];
        if (!currentTags.includes(tag)) {
          await supabase.from('community_questions').update({ tags: [...currentTags, tag] }).eq('id', questionId);
          await createVersionHistory(questionId, 'tag_added', { tag, bulk: true });
        }
      }
      setBulkTagInput('');
      setShowBulkTagging(false);
      fetchCommissionerData();
    } catch (error) {
      console.error('Error adding bulk tags:', error);
    }
  };

  const handleBulkRemoveTag = async (tag) => {
    if (selectedQuestions.length === 0) { alert('No questions selected'); return; }
    if (!window.confirm(`Remove tag "${tag}" from ${selectedQuestions.length} selected questions?`)) return;
    try {
      for (const questionId of selectedQuestions) {
        const question = questions.find(q => q.id === questionId);
        const updatedTags = (question.tags || []).filter(t => t !== tag);
        await supabase.from('community_questions').update({ tags: updatedTags }).eq('id', questionId);
        await createVersionHistory(questionId, 'tag_removed', { tag, bulk: true });
      }
      fetchCommissionerData();
    } catch (error) {
      console.error('Error removing bulk tags:', error);
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
              questions: `Questions (${questions.length})`,
              members: `Members (${members.length})`,
              settings: 'Settings',
              analytics: 'Analytics'
            }[activeTab]}
          </span>
          <span className={`nav-chevron ${navOpen ? 'open' : ''}`}>▾</span>
        </button>

        {navOpen && (
          <>
            <div className="nav-backdrop" onClick={() => setNavOpen(false)} />
            <div className="nav-dropdown-menu">
              {[
                { id: 'overview', label: 'Overview', icon: '🏠' },
                { id: 'questions', label: `Questions (${questions.length})`, icon: '❓' },
                { id: 'members', label: `Members (${members.length})`, icon: '👥' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
                { id: 'analytics', label: 'Analytics', icon: '📊' }
              ].map(tab => (
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
                <div className="stat-icon">🎮</div>
                <div className="stat-number">{stats.totalGames}</div>
                <div className="stat-label">Total Games</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-number">{members.length}</div>
                <div className="stat-label">Total Members</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-number">{stats.activeMembers}</div>
                <div className="stat-label">Active Players</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">❓</div>
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
                      <span className="history-icon">📤</span>
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
                    <span className="qa-icon">❓</span>
                    <span>Manage Questions</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => setActiveTab('members')}>
                    <span className="qa-icon">👥</span>
                    <span>Manage Members</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => setActiveTab('analytics')}>
                    <span className="qa-icon">📊</span>
                    <span>View Analytics</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => setActiveTab('settings')}>
                    <span className="qa-icon">⚙️</span>
                    <span>Community Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div className="tab-pane">
            {/* Bulk Upload */}
            <div className="commissioner-section">
              <h2>Bulk Question Upload</h2>
              <div className="upload-instructions">
                <p>Upload a CSV file to bulk import questions. Required columns: <code>question_text</code>, <code>correct_answer</code>, <code>incorrect_answer_1</code>, <code>incorrect_answer_2</code>, <code>incorrect_answer_3</code>, <code>category</code>, <code>difficulty</code></p>
                <button className="btn-secondary" onClick={downloadTemplate}>
                  📥 Download CSV Template
                </button>
              </div>
              <div className="file-upload-section">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="file-input" id="csv-upload" />
                <label htmlFor="csv-upload" className="file-upload-label">Choose CSV File</label>
              </div>

              {csvErrors.length > 0 && (
                <div className="csv-errors">
                  <h3>⚠️ Validation Errors</h3>
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

            {/* Manage Questions */}
            <div className="commissioner-section">
              <div className="section-header">
                <h2>Manage Questions ({questions.length})</h2>
                <div className="section-actions">
                  <button className="btn-secondary" onClick={exportToCSV} disabled={questions.length === 0}>
                    📥 Export CSV
                  </button>
                  {selectedQuestions.length > 0 && (
                    <button className="btn-danger" onClick={handleBulkDelete}>
                      Delete Selected ({selectedQuestions.length})
                    </button>
                  )}
                </div>
              </div>

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

                  <div className="bulk-controls">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                        onChange={toggleSelectAll}
                      />
                      Select All ({filteredQuestions.length})
                    </label>
                    {selectedQuestions.length > 0 && (
                      <button className="btn-secondary" onClick={() => setShowBulkTagging(!showBulkTagging)}>
                        🏷️ Bulk Tag Operations
                      </button>
                    )}
                  </div>

                  {showBulkTagging && selectedQuestions.length > 0 && (
                    <div className="bulk-tagging-panel">
                      <h3>Bulk Tag Operations ({selectedQuestions.length} questions selected)</h3>
                      <div className="bulk-tag-add">
                        <input
                          type="text"
                          className="bulk-tag-input"
                          placeholder="Enter tag name..."
                          value={bulkTagInput}
                          onChange={(e) => setBulkTagInput(e.target.value)}
                          onKeyPress={(e) => { if (e.key === 'Enter') handleBulkAddTag(); }}
                        />
                        <button className="btn-primary" onClick={handleBulkAddTag}>Add Tag to Selected</button>
                      </div>
                      {allTags.length > 0 && (
                        <div className="bulk-tag-remove">
                          <p>Remove existing tags from selected questions:</p>
                          <div className="bulk-tag-list">
                            {allTags.map(tag => (
                              <button key={tag} className="bulk-tag-remove-btn" onClick={() => handleBulkRemoveTag(tag)}>
                                {tag} ×
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {questions.length === 0 ? (
                <p className="empty-message">No questions in the question bank. Upload a CSV to get started.</p>
              ) : (
                <div className="questions-list">
                  {filteredQuestions.map(question => (
                    <div key={question.id} className={`question-card ${selectedQuestions.includes(question.id) ? 'selected' : ''}`}>
                      <div className="question-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(question.id)}
                          onChange={() => toggleQuestionSelection(question.id)}
                        />
                      </div>
                      <div className="question-content">
                        <div className="question-header">
                          <span className="category-badge">{question.category}</span>
                          <span className={`difficulty-badge ${question.difficulty}`}>{question.difficulty}</span>
                          {question.version_number > 0 && <span className="version-badge">v{question.version_number}</span>}
                          {question.imported_at && <span className="import-badge">Imported</span>}
                        </div>
                        <div className="question-text">{question.question_text}</div>
                        <div className="answers-preview">
                          <div className="answer correct">✓ {question.correct_answer}</div>
                          {question.incorrect_answers?.slice(0, 2).map((ans, i) => (
                            <div key={i} className="answer incorrect">✗ {ans}</div>
                          ))}
                          {question.incorrect_answers?.length > 2 && (
                            <div className="answer-more">+{question.incorrect_answers.length - 2} more</div>
                          )}
                        </div>
                        <div className="question-tags">
                          {question.tags && question.tags.length > 0 && (
                            <div className="tags-list">
                              {question.tags.map(tag => (
                                <span key={tag} className="question-tag">
                                  {tag}
                                  <button className="remove-tag" onClick={() => handleRemoveTag(question.id, tag)}>×</button>
                                </span>
                              ))}
                            </div>
                          )}
                          {editingQuestionId === question.id ? (
                            <div className="tag-input-wrapper">
                              <input
                                type="text"
                                className="tag-input"
                                placeholder="Add tag..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter') handleAddTag(question.id, newTag); }}
                              />
                              <button className="add-tag-btn" onClick={() => handleAddTag(question.id, newTag)}>Add</button>
                              <button className="cancel-tag-btn" onClick={() => { setEditingQuestionId(null); setNewTag(''); }}>Cancel</button>
                            </div>
                          ) : (
                            <button className="add-tag-trigger" onClick={() => setEditingQuestionId(question.id)}>+ Add Tag</button>
                          )}
                        </div>
                        <div className="question-footer">
                          <span className="created-date">Added {new Date(question.created_at).toLocaleDateString()}</span>
                          <div className="question-actions-footer">
                            <button className="btn-icon" onClick={() => saveAsTemplate(question.id)} title="Save as template">📋 Template</button>
                            <button className="btn-icon" onClick={() => loadVersionHistory(question.id)} title="Version history">📜 History</button>
                            <button className="btn-danger-sm" onClick={() => handleDeleteQuestion(question.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Templates */}
            <div className="commissioner-section">
              <h2>Question Templates</h2>
              <p className="section-desc">Save frequently used question structures as templates for quick reuse. Click "Template" on any question to save it.</p>
              {templates.length === 0 ? (
                <p className="empty-message">No templates saved yet.</p>
              ) : (
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
              )}
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="tab-pane">
            <div className="commissioner-section">
              <h2>Manage Members ({members.length})</h2>
              {members.length === 0 ? (
                <p className="empty-message">No members yet</p>
              ) : (
                <div className="members-table">
                  <table>
                    <thead>
                      <tr><th>Username</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {members.map(member => (
                        <tr key={member.user_id}>
                          <td>
                            {member.profiles?.username}
                            {member.user_id === community.commissioner_id && (
                              <span className="commissioner-tag">Commissioner</span>
                            )}
                          </td>
                          <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                          <td>
                            {member.user_id !== community.commissioner_id && (
                              <button className="btn-danger-sm" onClick={() => handleRemoveMember(member.user_id, member.profiles?.username)}>
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
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
                    <span className="setting-value code">{community.invite_code}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
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
                            <div className="bar-fill" style={{ width: `${(count / questions.length) * 100}%` }} />
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
                              <div className="bar-fill tag" style={{ width: `${(count / questions.length) * 100}%` }} />
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
    </div>
  );
}

export default CommissionerDashboard;
