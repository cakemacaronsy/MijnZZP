import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../components/shared/shared.css';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      navigate('/');
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
            fontSize: 24, fontWeight: 800, marginBottom: 12
          }}>M</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Welcome to MijnZZP</h1>
          <p className="text-secondary" style={{ marginTop: 4 }}>Bookkeeping for freelancers</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div className="alert-item error">{error}</div>}
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }} className="text-secondary">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
