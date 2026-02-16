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