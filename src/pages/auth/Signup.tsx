import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Zap, Mail, Lock, User, Building2, Loader2 } from 'lucide-react';

export default function Signup() {
  const { signUp, session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (authLoading) return null;
  if (session && profile) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await signUp(email, password, fullName, businessName);
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <Zap size={32} />
            <h1>Crewline</h1>
          </div>
          <h2>Check your email</h2>
          <p className="auth-subtitle">We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          <Link to="/login" className="btn btn-primary btn-lg auth-submit">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Zap size={32} />
          <h1>Crewline</h1>
        </div>
        <h2>Create your account</h2>
        <p className="auth-subtitle">Start managing your service business</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <User size={16} />
            <input type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus />
          </div>

          <div className="auth-field">
            <Building2 size={16} />
            <input type="text" placeholder="Business name" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
          </div>

          <div className="auth-field">
            <Mail size={16} />
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="auth-field">
            <Lock size={16} />
            <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
