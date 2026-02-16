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
    const { data } = await supabase.from('profiles').select('role, super_admin').eq('id', userId).single();
    if (data?.super_admin) setUserRole('super_admin');
    else if (data?.role === 'admin') setUserRole('admin');
    else setUserRole('user');
  };

  const startQuizConfig = (config) => {
    setQuizConfig(config);
    setScreen('quiz');
  };

  const endQuiz = async (score, totalQuestions) => {
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

  const viewUserGames = (userId, username) => {
    setViewUserId(userId);
    setViewUsername(username);
    setScreen('userProfile');
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>;
  }

  if (!session) return <StartScreen />;

  return (
    <div className="App">
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
          onBack={() => setScreen('community')}
          onViewGame={viewGame}
        />
      )}
      {screen === 'communities' && (
        <CommunitiesList
          user={session.user}
          onViewCommunity={(communityId) => {
            setViewCommunityId(communityId);
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
