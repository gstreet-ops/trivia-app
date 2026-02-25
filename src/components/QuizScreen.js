import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './QuizScreen.css';
import decodeHtml from '../utils/decodeHtml';
import { LightbulbIcon } from './Icons';

function QuizScreen({ config, onEnd }) {
  const { category, difficulty, count, timerSettings, source = 'trivia_api', communityId } = config;
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [hiddenAnswers, setHiddenAnswers] = useState([]);
  const [answersLog, setAnswersLog] = useState([]);
  const [timedOutCount, setTimedOutCount] = useState(0);
  const questionDisplayedAtRef = useRef(null);

  // Timer state
  const timerEnabled = timerSettings?.enabled === true;
  const timerDuration = timerSettings?.seconds || 30;
  const [timeRemaining, setTimeRemaining] = useState(timerDuration);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const bonusTimeRef = useRef(0);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer logic
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(() => {
    stopTimer();
    if (showResult || !questions.length) return;

    const q = questions[currentQuestionIndex];
    if (!q) return;

    const now = Date.now();
    const timeTaken = questionDisplayedAtRef.current ? now - questionDisplayedAtRef.current : null;

    setSelectedAnswer(null);
    setShowResult(true);
    setTimedOutCount(prev => prev + 1);
    setAnswersLog(prev => [...prev, {
      question_text: q.question,
      correct_answer: q.correctAnswer,
      user_answer: '(timed out)',
      is_correct: false,
      explanation: q.explanation || null,
      image_url: q.image_url || null,
      video_url: q.video_url || null,
      answered_at: new Date(now).toISOString(),
      time_taken_ms: timeTaken
    }]);
  }, [stopTimer, showResult, questions, currentQuestionIndex]);

  const startTimer = useCallback(() => {
    if (!timerEnabled) return;
    stopTimer();
    bonusTimeRef.current = 0;
    startTimeRef.current = Date.now();
    setTimeRemaining(timerDuration);

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = timerDuration + bonusTimeRef.current - elapsed;
      if (remaining <= 0) {
        setTimeRemaining(0);
        // We'll handle timeout via the effect below
      } else {
        setTimeRemaining(remaining);
      }
    }, 100);
  }, [timerEnabled, timerDuration, stopTimer]);

  // Watch for timeRemaining hitting 0
  useEffect(() => {
    if (timerEnabled && timeRemaining <= 0 && !showResult && questions.length > 0) {
      handleTimeout();
    }
  }, [timeRemaining, timerEnabled, showResult, questions.length, handleTimeout]);

  // Start timer when question changes + record display time for answer tracking
  useEffect(() => {
    if (questions.length > 0 && !showResult) {
      questionDisplayedAtRef.current = Date.now();
      if (timerEnabled) {
        startTimer();
      }
    }
    return () => stopTimer();
  }, [currentQuestionIndex, questions.length, timerEnabled, showResult, startTimer, stopTimer]);

  // Stop timer when answer is shown
  useEffect(() => {
    if (showResult) {
      stopTimer();
    }
  }, [showResult, stopTimer]);

  // Map QuizSourceSelector's human-readable category strings to Trivia API v2 slugs
  const categoryMap = {
    'General Knowledge': 'general_knowledge',
    'Film': 'film_and_tv',
    'Music': 'music',
    'Geography': 'geography',
    'History': 'history',
    'Sports': 'sport_and_leisure',
    'Science & Nature': 'science',
    'Arts & Literature': 'arts_and_literature',
  };

  const fetchApiQuestions = async (requested) => {
    const apiCategory = categoryMap[category] || 'general_knowledge';
    const url = `https://the-trivia-api.com/v2/questions?limit=${requested}&categories=${apiCategory}&difficulties=${difficulty}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return (data || []).map((q) => {
      const correct = decodeHtml(q.correctAnswer);
      return {
        question: decodeHtml(q.question.text),
        correctAnswer: correct,
        allAnswers: shuffleArray([correct, ...q.incorrectAnswers.map(decodeHtml)])
      };
    });
  };

  const fetchCommunityQuestions = async (requested) => {
    let query = supabase.from('community_questions').select('*').eq('community_id', communityId);
    if (difficulty && difficulty !== 'mixed') {
      query = query.eq('difficulty', difficulty);
    }
    const { data } = await query;
    if (!data || data.length === 0) return [];
    // Fisher-Yates shuffle
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, requested).map(q => ({
      question: q.question_text,
      correctAnswer: q.correct_answer,
      allAnswers: shuffleArray([q.correct_answer, ...(q.incorrect_answers || [])]),
      image_url: q.image_url || null,
      video_url: q.video_url || null,
      explanation: q.explanation || null
    }));
  };

  const fetchCustomApprovedQuestions = async (requested) => {
    const { data } = await supabase
      .from('custom_questions')
      .select('*')
      .eq('status', 'approved');
    if (!data || data.length === 0) return [];
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, requested).map(q => ({
      question: q.question_text,
      correctAnswer: q.correct_answer,
      allAnswers: shuffleArray([q.correct_answer, ...(q.incorrect_answers || [])]),
      explanation: q.explanation || null
    }));
  };

  const fetchQuestions = async () => {
    try {
      const requested = count || 10;
      let formatted = [];

      if (source === 'community' && communityId) {
        formatted = await fetchCommunityQuestions(requested);
      } else if (source === 'custom_approved') {
        formatted = await fetchCustomApprovedQuestions(requested);
      } else if (source === 'mixed' && communityId) {
        // Combine API + community questions
        const half = Math.ceil(requested / 2);
        const [apiQs, communityQs] = await Promise.all([
          fetchApiQuestions(half).catch(() => []),
          fetchCommunityQuestions(requested - half).catch(() => [])
        ]);
        formatted = shuffleArray([...apiQs, ...communityQs]);
      } else {
        // Default: trivia_api
        formatted = await fetchApiQuestions(requested);
      }

      if (!formatted || formatted.length === 0) {
        setError('No questions found for this configuration. Try different settings.');
        setLoading(false);
        return;
      }

      setQuestions(formatted);
      setLoading(false);
    } catch (err) {
      setError('Failed to load questions. Check your connection and try again.');
      setLoading(false);
    }
  };

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleAnswerClick = (answer) => {
    if (showResult) return;

    const now = Date.now();
    const timeTaken = questionDisplayedAtRef.current ? now - questionDisplayedAtRef.current : null;

    stopTimer();
    setSelectedAnswer(answer);
    setShowResult(true);

    const q = questions[currentQuestionIndex];
    const isCorrect = answer === q.correctAnswer;
    if (isCorrect) setScore(prev => prev + 1);
    setAnswersLog(prev => [...prev, {
      question_text: q.question,
      correct_answer: q.correctAnswer,
      user_answer: answer,
      is_correct: isCorrect,
      explanation: q.explanation || null,
      image_url: q.image_url || null,
      video_url: q.video_url || null,
      answered_at: new Date(now).toISOString(),
      time_taken_ms: timeTaken
    }]);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setHintUsed(false);
      setHiddenAnswers([]);
    } else {
      // Compute final score from answersLog to avoid stale state
      const finalScore = answersLog.filter(a => a.is_correct).length;
      onEnd(finalScore, questions.length, answersLog, timedOutCount);
    }
  };

  const handleHint = () => {
    if (hintUsed || showResult) return;

    const currentQuestion = questions[currentQuestionIndex];
    const wrongAnswers = currentQuestion.allAnswers.filter(
      answer => answer !== currentQuestion.correctAnswer
    );

    // Randomly select 2 wrong answers to hide (Fisher-Yates)
    const answersToHide = shuffleArray(wrongAnswers).slice(0, 2);
    setHiddenAnswers(answersToHide);
    setHintUsed(true);

    // Add 3 bonus seconds when hint is used
    if (timerEnabled && timerRef.current) {
      bonusTimeRef.current += 3;
    }
  };

  if (loading) {
    return <div className="quiz-screen loading">Loading questions...</div>;
  }

  if (error) {
    return (
      <div className="quiz-screen error">
        <p>{error}</p>
        <div style={{display:'flex', gap:'10px', marginTop:'16px', justifyContent:'center'}}>
          <button onClick={fetchQuestions} style={{padding:'8px 16px', background:'#041E42', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'0.85rem'}}>Retry</button>
          <button onClick={() => onEnd(0, 0, [], 0)} style={{padding:'8px 16px', background:'#fff', color:'#041E42', border:'1px solid #041E42', borderRadius:'6px', cursor:'pointer', fontSize:'0.85rem'}}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const timerFraction = timerEnabled ? timeRemaining / (timerDuration + bonusTimeRef.current) : 1;
  const isWarning = timerEnabled && timeRemaining <= 5 && timeRemaining > 0 && !showResult;

  return (
    <div className="quiz-screen">
      <div className="quiz-header">
        <div className="progress">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        <div className="score">Score: {score}/{questions.length}</div>
      </div>

      {timerEnabled && (
        <div className="quiz-timer-container">
          <div className="quiz-timer-bar-bg">
            <div
              className={`quiz-timer-bar-fill ${isWarning ? 'warning' : ''} ${showResult ? 'paused' : ''}`}
              style={{ width: `${Math.max(0, timerFraction * 100)}%` }}
            />
          </div>
          <span className={`quiz-timer-seconds ${isWarning ? 'warning' : ''}`}>
            {Math.ceil(Math.max(0, timeRemaining))}s
          </span>
        </div>
      )}

      <div className="question-container">
        {currentQuestion.image_url && (
          <div className="question-media">
            <img src={currentQuestion.image_url} alt="Question media" className="question-media-img" />
          </div>
        )}
        {currentQuestion.video_url && (() => {
          const vidMatch = currentQuestion.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
          return vidMatch ? (
            <div className="question-media">
              <div className="question-media-video">
                <iframe src={`https://www.youtube.com/embed/${vidMatch[1]}`} title="Question video" style={{border: 0}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </div>
          ) : null;
        })()}
        <h2 className="question">{currentQuestion.question}</h2>

        <div className="answers-grid">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isHidden = hiddenAnswers.includes(answer);
            const isSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            const isTimedOut = showResult && selectedAnswer === null;

            let className = 'answer-btn';
            if (isHidden) className += ' hidden';
            if (showResult && isSelected && !isCorrect) className += ' wrong';
            if (showResult && isCorrect) className += ' correct';
            if (isSelected && !showResult) className += ' selected';
            if (isTimedOut && isCorrect) className += ' correct';

            const ariaLabel = !showResult
              ? `Option ${index + 1} of ${currentQuestion.allAnswers.length}: ${answer}`
              : isCorrect
                ? `Option ${index + 1} of ${currentQuestion.allAnswers.length}: ${answer} — Correct`
                : isSelected
                  ? `Option ${index + 1} of ${currentQuestion.allAnswers.length}: ${answer} — Incorrect`
                  : `Option ${index + 1} of ${currentQuestion.allAnswers.length}: ${answer}`;

            return (
              <button
                key={index}
                className={className}
                onClick={() => handleAnswerClick(answer)}
                disabled={showResult || isHidden}
                aria-label={ariaLabel}
              >
                {answer}
                {showResult && isCorrect && <span aria-hidden="true"> ✓</span>}
                {showResult && isSelected && !isCorrect && <span aria-hidden="true"> ✗</span>}
              </button>
            );
          })}
        </div>

        {showResult && selectedAnswer === null && (
          <div className="timeout-message">Time's up! The correct answer is highlighted above.</div>
        )}

        {showResult && currentQuestion.explanation && (
          <div className="explanation-panel">
            <div className="explanation-header"><LightbulbIcon size={14} /> Why?</div>
            <p className="explanation-text">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="quiz-actions">
          <button
            className="hint-btn"
            onClick={handleHint}
            disabled={hintUsed || showResult}
            aria-label={hintUsed ? 'Hint already used' : 'Remove two incorrect answers (50/50 hint)'}
          >
            {hintUsed ? 'Hint Used' : 'Use Hint (50/50)'}
          </button>

          {showResult && (
            <button className="next-btn" onClick={handleNext}>
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizScreen;
