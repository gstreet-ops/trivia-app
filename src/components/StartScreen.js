import React, { useState } from 'react';
import './StartScreen.css';

const CATEGORIES = [
  { id: '9', name: 'General Knowledge' },
  { id: '17', name: 'Science & Nature' },
  { id: '21', name: 'Sports' },
  { id: '23', name: 'History' },
  { id: '11', name: 'Film' },
  { id: '12', name: 'Music' },
  { id: '22', name: 'Geography' },
  { id: '18', name: 'Computers' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function StartScreen({ onStart }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  const handleStart = () => {
    if (selectedCategory && selectedDifficulty) {
      onStart(selectedCategory, selectedDifficulty);
    }
  };

  return (
    <div className="start-screen">
      <h1>Trivia Quiz</h1>
      <p className="subtitle">Test your knowledge with 10 questions</p>

      <div className="selection-container">
        <div className="selection-group">
          <h2>Choose a Category</h2>
          <div className="options-grid">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                className={`option-btn ${selectedCategory === category.id ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="selection-group">
          <h2>Choose Difficulty</h2>
          <div className="difficulty-options">
            {DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                className={`option-btn ${selectedDifficulty === difficulty ? 'selected' : ''}`}
                onClick={() => setSelectedDifficulty(difficulty)}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button 
        className="start-btn" 
        onClick={handleStart}
        disabled={!selectedCategory || !selectedDifficulty}
      >
        Start Quiz
      </button>
    </div>
  );
}

export default StartScreen;
