import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Settings.css';

function Settings({ user, onBack }) {
  const [profile, setProfile] = useState({ username: '', profile_visibility: true, leaderboard_visibility: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase.from('profiles').update({ username: profile.username, profile_visibility: profile.profile_visibility, leaderboard_visibility: profile.leaderboard_visibility }).eq('id', user.id);
      if (error) throw error;
      setMessage('Settings saved successfully!');
    } catch (error) {
      setMessage('Error saving settings: ' + error.message);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="settings">
      <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
      <h1>Settings</h1>
      {message && <div className={message.includes('Error') ? 'error-message' : 'success-message'}>{message}</div>}
      <div className="settings-section">
        <h2>Profile</h2>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={profile.username || ''} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
        </div>
      </div>
      <div className="settings-section">
        <h2>Privacy</h2>
        <div className="checkbox-group">
          <label><input type="checkbox" checked={profile.profile_visibility} onChange={(e) => setProfile({ ...profile, profile_visibility: e.target.checked })} /><span>Show my profile to other users</span></label>
        </div>
        <div className="checkbox-group">
          <label><input type="checkbox" checked={profile.leaderboard_visibility} onChange={(e) => setProfile({ ...profile, leaderboard_visibility: e.target.checked })} /><span>Show me on leaderboards</span></label>
        </div>
      </div>
      <button className="save-btn" onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
      <div className="danger-zone">
        <h2>Account</h2>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}

export default Settings;
