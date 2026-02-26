import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { applyTheme, getSavedTheme } from '../utils/theme';
import './Settings.css';

function Settings({ user, onBack, onNavigate }) {
  const [profile, setProfile] = useState({ username: '', profile_visibility: true, leaderboard_visibility: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [darkMode, setDarkMode] = useState(getSavedTheme() === 'dark');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      if (data) setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err.message);
      setMessage('Failed to load profile settings.');
    }
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

  const handleThemeToggle = async () => {
    const newTheme = darkMode ? 'light' : 'dark';
    setDarkMode(!darkMode);
    applyTheme(newTheme);
    const { error } = await supabase.from('profiles').update({ theme: newTheme }).eq('id', user.id);
    if (error) console.error('Failed to save theme preference:', error.message);
  };

  const handleChangePassword = async () => {
    setPasswordMessage('');
    if (newPassword.length < 8) { setPasswordMessage('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage('Passwords do not match.'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPasswordMessage('Error: ' + error.message); return; }
    setPasswordMessage('Password updated successfully!');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="settings">
      <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
      <h1>Settings</h1>
      {message && <div role="alert" className={message.includes('Error') ? 'error-message' : 'success-message'}>{message}</div>}
      <div className="settings-section">
        <h2>Profile</h2>
        <div className="form-group">
          <label htmlFor="settings-username">Username</label>
          <input id="settings-username" type="text" value={profile.username || ''} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
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
      <div className="settings-section">
        <h2>Theme</h2>
        <div className="checkbox-group">
          <label>
            <input type="checkbox" checked={darkMode} onChange={handleThemeToggle} />
            <span>Dark Mode</span>
          </label>
        </div>
      </div>
      <button className="save-btn" onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
      <div className="settings-section">
        <h2>Change Password</h2>
        {passwordMessage && <div role="alert" className={passwordMessage.includes('Error') ? 'error-message' : 'success-message'}>{passwordMessage}</div>}
        <div className="form-group">
          <label htmlFor="settings-new-password">New Password</label>
          <input id="settings-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
        </div>
        <div className="form-group">
          <label htmlFor="settings-confirm-password">Confirm New Password</label>
          <input id="settings-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button className="save-btn" onClick={handleChangePassword} style={{ marginTop: '8px' }}>Update Password</button>
      </div>
      <div className="settings-section">
        <h2>Legal</h2>
        <div className="legal-links">
          <button className="legal-link-btn" onClick={() => onNavigate && onNavigate('terms')}>Terms of Service</button>
          <button className="legal-link-btn" onClick={() => onNavigate && onNavigate('privacy')}>Privacy Policy</button>
        </div>
      </div>
      <div className="danger-zone">
        <h2>Account</h2>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}

export default Settings;
