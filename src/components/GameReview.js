import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './GameReview.css';
import decodeHtml from '../utils/decodeHtml';
import { isSafeUrl } from '../utils/sanitizeUrl';
import { BoltIcon, LightbulbIcon } from './Icons';

function GameReview({ gameId, onBack }) {
  const [game, setGame] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      const { data: gameData } = await supabase.from('games').select('*').eq('id', gameId).single();
      setGame(gameData);
      const { data: answerData } = await supabase.from('game_answers').select('*').eq('game_id', gameId).order('id', { ascending: true });
      setAnswers(answerData || []);
    } catch (error) {
      console.error('Error fetching game:', error);
    }
    setLoading(false);
  };

  if (loading) return <div className="game-review"><p>Loading...</p></div>;
  if (!game) return <div className="game-review"><p>Game not found</p></div>;

  const percentage = game.total_questions > 0 ? Math.round(game.score / game.total_questions * 100) : 0;

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
        <span className="meta-item">{game.category}</span>
        <span className="meta-item"><BoltIcon size={13} /> {game.difficulty}</span>
        <span className="meta-item">{new Date(game.created_at).toLocaleDateString()}</span>
      </div>
      <div className="answers-list">
        {answers.map((answer, index) => (
          <div key={index} className={'answer-card ' + (answer.is_correct ? 'correct' : 'incorrect')} aria-label={`Question ${index + 1}: ${answer.is_correct ? 'Correct' : 'Incorrect'}`}>
            <div className="question-number">Question {index + 1}</div>
            {answer.image_url && isSafeUrl(answer.image_url) && (
              <div className="review-media">
                <img src={answer.image_url} alt="Question media" className="review-media-img" />
              </div>
            )}
            {answer.video_url && isSafeUrl(answer.video_url) && (() => {
              const vidMatch = answer.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
              return vidMatch ? (
                <div className="review-media">
                  <div className="review-media-video">
                    <iframe src={`https://www.youtube.com/embed/${vidMatch[1]}`} title="Question video" style={{border: 0}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                </div>
              ) : null;
            })()}
            <div className="question-text">{decodeHtml(answer.question_text)}</div>
            <div className="answer-options">
              <div className="your-answer">
                <strong>Your answer:</strong> {decodeHtml(answer.user_answer)}
                {answer.is_correct ? ' ✓' : ' ✗'}
              </div>
              {!answer.is_correct && (
                <div className="correct-answer">
                  <strong>Correct answer:</strong> {decodeHtml(answer.correct_answer)}
                </div>
              )}
            </div>
            {answer.explanation && (
              <div className="review-explanation">
                <span className="review-explanation-icon"><LightbulbIcon size={14} /></span>
                <span className="review-explanation-text">{answer.explanation}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameReview;