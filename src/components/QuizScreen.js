import React, { useState, useEffect } from 'react';
import './QuizScreen.css';

function QuizScreen({ config, onEnd }) {
  const { category, difficulty } = config;
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [hiddenAnswers, setHiddenAnswers] = useState([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Map our category IDs to The Trivia API categories
  const categoryMap = {
    '9': 'general_knowledge',
    '17': 'science',
    '21': 'sport_and_leisure',
    '23': 'history',
    '11': 'film_and_tv',
    '12': 'music',
    '22': 'geography',
    '18': 'science', // computers -> science
  };

  const fetchQuestions = async () => {
    try {
      const apiCategory = categoryMap[category] || 'general_knowledge';
      const url = `https://the-trivia-api.com/v2/questions?limit=10&categories=${apiCategory}&difficulties=${difficulty}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const formattedQuestions = data.map((q) => ({
          question: q.question.text,
          correctAnswer: q.correctAnswer,
          allAnswers: shuffleArray([
            q.correctAnswer,
            ...q.incorrectAnswers
          ])
        }));
        setQuestions(formattedQuestions);
        setLoading(false);
      } else {
        setError('Failed to load questions. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  const decodeHTML = (html) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
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
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    if (answer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setHintUsed(false);
      setHiddenAnswers([]);
    } else {
      onEnd(score + (selectedAnswer === questions[currentQuestionIndex].correctAnswer ? 1 : 0));
    }
  };

  const handleHint = () => {
    if (hintUsed || showResult) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const wrongAnswers = currentQuestion.allAnswers.filter(
      answer => answer !== currentQuestion.correctAnswer
    );
    
    // Randomly select 2 wrong answers to hide
    const answersToHide = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, 2);
    setHiddenAnswers(answersToHide);
    setHintUsed(true);
  };

  if (loading) {
    return <div className="quiz-screen loading">Loading questions...</div>;
  }

  if (error) {
    return <div className="quiz-screen error">{error}</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="quiz-screen">
      <div className="quiz-header">
        <div className="progress">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        <div className="score">Score: {score}/{questions.length}</div>
      </div>

      <div className="question-container">
        <h2 className="question">{currentQuestion.question}</h2>
        
        <div className="answers-grid">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isHidden = hiddenAnswers.includes(answer);
            const isSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            
            let className = 'answer-btn';
            if (isHidden) className += ' hidden';
            if (showResult && isSelected && !isCorrect) className += ' wrong';
            if (showResult && isCorrect) className += ' correct';
            if (isSelected && !showResult) className += ' selected';
            
            return (
              <button
                key={index}
                className={className}
                onClick={() => handleAnswerClick(answer)}
                disabled={showResult || isHidden}
              >
                {answer}
              </button>
            );
          })}
        </div>

        <div className="quiz-actions">
          <button 
            className="hint-btn" 
            onClick={handleHint}
            disabled={hintUsed || showResult}
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