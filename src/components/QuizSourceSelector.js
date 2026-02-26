import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './QuizSourceSelector.css';

function QuizSourceSelector({ onStart, userRole, communityId, onBack }) {
  const [category, setCategory] = useState('General Knowledge');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionSource, setQuestionSource] = useState('trivia_api');
  const [questionCount, setQuestionCount] = useState(10);
  const [timerSettings, setTimerSettings] = useState(null);
  const [communityCategories, setCommunityCategories] = useState([]);

  const isAdmin = userRole === 'super_admin' || userRole === 'admin';

  const apiCategories = ['General Knowledge', 'Film', 'Music', 'Geography', 'History', 'Sports', 'Science & Nature', 'Arts & Literature'];

  useEffect(() => {
    if (communityId) {
      fetchCommunityData();
    }
  }, [communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCommunityData = async () => {
    try {
      const { data: communityData } = await supabase
        .from('communities')
        .select('settings')
        .eq('id', communityId)
        .single();
      if (communityData?.settings?.timer_enabled) {
        setTimerSettings({
          enabled: true,
          seconds: communityData.settings.timer_seconds || 30
        });
      }
      // Fetch distinct categories with counts from community questions
      const { data: questions } = await supabase
        .from('community_questions')
        .select('category')
        .eq('community_id', communityId);
      if (questions && questions.length > 0) {
        const counts = {};
        questions.forEach(q => {
          const cat = q.category || 'Uncategorized';
          counts[cat] = (counts[cat] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
        setCommunityCategories(sorted);
      }
    } catch (err) {
      console.error('Error fetching community data:', err);
    }
  };

  const usesCommunity = questionSource === 'community' || questionSource === 'mixed';

  const handleSourceChange = (newSource) => {
    setQuestionSource(newSource);
    const isCommunitySource = newSource === 'community' || newSource === 'mixed';
    if (isCommunitySource) {
      setCategory('All Categories');
    } else {
      setCategory('General Knowledge');
    }
  };

  const handleStart = () => {
    onStart({
      category,
      difficulty,
      source: questionSource,
      count: questionCount,
      communityId: communityId,
      timerSettings: usesCommunity && timerSettings ? timerSettings : null
    });
  };

  return (
    <div className='quiz-source-selector'>
      <h2>Configure Quiz</h2>

      <div className='form-group'>
        <label>Question Source</label>
        <select value={questionSource} onChange={(e) => handleSourceChange(e.target.value)}>
          <option value='trivia_api'>Trivia API (General Knowledge)</option>
          {communityId && <option value='community'>Community Questions Only</option>}
          <option value='custom_approved'>Approved Custom Questions</option>
          {isAdmin && <option value='mixed'>Mixed (All Sources)</option>}
        </select>
      </div>

      <div className='form-group'>
        <label>Category</label>
        {usesCommunity && communityCategories.length > 0 ? (
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All Categories">All Categories ({communityCategories.reduce((s, c) => s + c[1], 0)})</option>
            {communityCategories.map(([cat, count]) => (
              <option key={cat} value={cat}>{cat} ({count})</option>
            ))}
          </select>
        ) : (
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {apiCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        )}
      </div>

      <div className='form-group'>
        <label>Difficulty</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value='easy'>Easy</option>
          <option value='medium'>Medium</option>
          <option value='hard'>Hard</option>
        </select>
      </div>

      <div className='form-group'>
        <label>Number of Questions</label>
        <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}>
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={20}>20</option>
        </select>
      </div>

      {timerSettings && usesCommunity && (
        <div className="timer-notice">
          <span className="timer-notice-icon">⏱</span>
          This community has a {timerSettings.seconds}s timer per question
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        {onBack && <button className='start-quiz-btn' onClick={onBack} style={{ background: '#fff', color: '#041E42', border: '1px solid #041E42' }}>Back</button>}
        <button className='start-quiz-btn' onClick={handleStart} style={{ flex: 1 }}>Start Quiz</button>
      </div>
    </div>
  );
}

export default QuizSourceSelector;
