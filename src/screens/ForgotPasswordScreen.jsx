import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft } from 'lucide-react';
import '../components/shared/shared.css';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}#/reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (err) setError(err.message);
      else setSent(true);
    } catch (e) {
      setError(e.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #EA580C, #F97316)',
            color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, marginBottom: 12,
          }}>M</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Reset Password</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>
            Enter your email and we'll send a reset link.
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 24,
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--color-success)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Mail size={24} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Check your email</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                We sent a password reset link to <strong>{email}</strong>.
              </p>
              <Link to="/login" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>{error}</div>
              )}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Link to="/login" style={{ color: 'var(--color-text-secondary)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
