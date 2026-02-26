import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { applyTheme, getSavedTheme } from './utils/theme';
import './App.css';
import StartScreen from './components/StartScreen';
import Dashboard from './components/Dashboard';
import QuizSourceSelector from './components/QuizSourceSelector';
import QuizScreen from './components/QuizScreen';
import GameReview from './components/GameReview';
import Settings from './components/Settings';
import CommunityFeed from './components/CommunityFeed';
import UserProfile from './components/UserProfile';
import AdminDashboard from './components/AdminDashboard';
import QuestionCreator from './components/QuestionCreator';
import CommunitiesList from './components/CommunitiesList';
import CommunityDetail from './components/CommunityDetail';
import CommissionerDashboard from './components/CommissionerDashboard';
import CommunityMarketplace from './components/CommunityMarketplace';
import HelpCenter from './components/HelpCenter';
import MyStats from './components/MyStats';
import MultiplayerLobby from './components/MultiplayerLobby';
import NotificationBell from './components/NotificationBell';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import { ChartIcon, BoltIcon, TrophyIcon, HelpIcon, SettingsIcon, ShieldIcon, MoonIcon, SunIcon, ChevronDownIcon, CheckIcon } from './components/Icons';
import { isPlatformAdmin, getPlatformRole } from './utils/permissions';

const KNOWN_SCREENS = new Set([
  'dashboard', 'settings', 'help', 'admin', 'myStats', 'communities',
  'community', 'createQuestion', 'quizConfig', 'quiz',
  'review', 'communityDetail', 'commissionerDashboard', 'userProfile',
  'marketplace', 'multiplayer', 'resetPassword', 'terms', 'privacy'
]);

function parseHash(hash) {
  const stripped = hash.replace(/^#\/?/, '');
  if (!stripped) return { screen: 'dashboard', param: null };
  const parts = stripped.split('/');
  const screen = parts[0];
  const param = parts[1] || null;
  if (!KNOWN_SCREENS.has(screen)) return { screen: 'dashboard', param: null };
  return { screen, param };
}

function ResetPasswordScreen({ onDone }) {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setMessage('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setMessage('Passwords do not match.'); return; }
    setSaving(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setMessage('Error: ' + error.message); setSaving(false); return; }
    setMessage('Password updated successfully!');
    setTimeout(onDone, 1500);
  };

  const containerStyle = { maxWidth: '400px', margin: '60px auto', padding: '32px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' };
  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' };
  const btnStyle = { width: '100%', padding: '12px', background: '#041E42', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', marginTop: '8px' };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', color: '#041E42', marginBottom: '20px' }}>Set New Password</h2>
      {message && <div style={{ padding: '10px', marginBottom: '12px', borderRadius: '6px', background: message.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: message.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.9rem' }}>{message}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#333' }}>New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#333' }}>Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle} />
        </div>
        <button type="submit" disabled={saving} style={btnStyle}>{saving ? 'Updating...' : 'Update Password'}</button>
      </form>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('start');
  const [quizConfig, setQuizConfig] = useState(null);
  const [viewGameId, setViewGameId] = useState(null);
  const [viewUserId, setViewUserId] = useState(null);
  const [viewUsername, setViewUsername] = useState(null);
  const [viewCommunityId, setViewCommunityId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [appUsername, setAppUsername] = useState('');
  const [appCommunityName, setAppCommunityName] = useState('');
  const [userProfileReturn, setUserProfileReturn] = useState('community');
  const [appIsAdmin, setAppIsAdmin] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [userCommunities, setUserCommunities] = useState([]);
  const [activeCommunityId, setActiveCommunityId] = useState(() => localStorage.getItem('activeCommunityId'));
  const [communityDropdownOpen, setCommunityDropdownOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getSavedTheme);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Apply saved theme on mount
  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);

  // PWA install prompt
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const handler = (e) => {
      e.preventDefault();
      if (!dismissed) {
        setInstallPrompt(e);
        setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
    // Persist to profile if logged in
    if (session?.user?.id) {
      supabase.from('profiles').update({ theme: newTheme }).eq('id', session.user.id).then(({ error }) => {
        if (error) console.error('Failed to save theme preference:', error.message);
      });
    }
  }, [currentTheme, session]);

  const navigateTo = useCallback((screenName, params = {}) => {
    if (params.gameId != null) setViewGameId(params.gameId);
    if (params.communityId != null) setViewCommunityId(params.communityId);
    if (params.communityName != null) setAppCommunityName(params.communityName);
    if (params.userId != null) setViewUserId(params.userId);
    if (params.username != null) setViewUsername(params.username);
    if (params.returnScreen != null) setUserProfileReturn(params.returnScreen);
    if (params.quizConfig != null) setQuizConfig(params.quizConfig);

    // Build hash: screen + optional ID param
    let hash = screenName;
    if (screenName === 'review' && (params.gameId != null)) hash = `review/${params.gameId}`;
    else if (screenName === 'communityDetail' && (params.communityId != null)) hash = `communityDetail/${params.communityId}`;
    else if (screenName === 'commissionerDashboard' && (params.communityId != null)) hash = `commissionerDashboard/${params.communityId}`;
    else if (screenName === 'userProfile' && (params.userId != null)) hash = `userProfile/${params.userId}`;

    window.location.hash = hash;
    setScreen(screenName);
  }, []);

  const syncFromHash = useCallback(() => {
    const { screen: hashScreen, param } = parseHash(window.location.hash);

    // Quiz config and multiplayer lobby can't be restored on refresh — redirect to dashboard
    if (hashScreen === 'quiz' || hashScreen === 'multiplayer') {
      window.location.hash = 'dashboard';
      setScreen('dashboard');
      return;
    }

    if (hashScreen === 'review' && param) setViewGameId(param);
    if ((hashScreen === 'communityDetail' || hashScreen === 'commissionerDashboard') && param) {
      setViewCommunityId(param);
      setActiveCommunityId(param);
      localStorage.setItem('activeCommunityId', String(param));
    }
    if (hashScreen === 'userProfile' && param) setViewUserId(param);

    setScreen(hashScreen);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);

      if (_event === 'PASSWORD_RECOVERY') {
        navigateTo('resetPassword');
        return;
      }

      if (_event === 'TOKEN_REFRESHED') {
        // Don't re-navigate on token refresh
        return;
      }

      // Clear stale state on sign-out
      if (!session) {
        setUserRole('user');
        setAppIsAdmin(false);
        setAppUsername('');
        setViewCommunityId(null);
        setAppCommunityName('');
        setUserCommunities([]);
        setActiveCommunityId(null);
        localStorage.removeItem('activeCommunityId');
        return;
      }

      if (session) {
        if (window.location.hash && window.location.hash !== '#') {
          syncFromHash();
        } else {
          navigateTo('dashboard');
        }
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigateTo, syncFromHash]);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => { syncFromHash(); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [syncFromHash]);

  // Close community dropdown on Escape
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') setCommunityDropdownOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('role, super_admin, platform_role, username, theme').eq('id', userId).single();
      if (error) throw error;
      const resolvedRole = getPlatformRole(data);
      setUserRole(resolvedRole);
      setAppIsAdmin(isPlatformAdmin(data));
      setAppUsername(data?.username || '');

      // Apply theme from profile (cross-device persistence)
      if (data?.theme) {
        setCurrentTheme(data.theme);
        applyTheme(data.theme);
      }

      // Pre-load all community memberships
      const { data: memberships } = await supabase
        .from('community_members')
        .select('communities(id, name, commissioner_id)')
        .eq('user_id', userId);
      const communities = (memberships || []).map(m => m.communities).filter(Boolean);
      setUserCommunities(communities);

      if (communities.length > 0) {
        const savedId = localStorage.getItem('activeCommunityId');
        const savedValid = savedId ? communities.find(c => String(c.id) === String(savedId)) : null;
        const active = savedValid || communities[0];
        setActiveCommunityId(active.id);
        setAppCommunityName(active.name);
        localStorage.setItem('activeCommunityId', String(active.id));
      } else {
        setActiveCommunityId(null);
        setAppCommunityName('');
        localStorage.removeItem('activeCommunityId');
      }
    } catch (err) {
      console.error('fetchUserRole failed:', err);
      setUserRole('user');
      setAppUsername(session?.user?.email?.split('@')[0] || 'User');
    }
  };

  const switchCommunity = (communityId) => {
    setCommunityDropdownOpen(false);
    if (communityId === activeCommunityId) {
      // Clicking active community navigates to its detail
      navigateTo('communityDetail', { communityId });
      return;
    }
    const comm = userCommunities.find(c => c.id === communityId);
    if (comm) {
      setActiveCommunityId(comm.id);
      setViewCommunityId(comm.id);
      setAppCommunityName(comm.name);
      localStorage.setItem('activeCommunityId', comm.id);
    }
  };

  const refreshUserCommunities = async () => {
    if (!session?.user?.id) return;
    const { data: memberships } = await supabase
      .from('community_members')
      .select('communities(id, name, commissioner_id)')
      .eq('user_id', session.user.id);
    const communities = (memberships || []).map(m => m.communities).filter(Boolean);
    setUserCommunities(communities);

    // If active community was removed, fall back to first available
    if (communities.length > 0) {
      const stillValid = communities.find(c => c.id === activeCommunityId);
      if (!stillValid) {
        const first = communities[0];
        setActiveCommunityId(first.id);
        setViewCommunityId(first.id);
        setAppCommunityName(first.name);
        localStorage.setItem('activeCommunityId', first.id);
      }
    } else {
      setActiveCommunityId(null);
      setViewCommunityId(null);
      setAppCommunityName('');
      localStorage.removeItem('activeCommunityId');
    }
  };

  const startQuizConfig = (config) => {
    navigateTo('quiz', { quizConfig: config });
  };

  const endQuiz = async (score, totalQuestions, answers = [], timedOutCount = 0) => {
    if (totalQuestions === 0) { navigateTo('dashboard'); return; }
    try {
      // Validate score doesn't exceed total questions
      const validatedScore = Math.min(score, totalQuestions);
      const { data, error } = await supabase.from('games').insert([{
        user_id: session.user.id,
        category: quizConfig.category,
        difficulty: quizConfig.difficulty,
        score: validatedScore,
        total_questions: totalQuestions,
        community_id: quizConfig.communityId || null
      }]).select().single();
      if (error) throw error;
      if (answers.length > 0 && data?.id) {
        await supabase.from('game_answers').insert(
          answers.map(a => ({ ...a, game_id: data.id, user_id: session.user.id }))
        );
      }
      navigateTo('dashboard');
    } catch (error) {
      console.error('Error saving game:', error);
      navigateTo('dashboard');
    }
  };

  const viewGame = (gameId) => {
    navigateTo('review', { gameId });
  };

  const viewUserGames = (userId, username, returnScreen = 'community') => {
    navigateTo('userProfile', { userId, username, returnScreen });
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>;
  }

  if (!session) {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'terms') return <TermsOfService onBack={() => { window.location.hash = ''; window.location.reload(); }} />;
    if (hash === 'privacy') return <PrivacyPolicy onBack={() => { window.location.hash = ''; window.location.reload(); }} />;
    return <StartScreen />;
  }

  return (
    <div className="App">
      {appUsername && (() => {
        const navItems = [
          { label: 'My Stats', icon: <ChartIcon size={16} />, action: () => navigateTo('myStats') },
          { label: 'Multiplayer', icon: <BoltIcon size={16} />, action: () => navigateTo('multiplayer') },
          { label: 'My Leagues', icon: <TrophyIcon size={16} />, action: () => navigateTo('communities') },
          { label: 'Help', icon: <HelpIcon size={16} />, action: () => navigateTo('help') },
          { label: 'Settings', icon: <SettingsIcon size={16} />, action: () => navigateTo('settings') },
          ...(appIsAdmin ? [{ label: 'Super Admin', icon: <ShieldIcon size={16} />, action: () => navigateTo('admin') }] : []),
        ];
        return (
          <div className="app-user-bar">
            <div className="app-user-bar-left">
              <div className="app-user-bar-avatar">{appUsername.charAt(0).toUpperCase()}</div>
              <span className="app-user-bar-name">{appUsername}</span>
              {userCommunities.length === 1 && (
                <>
                  <span className="app-user-bar-divider">|</span>
                  <button
                    className="app-user-bar-community"
                    onClick={() => { if (activeCommunityId) navigateTo('communityDetail', { communityId: activeCommunityId }); }}
                  >
                    <TrophyIcon size={12} /> {appCommunityName}
                  </button>
                </>
              )}
              {userCommunities.length >= 2 && (
                <>
                  <span className="app-user-bar-divider">|</span>
                  <div className="app-community-selector">
                    <button
                      className="app-user-bar-community"
                      onClick={() => setCommunityDropdownOpen(p => !p)}
                    >
                      <TrophyIcon size={12} /> {appCommunityName} <ChevronDownIcon size={12} color="#fff" />
                    </button>
                    {communityDropdownOpen && (
                      <>
                        <div className="app-community-backdrop" onClick={() => setCommunityDropdownOpen(false)} />
                        <div className="app-community-menu">
                          {userCommunities.map(c => (
                            <button
                              key={c.id}
                              className={`app-community-item${c.id === activeCommunityId ? ' active' : ''}`}
                              onClick={() => switchCommunity(c.id)}
                            >
                              <span className="app-community-item-name">{c.name}</span>
                              {c.commissioner_id === session.user.id && (
                                <span className="app-community-commissioner-badge">Comm</span>
                              )}
                              {c.id === activeCommunityId && (
                                <span className="app-community-check"><CheckIcon size={14} color="var(--navy)" /></span>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
              <NotificationBell userId={session.user.id} onNavigate={(screen) => navigateTo(screen)} />
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={currentTheme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {currentTheme === 'dark' ? <SunIcon size={16} color="#fff" /> : <MoonIcon size={16} color="#fff" />}
              </button>
            </div>
            <div className="app-nav-dropdown">
              <button
                className="app-nav-btn"
                onClick={() => setNavOpen(p => !p)}
                aria-expanded={navOpen}
                aria-haspopup="menu"
                aria-label="Navigation menu"
              >
                Menu <span className={`app-nav-chevron${navOpen ? ' open' : ''}`} aria-hidden="true">▾</span>
              </button>
              {navOpen && (
                <>
                  <div className="app-nav-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
                  <div className="app-nav-menu" role="menu">
                    {navItems.map(item => (
                      <button key={item.label} className="app-nav-item" role="menuitem" onClick={() => { item.action(); setNavOpen(false); }}>
                        <span className="app-nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
      {showInstallBanner && (
        <div className="pwa-install-banner">
          <span>Install Trivia Quiz for quick access</span>
          <div className="pwa-install-actions">
            <button className="pwa-install-btn" onClick={handleInstallClick}>Install</button>
            <button className="pwa-dismiss-btn" onClick={dismissInstallBanner}>Dismiss</button>
          </div>
        </div>
      )}
      {screen === 'dashboard' && (
        <Dashboard
          user={session.user}
          onStartQuiz={() => navigateTo('quizConfig')}
          onReviewGame={viewGame}
          onSettings={() => navigateTo('settings')}
          onCommunity={() => navigateTo('community')}
          onAdmin={() => navigateTo('admin')}
          onCreateQuestion={() => navigateTo('createQuestion')}
          onCommunities={() => navigateTo('communities')}
          onViewUserProfile={(userId, username) => viewUserGames(userId, username, 'dashboard')}
        />
      )}
      {screen === 'myStats' && <MyStats user={session.user} onBack={() => navigateTo('dashboard')} />}
      {screen === 'quizConfig' && (
        <QuizSourceSelector
          onStart={startQuizConfig}
          userRole={userRole}
          communityId={viewCommunityId}
          onBack={() => navigateTo('dashboard')}
        />
      )}
      {screen === 'quiz' && <QuizScreen config={quizConfig} onEnd={endQuiz} />}
      {screen === 'review' && <GameReview gameId={viewGameId} onBack={() => navigateTo('dashboard')} />}
      {screen === 'community' && (
        <CommunityFeed
          currentUserId={session.user.id}
          onBack={() => navigateTo('dashboard')}
          onViewGame={viewGame}
          onViewUserProfile={viewUserGames}
        />
      )}
      {screen === 'userProfile' && (
        <UserProfile
          userId={viewUserId}
          username={viewUsername}
          currentUserId={session.user.id}
          onBack={() => navigateTo(userProfileReturn)}
          onViewGame={viewGame}
        />
      )}
      {screen === 'communities' && (
        <CommunitiesList
          user={session.user}
          userRole={userRole}
          onViewCommunity={(communityId, communityName) => {
            setActiveCommunityId(communityId);
            setAppCommunityName(communityName);
            localStorage.setItem('activeCommunityId', String(communityId));
            navigateTo('communityDetail', { communityId, communityName });
          }}
          onBack={() => navigateTo('dashboard')}
          onBrowseMarketplace={() => navigateTo('marketplace')}
          onMembershipChange={refreshUserCommunities}
        />
      )}
      {screen === 'marketplace' && (
        <CommunityMarketplace
          user={session.user}
          onBack={() => navigateTo('communities')}
          onMembershipChange={refreshUserCommunities}
        />
      )}
      {screen === 'admin' && <AdminDashboard onBack={() => navigateTo('dashboard')} currentUserId={session.user.id} />}
      {screen === 'createQuestion' && (
        <QuestionCreator
          user={session.user}
          onBack={() => navigateTo('dashboard')}
          onSuccess={() => {
            alert('Question submitted for review!');
            navigateTo('dashboard');
          }}
        />
      )}
      {screen === 'communityDetail' && (
        <CommunityDetail
          communityId={viewCommunityId}
          currentUserId={session.user.id}
          session={session}
          onBack={() => navigateTo('communities')}
          onStartQuiz={(commId) => navigateTo('quizConfig', { communityId: commId })}
          onManageCommunity={(commId) => navigateTo('commissionerDashboard', { communityId: commId })}
        />
      )}
      {screen === 'commissionerDashboard' && (
        <CommissionerDashboard
          communityId={viewCommunityId}
          currentUserId={session.user.id}
          onBack={() => navigateTo('communityDetail')}
        />
      )}
      {screen === 'multiplayer' && (
        <MultiplayerLobby
          user={session.user}
          username={appUsername}
          onBack={() => navigateTo('dashboard')}
        />
      )}
      {screen === 'settings' && <Settings user={session.user} onBack={() => navigateTo('dashboard')} onNavigate={navigateTo} />}
      {screen === 'resetPassword' && <ResetPasswordScreen onDone={() => navigateTo('dashboard')} />}
      {screen === 'help' && <HelpCenter onBack={() => navigateTo('dashboard')} />}
      {screen === 'terms' && <TermsOfService onBack={() => navigateTo('dashboard')} />}
      {screen === 'privacy' && <PrivacyPolicy onBack={() => navigateTo('dashboard')} />}
      {screen !== 'quiz' && screen !== 'quizConfig' && (
        <footer className="app-footer">
          <button className="footer-link" onClick={() => navigateTo('terms')}>Terms of Service</button>
          <span className="footer-divider">|</span>
          <button className="footer-link" onClick={() => navigateTo('privacy')}>Privacy Policy</button>
        </footer>
      )}
    </div>
  );
}

export default App;
