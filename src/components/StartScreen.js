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
  const [signupSuccess, setSignupSuccess] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    // Client-side validation for signup
    if (!isLogin) {
      const errors = {};
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        errors.username = 'Username must be 3-30 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        errors.username = 'Username can only contain letters, numbers, and underscores';
      }
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            }
          }
        });
        if (signUpError) throw signUpError;
        // Check if email confirmation is required (identities will be empty)
        if (signUpData?.user?.identities?.length === 0) {
          throw new Error('An account with this email already exists.');
        }
        setSignupSuccess(true);
        setTimeout(() => { setIsLogin(true); setSignupSuccess(false); }, 2000);
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
        redirectTo: window.location.origin + '/trivia-app/'
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
        {signupSuccess && (
          <div className="success-message" style={{ textAlign: 'center' }}>
            Account created! You can now log in.
          </div>
        )}
        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="auth-username">Username</label>
              <input id="auth-username" type="text" value={username} onChange={(e) => { setUsername(e.target.value); setFieldErrors(prev => ({ ...prev, username: null })); }} required />
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: null })); }} required />
            {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
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