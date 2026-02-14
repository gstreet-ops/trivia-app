import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './QuestionCreator.css';

const CATEGORIES = ['General Knowledge','Film','Music','Geography','History','Sports','Science & Nature','Arts & Literature'];

function QuestionCreator({ user, onBack, onSuccess }) {
  const [formData, setFormData] = useState({ category: 'General Knowledge', difficulty: 'medium', question_text: '', correct_answer: '', incorrect_answer1: '', incorrect_answer2: '', incorrect_answer3: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.question_text.trim() || !formData.correct_answer.trim() || !formData.incorrect_answer1.trim() || !formData.incorrect_answer2.trim() || !formData.incorrect_answer3.trim()) { setError('All fields required'); return; }
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('custom_questions').insert([{ creator_id: user.id, category: formData.category, difficulty: formData.difficulty, question_text: formData.question_text.trim(), correct_answer: formData.correct_answer.trim(), incorrect_answers: [formData.incorrect_answer1.trim(), formData.incorrect_answer2.trim(), formData.incorrect_answer3.trim()] }]);
      if (insertError) throw insertError;
      setFormData({ category: 'General Knowledge', difficulty: 'medium', question_text: '', correct_answer: '', incorrect_answer1: '', incorrect_answer2: '', incorrect_answer3: '' });
      if (onSuccess) onSuccess();
    } catch (err) { setError(err.message); }
    setSubmitting(false);
  };

  return (
    <div className="question-creator">
      <button className="back-btn" onClick={onBack}>Back</button>
      <h2>Create Custom Question</h2>
      <p className="subtitle">Submit your own trivia questions for community review!</p>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row"><div className="form-group"><label>Category</label><select name="category" value={formData.category} onChange={handleChange}>{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div><div className="form-group"><label>Difficulty</label><select name="difficulty" value={formData.difficulty} onChange={handleChange}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div></div>
        <div className="form-group"><label>Question</label><textarea name="question_text" value={formData.question_text} onChange={handleChange} placeholder="What is the capital of France?" rows={3} required /></div>
        <div className="form-group correct-answer"><label>Correct Answer ✓</label><input type="text" name="correct_answer" value={formData.correct_answer} onChange={handleChange} placeholder="Paris" required /></div>
        <div className="form-group"><label>Incorrect Answer 1</label><input type="text" name="incorrect_answer1" value={formData.incorrect_answer1} onChange={handleChange} placeholder="London" required /></div>
        <div className="form-group"><label>Incorrect Answer 2</label><input type="text" name="incorrect_answer2" value={formData.incorrect_answer2} onChange={handleChange} placeholder="Berlin" required /></div>
        <div className="form-group"><label>Incorrect Answer 3</label><input type="text" name="incorrect_answer3" value={formData.incorrect_answer3} onChange={handleChange} placeholder="Madrid" required /></div>
        <button type="submit" className="submit-btn" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Question for Review'}</button>
      </form>
    </div>
  );
}

export default QuestionCreator;