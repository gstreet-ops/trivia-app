import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
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

const KNOWN_SCREENS = new Set([
  'dashboard', 'settings', 'help', 'admin', 'myStats', 'communities',
  'community', 'createQuestion', 'quizConfig', 'quiz',
  'review', 'communityDetail', 'commissionerDashboard', 'userProfile',
  'marketplace'
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

    // Quiz config can't be restored on refresh — redirect to dashboard
    if (hashScreen === 'quiz') {
      window.location.hash = 'dashboard';
      setScreen('dashboard');
      return;
    }

    if (hashScreen === 'review' && param) setViewGameId(param);
    if (hashScreen === 'communityDetail' && param) setViewCommunityId(param);
    if (hashScreen === 'commissionerDashboard' && param) setViewCommunityId(param);
    if (hashScreen === 'userProfile' && param) setViewUserId(param);

    setScreen(hashScreen);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        if (window.location.hash && window.location.hash !== '#') {
          syncFromHash();
        } else {
          navigateTo('dashboard');
        }
        fetchUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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

  const fetchUserRole = async (userId) => {
    const { data } = await supabase.from('profiles').select('role, super_admin, username').eq('id', userId).single();
    if (data?.super_admin) setUserRole('super_admin');
    else setUserRole('user');
    setAppIsAdmin(data?.super_admin === true);
    setAppUsername(data?.username || '');

    // Pre-load community name if user belongs to exactly one community
    const { data: memberships } = await supabase
      .from('community_members')
      .select('communities(id, name)')
      .eq('user_id', userId);
    if (memberships && memberships.length === 1) {
      setAppCommunityName(memberships[0].communities?.name || '');
      setViewCommunityId(memberships[0].communities?.id || null);
    }
  };

  const startQuizConfig = (config) => {
    navigateTo('quiz', { quizConfig: config });
  };

  const endQuiz = async (score, totalQuestions, answers = [], timedOutCount = 0) => {
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

  if (!session) return <StartScreen />;

  return (
    <div className="App">
      {appUsername && (() => {
        const navItems = [
          { label: 'My Stats', icon: '📊', action: () => navigateTo('myStats') },
          { label: 'My Leagues', icon: '🏆', action: () => navigateTo('communities') },
          { label: 'Help', icon: '❓', action: () => navigateTo('help') },
          { label: 'Settings', icon: '⚙️', action: () => navigateTo('settings') },
          ...(appIsAdmin ? [{ label: 'Super Admin', icon: '🛡️', action: () => navigateTo('admin') }] : []),
        ];
        return (
          <div className="app-user-bar">
            <div className="app-user-bar-left">
              <div className="app-user-bar-avatar">{appUsername.charAt(0).toUpperCase()}</div>
              <span className="app-user-bar-name">{appUsername}</span>
              {appCommunityName && (
                <>
                  <span className="app-user-bar-divider">|</span>
                  <button
                    className="app-user-bar-community"
                    onClick={() => { if (viewCommunityId) navigateTo('communityDetail', { communityId: viewCommunityId }); }}
                  >
                    <span aria-hidden="true">🏆</span> {appCommunityName}
                  </button>
                </>
              )}
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
            navigateTo('communityDetail', { communityId, communityName });
          }}
          onBack={() => navigateTo('dashboard')}
          onBrowseMarketplace={() => navigateTo('marketplace')}
        />
      )}
      {screen === 'marketplace' && (
        <CommunityMarketplace
          user={session.user}
          onBack={() => navigateTo('communities')}
        />
      )}
      {screen === 'admin' && <AdminDashboard onBack={() => navigateTo('dashboard')} />}
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
      {screen === 'settings' && <Settings user={session.user} onBack={() => navigateTo('dashboard')} />}
      {screen === 'help' && <HelpCenter onBack={() => navigateTo('dashboard')} />}
    </div>
  );
}

export default App;
