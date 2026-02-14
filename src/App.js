import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';
import StartScreen from './components/StartScreen';
import Dashboard from './components/Dashboard';
import QuizScreen from './components/QuizScreen';
import GameReview from './components/GameReview';
import Settings from './components/Settings';
import CommunityFeed from './components/CommunityFeed';
import UserProfile from './components/UserProfile';
import AdminDashboard from './components/AdminDashboard';
import QuestionCreator from './components/QuestionCreator';

function App() {
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState('start');
  const [quizConfig, setQuizConfig] = useState({ category: '', difficulty: '' });
  const [currentGameId, setCurrentGameId] = useState(null);
  const [viewGameId, setViewGameId] = useState(null);
  const [viewUserId, setViewUserId] = useState(null);
  const [viewUsername, setViewUsername] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const startQuiz = (category, difficulty) => {
    setQuizConfig({ category, difficulty });
    setScreen('quiz');
  };

  const endQuiz = async (score, totalQuestions) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert([{
          user_id: session.user.id,
          category: quizConfig.category,
          difficulty: quizConfig.difficulty,
          score: score,
          total_questions: totalQuestions
        }])
        .select()
        .single();
      if (error) throw error;
      setCurrentGameId(data.id);
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

  if (!session) {
    return <StartScreen />;
  }

  return (
    <div className="App">
      {screen === 'dashboard' && (
        <Dashboard
          user={session.user}
          onStartQuiz={() => setScreen('start')}
          onReviewGame={viewGame}
          onSettings={() => setScreen('settings')}
          onCommunity={() => setScreen('community')}
          onAdmin={() => setScreen('admin')}
          onCreateQuestion={() => setScreen('createQuestion')}
        />
      )}
      {screen === 'start' && (
        <StartScreen onStart={startQuiz} onBack={() => setScreen('dashboard')} />
      )}
      {screen === 'quiz' && (
        <QuizScreen
          category={quizConfig.category}
          difficulty={quizConfig.difficulty}
          onEnd={endQuiz}
        />
      )}
      {screen === 'review' && (
        <GameReview
          gameId={viewGameId}
          onBack={() => setScreen('dashboard')}
        />
      )}
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
      {screen === 'admin' && (
        <AdminDashboard onBack={() => setScreen('dashboard')} />
      )}
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
      {screen === 'settings' && (
        <Settings
          user={session.user}
          onBack={() => setScreen('dashboard')}
        />
      )}
    </div>
  );
}

export default App;
