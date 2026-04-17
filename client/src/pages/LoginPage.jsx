import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginUser(form);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Cinzel:wght@700;900&family=Syne:wght@400;600;700;800&display=swap');
        .form-input:focus { border-color: #7c6af7 !important; box-shadow: 0 0 0 3px rgba(124,106,247,0.12); }
        .form-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,106,247,0.4); }
        .oauth-btn:hover { border-color: rgba(255,255,255,0.2) !important; color: #f0f0f5 !important; background: #22222f !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={s.bg} />

      <div style={s.card}>
        {/* Gold top line */}
        <div style={s.topLine} />

        <div style={s.logo}>
          <span>🐦‍⬛</span> Ravens Code
        </div>

        <h2 style={s.title}>Welcome back</h2>
        <p style={s.sub}>// enter your credentials</p>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.group}>
            <label style={s.label}>EMAIL</label>
            <input
              className="form-input"
              style={s.input}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div style={s.group}>
            <label style={s.label}>PASSWORD</label>
            <div style={s.inputWrap}>
              <input
                className="form-input"
                style={s.input}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div style={s.forgotRow}>
            <span style={s.forgotLink}>forgot password?</span>
          </div>

          <button className="form-btn" style={s.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <div style={s.divider}>
          <div style={s.divLine} />
          <span style={s.divText}>or continue with</span>
          <div style={s.divLine} />
        </div>

        <button className="oauth-btn" style={s.oauthBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p style={s.footer}>
          No account?{' '}
          <span style={s.link} onClick={() => navigate('/register')}>Register</span>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: "'Syne', sans-serif", position: 'relative' },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, rgba(124,106,247,0.07) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 390, background: '#111118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 34, overflow: 'hidden' },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #c9a84c, #e8c97a, transparent)' },
  logo: { fontFamily: "'Cinzel', serif", fontSize: 15, color: '#c9a84c', marginBottom: 26, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.05em' },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 6, color: '#f0f0f5' },
  sub: { fontSize: 12, color: '#55556a', marginBottom: 26, fontFamily: "'JetBrains Mono', monospace" },
  error: { background: '#5c1a1a', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" },
  group: { marginBottom: 14 },
  label: { display: 'block', fontSize: 11, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, letterSpacing: '0.08em' },
  input: { width: '100%', padding: '11px 14px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#f0f0f5', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' },
  inputWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#55556a', cursor: 'pointer', fontSize: 13, padding: 0 },
  forgotRow: { display: 'flex', justifyContent: 'flex-end', marginTop: -6, marginBottom: 14 },
  forgotLink: { fontSize: 11, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer' },
  submitBtn: { width: '100%', padding: 13, background: '#7c6af7', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', marginTop: 6 },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' },
  divLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' },
  divText: { fontSize: 11, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' },
  oauthBtn: { width: '100%', padding: 11, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#9898b0', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footer: { textAlign: 'center', marginTop: 18, fontSize: 12, color: '#55556a', fontFamily: "'JetBrains Mono', monospace" },
  link: { color: '#a78bfa', cursor: 'pointer' },
};