import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './GameReview.css';

function GameReview({ gameId, onBack }) {
  const [game, setGame] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameDetails();
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      const { data: gameData } = await supabase.from('games').select('*').eq('id', gameId).single();
      setGame(gameData);
      const { data: answerData } = await supabase.from('game_answers').select('*').eq('game_id', gameId).order('question_order', { ascending: true });
      setAnswers(answerData || []);
    } catch (error) {
      console.error('Error fetching game:', error);
    }
    setLoading(false);
  };

  if (loading) return <div className="game-review"><p>Loading...</p></div>;
  if (!game) return <div className="game-review"><p>Game not found</p></div>;

  const percentage = ((game.score / game.total_questions) * 100).toFixed(1);

  return (
    <div className="game-review">
      <button className="back-btn" onClick={onBack}>Back</button>
      <div className="review-header">
        <h1>Game Review</h1>
        <div className="score-display">
          <span className="score-large">{game.score}/{game.total_questions}</span>
          <span className="percentage">{percentage}%</span>
        </div>
      </div>
      <div className="game-meta">
        <span className="meta-item">📁 {game.category}</span>
        <span className="meta-item">⚡ {game.difficulty}</span>
        <span className="meta-item">📅 {new Date(game.created_at).toLocaleDateString()}</span>
      </div>
      <div className="answers-list">
        {answers.map((answer, index) => (
          <div key={index} className={'answer-card ' + (answer.is_correct ? 'correct' : 'incorrect')}>
            <div className="question-number">Question {index + 1}</div>
            <div className="question-text">{answer.question_text}</div>
            <div className="answer-options">
              <div className="your-answer">
                <strong>Your answer:</strong> {answer.user_answer}
                {answer.is_correct ? ' ✓' : ' ✗'}
              </div>
              {!answer.is_correct && (
                <div className="correct-answer">
                  <strong>Correct answer:</strong> {answer.correct_answer}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameReview;