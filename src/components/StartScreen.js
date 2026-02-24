import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './StartScreen.css';

function StartScreen({ onStart, onBack }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              username: username
            }
          }
        });
        if (signUpError) throw signUpError;
      }
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage('');
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setResetMessage('Password reset link sent! Check your email.');
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  if (resetMode) {
    return (
      <div className="start-screen">
        <h1>Trivia Quiz</h1>
        <div className="auth-container">
          <h2>Reset Password</h2>
          {error && <div className="error-message">{error}</div>}
          {resetMessage && <div className="success-message">{resetMessage}</div>}
          <form onSubmit={handlePasswordReset}>
            <div className="form-group">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <button className="back-to-login-btn" onClick={() => setResetMode(false)}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="start-screen">
      <h1>Trivia Quiz</h1>
      <div className="auth-container">
        <div className="auth-tabs">
          <button className={isLogin ? 'active' : ''} onClick={() => setIsLogin(true)}>Login</button>
          <button className={!isLogin ? 'active' : ''} onClick={() => setIsLogin(false)}>Sign Up</button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="auth-username">Username</label>
              <input id="auth-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        {isLogin && (
          <button className="forgot-password-btn" onClick={() => setResetMode(true)}>
            Forgot Password?
          </button>
        )}
      </div>
    </div>
  );
}

export default StartScreen;