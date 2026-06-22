import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Zap, Lock, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
    } else {
      navigate('/login');
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
        <h2>Set new password</h2>
        <p className="auth-subtitle">Enter your new password below</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <Lock size={16} />
            <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoFocus />
          </div>

          <div className="auth-field">
            <Lock size={16} />
            <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spinner" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
