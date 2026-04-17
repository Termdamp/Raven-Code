import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { joinRoom } from '../services/api';

export default function HomePage() {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    try {
      await joinRoom(roomId.trim());
      navigate(`/room/${roomId.trim()}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found');
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Cinzel:wght@700;900&family=Syne:wght@400;600;700;800&display=swap');
        .feature-card:hover { border-color: rgba(201,168,76,0.3) !important; background: #1a1a24 !important; transform: translateY(-2px); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(124,106,247,0.4); }
        .btn-secondary:hover { background: #1a1a24; border-color: #c9a84c !important; color: #e8c97a; }
        .join-btn:hover { background: #7c6af7; color: #fff; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Grid background */}
      <div style={s.gridBg} />
      <div style={s.orb1} />
      <div style={s.orb2} />

      <div style={s.inner}>
        {/* Logo mark */}
        <div style={s.ravenMark}>
          <div style={s.ravenIcon}>🐦‍⬛</div>
          <div>
            <div style={s.ravenName}>Ravens Code</div>
            <div style={s.ravenSub}>// collaborative IDE</div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={s.title}>
          Write code.<br />
          <span style={s.titleEm}>Together, in real-time.</span>
        </h1>

        <p style={s.sub}>
          Open a room. Share the ID.<br />
          Everyone edits the same file, simultaneously.
        </p>

        {/* CTA buttons */}
        <div style={s.actions}>
          {user ? (
            <button className="btn-primary" style={s.btnPrimary}
              onClick={() => navigate('/dashboard')}>
              Go to Dashboard →
            </button>
          ) : (
            <>
              <Link to="/register">
                <button className="btn-primary" style={s.btnPrimary}>
                  Create a room →
                </button>
              </Link>
              <Link to="/login">
                <button className="btn-secondary" style={s.btnSecondary}>
                  Sign in
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Join room bar */}
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleJoin} style={s.joinRow}>
          <input
            style={s.joinInput}
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            placeholder="Have a room ID? Paste it here..."
          />
          <button className="join-btn" style={s.joinBtn} type="submit">
            Join room →
          </button>
        </form>

        {/* Feature cards */}
        <div style={s.grid}>
          {[
            { icon: '⚡', name: 'Live sync', desc: 'Every keystroke synced instantly via WebSockets' },
            { icon: '▶', name: 'Run code', desc: 'Execute JS, Python, C++, Java in the browser' },
            { icon: '💬', name: 'Room chat', desc: 'Talk to collaborators without leaving the editor' },
            { icon: '📋', name: 'Version saves', desc: 'Snapshot and restore any point in history' },
          ].map(f => (
            <div className="feature-card" key={f.name} style={s.featureCard}>
              <div style={s.featureIcon}>{f.icon}</div>
              <div style={s.featureName}>{f.name}</div>
              <div style={s.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: "'Syne', sans-serif", position: 'relative', overflow: 'hidden' },
  gridBg: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(201,168,76,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.06) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%)',
    maskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%)',
  },
  orb1: { position: 'absolute', width: 320, height: 320, background: 'rgba(124,106,247,0.12)', borderRadius: '50%', filter: 'blur(70px)', top: -100, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' },
  orb2: { position: 'absolute', width: 180, height: 180, background: 'rgba(201,168,76,0.07)', borderRadius: '50%', filter: 'blur(70px)', top: 80, right: -40, pointerEvents: 'none' },
  inner: { position: 'relative', zIndex: 1, padding: '48px 32px 48px', textAlign: 'center', maxWidth: 720, margin: '0 auto' },
  ravenMark: { display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  ravenIcon: { width: 44, height: 44, background: '#1a1a24', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  ravenName: { fontFamily: "'Cinzel', serif", fontSize: 17, color: '#c9a84c', letterSpacing: '0.05em', textAlign: 'left' },
  ravenSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#55556a', textAlign: 'left', marginTop: 2 },
  title: { fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 16 },
  titleEm: { color: '#e8c97a' },
  sub: { fontSize: 13, color: '#9898b0', lineHeight: 1.8, maxWidth: 400, margin: '0 auto 32px', fontFamily: "'JetBrains Mono', monospace" },
  actions: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 },
  btnPrimary: { padding: '11px 26px', background: '#7c6af7', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  btnSecondary: { padding: '11px 26px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#f0f0f5', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  error: { background: '#5c1a1a', color: '#fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" },
  joinRow: { display: 'flex', gap: 8, maxWidth: 400, margin: '0 auto 40px', background: '#111118', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 6 },
  joinInput: { flex: 1, background: 'transparent', border: 'none', color: '#f0f0f5', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: '6px 10px', outline: 'none' },
  joinBtn: { padding: '8px 16px', background: '#1a1a24', border: 'none', borderRadius: 8, color: '#9898b0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, maxWidth: 680, margin: '0 auto' },
  featureCard: { background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, textAlign: 'left', transition: 'all 0.2s', cursor: 'default' },
  featureIcon: { fontSize: 18, marginBottom: 8 },
  featureName: { fontSize: 12, fontWeight: 700, marginBottom: 3 },
  featureDesc: { fontSize: 11, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 },
};