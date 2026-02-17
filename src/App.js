import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        setScreen('dashboard');
        fetchUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setScreen('dashboard');
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    const { data } = await supabase.from('profiles').select('role, super_admin, username').eq('id', userId).single();
    if (data?.super_admin) setUserRole('super_admin');
    else if (data?.role === 'admin') setUserRole('admin');
    else setUserRole('user');
    setAppIsAdmin(data?.super_admin === true || data?.role === 'admin');
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
    setQuizConfig(config);
    setScreen('quiz');
  };

  const endQuiz = async (score, totalQuestions, answers = []) => {
    try {
      const { data, error } = await supabase.from('games').insert([{
        user_id: session.user.id,
        category: quizConfig.category,
        difficulty: quizConfig.difficulty,
        score: score,
        total_questions: totalQuestions,
        community_id: quizConfig.communityId || null
      }]).select().single();
      if (error) throw error;
      if (answers.length > 0 && data?.id) {
        await supabase.from('game_answers').insert(
          answers.map(a => ({ ...a, game_id: data.id, user_id: session.user.id }))
        );
      }
      setScreen('dashboard');
    } catch (error) {
      console.error('Error saving game:', error);
      setScreen('dashboard');
    }
  };

  const viewGame = (gameId) => {
    setViewGameId(gameId);
    setScreen('review');
  };

  const viewUserGames = (userId, username, returnScreen = 'community') => {
    setViewUserId(userId);
    setViewUsername(username);
    setUserProfileReturn(returnScreen);
    setScreen('userProfile');
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>;
  }

  if (!session) return <StartScreen />;

  return (
    <div className="App">
      {appUsername && (() => {
        const navItems = [
          { label: 'My Leagues', icon: '🏆', action: () => setScreen('communities') },
          { label: 'Community Feed', icon: '👥', action: () => setScreen('community') },
          { label: 'Create Question', icon: '✍️', action: () => setScreen('createQuestion') },
          { label: 'Settings', icon: '⚙️', action: () => setScreen('settings') },
          ...(appIsAdmin ? [{ label: 'Admin Panel', icon: '🛡️', action: () => setScreen('admin') }] : []),
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
                    onClick={() => { if (viewCommunityId) setScreen('communityDetail'); }}
                  >
                    🏆 {appCommunityName}
                  </button>
                </>
              )}
            </div>
            <div className="app-nav-dropdown">
              <button className="app-nav-btn" onClick={() => setNavOpen(p => !p)}>
                Menu <span className={`app-nav-chevron${navOpen ? ' open' : ''}`}>▾</span>
              </button>
              {navOpen && (
                <>
                  <div className="app-nav-backdrop" onClick={() => setNavOpen(false)} />
                  <div className="app-nav-menu">
                    {navItems.map(item => (
                      <button key={item.label} className="app-nav-item" onClick={() => { item.action(); setNavOpen(false); }}>
                        <span className="app-nav-icon">{item.icon}</span>{item.label}
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
          onStartQuiz={() => setScreen('quizConfig')}
          onReviewGame={viewGame}
          onSettings={() => setScreen('settings')}
          onCommunity={() => setScreen('community')}
          onAdmin={() => setScreen('admin')}
          onCreateQuestion={() => setScreen('createQuestion')}
          onCommunities={() => setScreen('communities')}
          onViewUserProfile={(userId, username) => viewUserGames(userId, username, 'dashboard')}
        />
      )}
      {screen === 'quizConfig' && (
        <QuizSourceSelector
          onStart={startQuizConfig}
          userRole={userRole}
          communityId={viewCommunityId}
          onBack={() => setScreen('dashboard')}
        />
      )}
      {screen === 'quiz' && <QuizScreen config={quizConfig} onEnd={endQuiz} />}
      {screen === 'review' && <GameReview gameId={viewGameId} onBack={() => setScreen('dashboard')} />}
      {screen === 'community' && (
        <CommunityFeed
          currentUserId={session.user.id}
          onBack={() => setScreen('dashboard')}
          onViewGame={viewGame}
          onViewUserProfile={viewUserGames}
        />
      )}
      {screen === 'userProfile' && (
        <UserProfile
          userId={viewUserId}
          username={viewUsername}
          currentUserId={session.user.id}
          onBack={() => setScreen(userProfileReturn)}
          onViewGame={viewGame}
        />
      )}
      {screen === 'communities' && (
        <CommunitiesList
          user={session.user}
          onViewCommunity={(communityId, communityName) => {
            setViewCommunityId(communityId);
            setAppCommunityName(communityName || '');
            setScreen('communityDetail');
          }}
          onBack={() => setScreen('dashboard')}
        />
      )}
      {screen === 'admin' && <AdminDashboard onBack={() => setScreen('dashboard')} />}
      {screen === 'createQuestion' && (
        <QuestionCreator
          user={session.user}
          onBack={() => setScreen('dashboard')}
          onSuccess={() => {
            alert('Question submitted for review!');
            setScreen('dashboard');
          }}
        />
      )}
      {screen === 'communityDetail' && (
        <CommunityDetail
          communityId={viewCommunityId}
          currentUserId={session.user.id}
          onBack={() => setScreen('communities')}
          onStartQuiz={(commId) => { setViewCommunityId(commId); setScreen('quizConfig'); }}
          onManageCommunity={(commId) => { setViewCommunityId(commId); setScreen('commissionerDashboard'); }}
        />
      )}
      {screen === 'commissionerDashboard' && (
        <CommissionerDashboard
          communityId={viewCommunityId}
          currentUserId={session.user.id}
          onBack={() => setScreen('communityDetail')}
        />
      )}
      {screen === 'settings' && <Settings user={session.user} onBack={() => setScreen('dashboard')} />}
    </div>
  );
}

export default App;
