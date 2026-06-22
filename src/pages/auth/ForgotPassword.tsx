import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Zap, Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Zap size={32} />
          <h1>Crewline</h1>
        </div>

        {sent ? (
          <>
            <h2>Check your email</h2>
            <p className="auth-subtitle">If an account exists for <strong>{email}</strong>, we've sent a password reset link.</p>
            <Link to="/login" className="btn btn-primary btn-lg auth-submit"><ArrowLeft size={16} /> Back to Login</Link>
          </>
        ) : (
          <>
            <h2>Reset password</h2>
            <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="auth-field">
                <Mail size={16} />
                <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>

              <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                {loading ? <Loader2 size={16} className="spinner" /> : 'Send Reset Link'}
              </button>
            </form>

            <p className="auth-footer">
              <Link to="/login" className="auth-link"><ArrowLeft size={14} /> Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
