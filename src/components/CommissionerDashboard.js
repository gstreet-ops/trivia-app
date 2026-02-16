import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CommissionerDashboard.css';

function CommissionerDashboard({ communityId, currentUserId, onBack }) {
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({ totalGames: 0, activeMembers: 0, questionBankSize: 0 });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    season_start: '',
    season_end: '',
    max_members: 50
  });

  useEffect(() => {
    fetchCommissionerData();
  }, [communityId]);

  const fetchCommissionerData = async () => {
    try {
      // Fetch community details
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
      setEditForm({
        name: communityData.name,
        season_start: communityData.season_start?.split('T')[0] || '',
        season_end: communityData.season_end?.split('T')[0] || '',
        max_members: communityData.settings?.max_members || 50
      });

      // Fetch members with their profiles
      const { data: membersData } = await supabase
        .from('community_members')
        .select('*, profiles(username)')
        .eq('community_id', communityId)
        .order('joined_at', { ascending: false });
      setMembers(membersData || []);

      // Fetch community questions
      const { data: questionsData } = await supabase
        .from('community_questions')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      setQuestions(questionsData || []);

      // Calculate stats
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
    if (!window.confirm(`Are you sure you want to remove ${username} from this community?`)) {
      return;
    }

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
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('community_questions')
        .delete()
        .eq('id', questionId);

      if (error) {
        alert('Failed to delete question: ' + error.message);
      } else {
        alert('Question deleted successfully');
        fetchCommissionerData();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  if (loading) {
    return (
      <div className="commissioner-dashboard">
        <button className="back-btn" onClick={onBack}>← Back to Community</button>
        <h1>Commissioner Dashboard</h1>
        <p className="loading">Loading...</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="commissioner-dashboard">
        <button className="back-btn" onClick={onBack}>← Back to Community</button>
        <h1>Commissioner Dashboard</h1>
        <p>Community not found</p>
      </div>
    );
  }

  return (
    <div className="commissioner-dashboard">
      <button className="back-btn" onClick={onBack}>← Back to Community</button>

      <div className="dashboard-header">
        <h1>Commissioner Dashboard</h1>
        <span className="community-name">{community.name}</span>
      </div>

      {/* Stats Overview */}
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

      {/* Community Settings */}
      <div className="commissioner-section">
        <div className="section-header">
          <h2>⚙️ Community Settings</h2>
          {!editMode && (
            <button className="edit-btn" onClick={() => setEditMode(true)}>
              Edit Settings
            </button>
          )}
        </div>

        {editMode ? (
          <div className="settings-edit-form">
            <div className="form-group">
              <label>Community Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Community Name"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Season Start Date</label>
                <input
                  type="date"
                  value={editForm.season_start}
                  onChange={(e) => setEditForm({ ...editForm, season_start: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Season End Date</label>
                <input
                  type="date"
                  value={editForm.season_end}
                  onChange={(e) => setEditForm({ ...editForm, season_end: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Max Members</label>
              <input
                type="number"
                value={editForm.max_members}
                onChange={(e) => setEditForm({ ...editForm, max_members: parseInt(e.target.value) })}
                min="1"
                max="200"
              />
            </div>
            <div className="form-actions">
              <button className="save-btn" onClick={handleSaveSettings}>Save Changes</button>
              <button className="cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="settings-display">
            <div className="setting-item">
              <span className="setting-label">Community Name:</span>
              <span className="setting-value">{community.name}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Season:</span>
              <span className="setting-value">
                {new Date(community.season_start).toLocaleDateString()} - {new Date(community.season_end).toLocaleDateString()}
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Max Members:</span>
              <span className="setting-value">{community.settings?.max_members || 50}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Invite Code:</span>
              <span className="setting-value code">{community.invite_code}</span>
            </div>
          </div>
        )}
      </div>

      {/* Members Management */}
      <div className="commissioner-section">
        <h2>👥 Manage Members ({members.length})</h2>
        {members.length === 0 ? (
          <p className="empty-message">No members yet</p>
        ) : (
          <div className="members-table">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
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
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveMember(member.user_id, member.profiles?.username)}
                        >
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

      {/* Questions Management */}
      <div className="commissioner-section">
        <h2>❓ Manage Questions ({questions.length})</h2>
        {questions.length === 0 ? (
          <p className="empty-message">No questions in the question bank</p>
        ) : (
          <div className="questions-list">
            {questions.map(question => (
              <div key={question.id} className="question-card">
                <div className="question-header">
                  <span className="category-badge">{question.category}</span>
                  <span className="difficulty-badge">{question.difficulty}</span>
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
                <div className="question-footer">
                  <span className="created-date">
                    Added {new Date(question.created_at).toLocaleDateString()}
                  </span>
                  <button
                    className="delete-question-btn"
                    onClick={() => handleDeleteQuestion(question.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommissionerDashboard;
