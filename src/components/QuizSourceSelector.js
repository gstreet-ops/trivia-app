import React, { useState } from 'react';
import './QuizSourceSelector.css';

function QuizSourceSelector({ onStart, userRole, communityId }) {
  const [category, setCategory] = useState('General Knowledge');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionSource, setQuestionSource] = useState('trivia_api');
  const [questionCount, setQuestionCount] = useState(3);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const categories = ['General Knowledge', 'Film', 'Music', 'Geography', 'History', 'Sports', 'Science & Nature', 'Arts & Literature'];

  const handleStart = () => {
    onStart({
      category,
      difficulty,
      source: questionSource,
      count: questionCount,
      communityId: communityId
    });
  };

  return (
    <div className='quiz-source-selector'>
      <h2>Configure Quiz</h2>
      
      <div className='form-group'>
        <label>Question Source</label>
        <select value={questionSource} onChange={(e) => setQuestionSource(e.target.value)}>
          <option value='trivia_api'>Trivia API (General Knowledge)</option>
          {communityId && <option value='community'>Community Questions Only</option>}
          <option value='custom_approved'>Approved Custom Questions</option>
          {isAdmin && <option value='mixed'>Mixed (All Sources)</option>}
        </select>
      </div>

      <div className='form-group'>
        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
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

      <button className='start-quiz-btn' onClick={handleStart}>Start Quiz</button>
    </div>
  );
}

export default QuizSourceSelector;