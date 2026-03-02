import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './ScheduledQuizPlay.css';
import { TrophyIcon, BoltIcon, LightbulbIcon } from './Icons';
import { updateStreak } from '../utils/streakTracker';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ScheduledQuizPlay({ quizId, user, username, onBack }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hiddenAnswers, setHiddenAnswers] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [existingAttempt, setExistingAttempt] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const bonusTimeRef = useRef(0);
  const questionStartRef = useRef(null);
  const answersLogRef = useRef([]);
  const totalTimeRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback((duration) => {
    stopTimer();
    bonusTimeRef.current = 0;
    startTimeRef.current = Date.now();
    setTimeRemaining(duration);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = duration + bonusTimeRef.current - elapsed;
      setTimeRemaining(remaining <= 0 ? 0 : remaining);
    }, 100);
  }, [stopTimer]);

  // Load quiz + questions + check eligibility
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch quiz
        const { data: quizData, error: qErr } = await supabase
          .from('scheduled_quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
        if (qErr || !quizData) throw new Error('Quiz not found');
        if (cancelled) return;
        setQuiz(quizData);

        // Check eligibility
        const now = new Date();
        if (quizData.status !== 'live') throw new Error('This quiz is not currently live');
        if (now < new Date(quizData.starts_at)) throw new Error('This quiz has not started yet');
        if (now > new Date(quizData.ends_at)) throw new Error('This quiz has ended');

        // Check existing attempt
        const { data: existing } = await supabase
          .from('scheduled_quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('user_id', user.id)
          .single();

        if (existing?.completed_at) {
          if (cancelled) return;
          setExistingAttempt(existing);
          setFinished(true);
          setScore(existing.score);
          // Load leaderboard
          await loadLeaderboard(quizId, quizData.community_id);
          setLoading(false);
          return;
        }

        // Load questions based on source
        let loadedQuestions = [];
        if (quizData.question_source === 'curated' && quizData.curated_question_ids?.length) {
          const { data: cq } = await supabase
            .from('community_questions')
            .select('*')
            .in('id', quizData.curated_question_ids);
          loadedQuestions = shuffleArray(cq || []);
        } else if (quizData.question_source === 'community') {
          let query = supabase.from('community_questions').select('*').eq('community_id', quizData.community_id);
          if (quizData.category && quizData.category !== 'Random/Mixed') query = query.eq('category', quizData.category);
          if (quizData.difficulty && quizData.difficulty !== 'mixed') query = query.eq('difficulty', quizData.difficulty);
          const { data: cq } = await query;
          loadedQuestions = shuffleArray(cq || []).slice(0, quizData.question_count);
        } else {
          // API source — fetch from Open Trivia DB
          const catMap = { 'General Knowledge': 9, 'Science': 17, 'History': 23, 'Geography': 22, 'Entertainment': 11, 'Sports': 21, 'Art & Literature': 25, 'Technology': 18 };
          let apiUrl = `https://opentdb.com/api.php?amount=${quizData.question_count}&type=multiple`;
          if (quizData.category && catMap[quizData.category]) apiUrl += `&category=${catMap[quizData.category]}`;
          if (quizData.difficulty && quizData.difficulty !== 'mixed') apiUrl += `&difficulty=${quizData.difficulty}`;
          const res = await fetch(apiUrl);
          const apiData = await res.json();
          loadedQuestions = (apiData.results || []).map(q => ({
            question: decodeHTMLEntities(q.question),
            correct_answer: decodeHTMLEntities(q.correct_answer),
            incorrect_answers: q.incorrect_answers.map(a => decodeHTMLEntities(a)),
            category: q.category,
            difficulty: q.difficulty,
          }));
        }

        if (loadedQuestions.length === 0) throw new Error('No questions available for this quiz');
        if (cancelled) return;

        // Prepare questions with shuffled answers
        const prepared = loadedQuestions.map(q => {
          const incorrect = q.incorrect_answers || [q.option_b, q.option_c, q.option_d].filter(Boolean);
          const correct = q.correct_answer;
          return {
            ...q,
            correctAnswer: correct,
            allAnswers: shuffleArray([correct, ...incorrect]),
          };
        });

        setQuestions(prepared);

        // Create attempt
        const { data: attempt, error: aErr } = await supabase
          .from('scheduled_quiz_attempts')
          .insert({ quiz_id: quizId, user_id: user.id, total_questions: prepared.length })
          .select()
          .single();
        if (aErr) throw aErr;
        if (cancelled) return;
        setAttemptId(attempt.id);
        setLoading(false);
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    })();
    return () => { cancelled = true; stopTimer(); };
  }, [quizId, user.id, stopTimer]);

  // Start timer when question changes
  useEffect(() => {
    if (questions.length > 0 && !showResult && !finished && quiz?.timer_seconds) {
      questionStartRef.current = Date.now();
      startTimer(quiz.timer_seconds);
    }
    return () => stopTimer();
  }, [currentQuestionIndex, questions.length, showResult, finished, quiz?.timer_seconds, startTimer, stopTimer]);

  // Handle timeout
  useEffect(() => {
    if (quiz?.timer_seconds && timeRemaining <= 0 && !showResult && questions.length > 0 && !finished) {
      handleTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, showResult, questions.length, finished]);

  const loadLeaderboard = async (qId, communityId) => {
    const { data } = await supabase
      .from('scheduled_quiz_attempts')
      .select('*, profiles(username)')
      .eq('quiz_id', qId)
      .not('completed_at', 'is', null)
      .order('score', { ascending: false })
      .order('time_taken_ms', { ascending: true })
      .limit(10);
    setLeaderboard(data || []);
  };

  const handleTimeout = useCallback(() => {
    stopTimer();
    const timeTaken = Date.now() - (questionStartRef.current || Date.now());
    totalTimeRef.current += timeTaken;
    const q = questions[currentQuestionIndex];
    answersLogRef.current.push({
      question_index: currentQuestionIndex,
      question_text: q.question || q.question_text,
      correct_answer: q.correctAnswer,
      user_answer: null,
      is_correct: false,
      time_taken_ms: timeTaken,
    });
    setShowResult(true);
  }, [currentQuestionIndex, questions, stopTimer]);

  const handleAnswerClick = (answer) => {
    if (showResult) return;
    stopTimer();
    const timeTaken = Date.now() - (questionStartRef.current || Date.now());
    totalTimeRef.current += timeTaken;
    const q = questions[currentQuestionIndex];
    const isCorrect = answer === q.correctAnswer;
    if (isCorrect) setScore(prev => prev + 1);
    setSelectedAnswer(answer);
    setShowResult(true);
    answersLogRef.current.push({
      question_index: currentQuestionIndex,
      question_text: q.question || q.question_text,
      correct_answer: q.correctAnswer,
      user_answer: answer,
      is_correct: isCorrect,
      time_taken_ms: timeTaken,
    });
  };

  const handleHint = () => {
    if (hintUsed || showResult) return;
    const q = questions[currentQuestionIndex];
    const wrong = q.allAnswers.filter(a => a !== q.correctAnswer);
    setHiddenAnswers(shuffleArray(wrong).slice(0, 2));
    setHintUsed(true);
    if (quiz?.timer_seconds && timerRef.current) bonusTimeRef.current += 3;
  };

  const handleNext = async () => {
    if (currentQuestionIndex + 1 >= questions.length) {
      // Quiz complete — save answers and finalize
      const finalScore = answersLogRef.current.filter(a => a.is_correct).length;
      setScore(finalScore);

      // Save all answers
      if (attemptId) {
        await supabase.from('scheduled_quiz_answers').insert(
          answersLogRef.current.map(a => ({ attempt_id: attemptId, ...a }))
        );
        // Update attempt
        await supabase.from('scheduled_quiz_attempts').update({
          score: finalScore,
          time_taken_ms: totalTimeRef.current,
          completed_at: new Date().toISOString(),
        }).eq('id', attemptId);
        updateStreak(user.id, supabase).catch(() => {});
        // Update participant count
        const { count } = await supabase
          .from('scheduled_quiz_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quizId)
          .not('completed_at', 'is', null);
        await supabase.from('scheduled_quizzes').update({
          participant_count: count || 0, updated_at: new Date().toISOString(),
        }).eq('id', quizId);
      }

      await loadLeaderboard(quizId, quiz.community_id);
      setFinished(true);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setHintUsed(false);
      setHiddenAnswers([]);
    }
  };

  if (loading) return <div className="sqp-container"><p className="sqp-loading">Loading quiz...</p></div>;
  if (error) return (
    <div className="sqp-container">
      <div className="sqp-error">
        <h2>Cannot Play Quiz</h2>
        <p>{error}</p>
        <button className="sqp-btn-primary" onClick={onBack}>Go Back</button>
      </div>
    </div>
  );

  // Results screen
  if (finished) {
    const total = existingAttempt ? existingAttempt.total_questions : questions.length;
    const pct = Math.round((score / total) * 100);
    return (
      <div className="sqp-container">
        <div className="sqp-results">
          <h2><TrophyIcon size={24} /> {quiz?.title} — Results</h2>
          <div className="sqp-score-card">
            <div className="sqp-score-big">{score}/{total}</div>
            <div className="sqp-score-pct">{pct}%</div>
            {existingAttempt && <p className="sqp-already-played">You already completed this quiz.</p>}
          </div>
          {leaderboard.length > 0 && (
            <div className="sqp-leaderboard">
              <h3>Community Leaderboard</h3>
              <table className="sqp-lb-table">
                <thead>
                  <tr><th>#</th><th>Player</th><th>Score</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.id} className={entry.user_id === user.id ? 'sqp-lb-you' : ''}>
                      <td>{i + 1}</td>
                      <td>{entry.profiles?.username || 'Anonymous'}{entry.user_id === user.id ? ' (you)' : ''}</td>
                      <td>{entry.score}/{entry.total_questions}</td>
                      <td>{entry.time_taken_ms ? `${(entry.time_taken_ms / 1000).toFixed(1)}s` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="sqp-btn-primary" onClick={onBack}>Back to Community</button>
        </div>
      </div>
    );
  }

  // Quiz play screen
  const currentQuestion = questions[currentQuestionIndex];
  const timerFraction = quiz?.timer_seconds ? timeRemaining / quiz.timer_seconds : 1;
  const isWarning = quiz?.timer_seconds && timeRemaining <= 5;

  return (
    <div className="sqp-container">
      <div className="sqp-header">
        <span className="sqp-title">{quiz?.title}</span>
        <span className="sqp-progress">Question {currentQuestionIndex + 1} of {questions.length}</span>
        <span className="sqp-score">Score: {score}/{questions.length}</span>
      </div>

      {quiz?.timer_seconds > 0 && (
        <div className="quiz-timer-container">
          <div className="quiz-timer-bar-bg">
            <div
              className={`quiz-timer-bar-fill ${isWarning ? 'warning' : ''}`}
              style={{ width: `${Math.max(0, timerFraction * 100)}%` }}
            />
          </div>
          <span className={`quiz-timer-seconds ${isWarning ? 'warning' : ''}`}>
            {Math.ceil(Math.max(0, timeRemaining))}s
          </span>
        </div>
      )}

      <div className="sqp-question">
        <h2>{decodeHTMLEntities(currentQuestion.question || currentQuestion.question_text)}</h2>
      </div>

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

          return (
            <button
              key={index}
              className={className}
              onClick={() => handleAnswerClick(answer)}
              disabled={showResult || isHidden}
            >
              {answer}
              {showResult && isCorrect && <span> ✓</span>}
              {showResult && isSelected && !isCorrect && <span> ✗</span>}
            </button>
          );
        })}
      </div>

      {showResult && selectedAnswer === null && (
        <p className="timeout-message">Time's up!</p>
      )}

      {showResult && currentQuestion.explanation && (
        <div className="explanation-panel">
          <LightbulbIcon size={16} /> {currentQuestion.explanation}
        </div>
      )}

      <div className="quiz-actions">
        <button className="hint-btn" onClick={handleHint} disabled={hintUsed || showResult}>
          <BoltIcon size={14} /> {hintUsed ? 'Hint Used' : 'Use Hint (50/50)'}
        </button>
        {showResult && (
          <button className="next-btn" onClick={handleNext}>
            {currentQuestionIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}

function decodeHTMLEntities(text) {
  if (!text) return '';
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
}

export default ScheduledQuizPlay;
