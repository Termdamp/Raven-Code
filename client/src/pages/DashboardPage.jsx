import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyRooms, createRoom, deleteRoom, joinRoom } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LANG_COLORS = {
  javascript: { bg: 'rgba(247,223,21,0.08)', color: '#f7df15', border: 'rgba(247,223,21,0.18)' },
  python:     { bg: 'rgba(53,114,165,0.12)',  color: '#60a5fa', border: 'rgba(53,114,165,0.25)' },
  cpp:        { bg: 'rgba(243,75,125,0.08)',  color: '#f472b6', border: 'rgba(243,75,125,0.18)' },
  java:       { bg: 'rgba(176,114,25,0.08)',  color: '#fbbf24', border: 'rgba(176,114,25,0.18)' },
};

const AVATAR_COLORS = ['#7c6af7','#4ade80','#60a5fa','#f472b6','#fbbf24'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState(null);
  const [newRoom, setNewRoom] = useState({ name: '', language: 'javascript' });
  const [creating, setCreating] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    try {
      const res = await getMyRooms();
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoom.name.trim()) return;
    setCreating(true);
    try {
      const res = await createRoom(newRoom);
      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const rid = joinRoomId.trim();
    if (!rid) return;
    setJoining(true);
    setJoinError('');
    try {
      await joinRoom(rid);
      navigate(`/room/${rid}`);
    } catch (err) {
      setJoinError(err?.response?.data?.message || 'Room not found. Check the ID and try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async (roomId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this room?')) return;
    try {
      await deleteRoom(roomId);
      setRooms(rooms.filter(r => r.roomId !== roomId));
    } catch (err) {
      console.error(err);
    }
  };

  const togglePanel = (panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
    setJoinError('');
    setJoinRoomId('');
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Cinzel:wght@700;900&family=Syne:wght@400;600;700;800&display=swap');
        .room-card:hover { border-color: rgba(124,106,247,0.35) !important; transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .del-btn:hover { color: #f87171 !important; }
        .new-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(124,106,247,0.4); }
        .join-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(74,222,128,0.25); }
        .create-input:focus, .lang-select:focus, .join-input:focus { border-color: #7c6af7 !important; outline: none; }
        .logout-btn:hover { border-color: rgba(255,255,255,0.2) !important; color: #f0f0f5 !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>🐦‍⬛ Ravens Code</div>
        <div style={s.headerRight}>
          <div style={s.avatar}>{user?.username?.slice(0,2).toUpperCase()}</div>
          <span style={s.userName}>{user?.username}</span>
          <button className="logout-btn" style={s.logoutBtn} onClick={logout}>logout</button>
        </div>
      </div>

      <div style={s.body}>
        {/* Greeting */}
        <div style={s.greeting}>
          {getGreeting()}, <span style={s.greetName}>{user?.username}</span> 👋
        </div>
        <div style={s.greetSub}>// {rooms.length} active room{rooms.length !== 1 ? 's' : ''} in the realm</div>

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Rooms</div>
            <div style={{ ...s.statVal, color: '#a78bfa' }}>{rooms.length}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Languages</div>
            <div style={{ ...s.statVal, color: '#4ade80' }}>
              {[...new Set(rooms.map(r => r.language))].length || 0}
            </div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Collaborators</div>
            <div style={{ ...s.statVal, color: '#60a5fa' }}>
              {[...new Set(rooms.flatMap(r => r.members?.map(m => m._id || m)))].length}
            </div>
          </div>
        </div>

        {/* Section header */}
        <div style={s.sectionBar}>
          <div style={s.sectionTitle}>Your Rooms</div>
          <div style={s.actionBtns}>
            <button
              className="join-btn"
              style={{ ...s.joinBtn, ...(activePanel === 'join' ? s.joinBtnActive : {}) }}
              onClick={() => togglePanel('join')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Join Room
            </button>
            <button
              className="new-btn"
              style={{ ...s.newBtn, ...(activePanel === 'create' ? s.newBtnActive : {}) }}
              onClick={() => togglePanel('create')}
            >
              + New Room
            </button>
          </div>
        </div>

        {/* Join Room panel */}
        {activePanel === 'join' && (
          <div style={{ ...s.createPanel, borderColor: 'rgba(74,222,128,0.2)' }}>
            <div style={s.createPanelTitle}>// join existing room</div>
            <form onSubmit={handleJoin} style={s.createRow}>
              <input
                className="join-input"
                style={{ ...s.createInput, flex: 1 }}
                placeholder="Enter Room ID (e.g. abc123xy)..."
                value={joinRoomId}
                onChange={e => { setJoinRoomId(e.target.value); setJoinError(''); }}
                required
                autoFocus
              />
              <button style={{ ...s.createGoBtn, background: '#4ade80' }} type="submit" disabled={joining}>
                {joining ? '...' : 'Join →'}
              </button>
            </form>
            {joinError && (
              <div style={s.joinError}>{joinError}</div>
            )}
            <div style={s.joinHint}>// ask your collaborator for the Room ID shown in their editor URL or room card</div>
          </div>
        )}

        {/* Create Room panel */}
        {activePanel === 'create' && (
          <div style={s.createPanel}>
            <div style={s.createPanelTitle}>// new room</div>
            <form onSubmit={handleCreate} style={s.createRow}>
              <input
                className="create-input"
                style={s.createInput}
                placeholder="Room name..."
                value={newRoom.name}
                onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                required
              />
              <select
                className="lang-select"
                style={s.langSelect}
                value={newRoom.language}
                onChange={e => setNewRoom({ ...newRoom, language: e.target.value })}
              >
                <option value="javascript">javascript</option>
                <option value="python">python</option>
                <option value="cpp">cpp</option>
                <option value="java">java</option>
              </select>
              <button style={s.createGoBtn} type="submit" disabled={creating}>
                {creating ? '...' : 'Create →'}
              </button>
            </form>
          </div>
        )}

        {/* Rooms grid */}
        {loading ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🐦‍⬛</div>
            <div style={s.emptyTitle}>Loading rooms...</div>
          </div>
        ) : rooms.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🐦‍⬛</div>
            <div style={s.emptyTitle}>No rooms yet</div>
            <div style={s.emptySub}>// create your first room or join one with a room ID</div>
          </div>
        ) : (
          <div style={s.grid}>
            {rooms.map((room, ri) => {
              const lc = LANG_COLORS[room.language] || LANG_COLORS.javascript;
              return (
                <div
                  key={room._id}
                  className="room-card"
                  style={s.roomCard}
                  onClick={() => navigate(`/room/${room.roomId}`)}
                >
                  <div style={s.cardTop}>
                    <span style={{ ...s.langBadge, background: lc.bg, color: lc.color, border: `1px solid ${lc.border}` }}>
                      {room.language}
                    </span>
                    {room.owner?._id === user?._id && (
                      <button
                        className="del-btn"
                        style={s.delBtn}
                        onClick={e => handleDelete(room.roomId, e)}
                      >🗑</button>
                    )}
                  </div>
                  <div style={s.cardName}>{room.name}</div>
                  <div style={s.cardId}># {room.roomId}</div>
                  <div style={s.cardFooter}>
                    <div style={s.avatars}>
                      {(room.members || []).slice(0, 4).map((m, i) => (
                        <div key={i} style={{ ...s.miniAvatar, background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                          {(m.username || '?').slice(0,1).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span style={s.cardTime}>
                      {new Date(room.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: "'Syne', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontFamily: "'Cinzel', serif", fontSize: 15, color: '#c9a84c', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.05em' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #7c6af7, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' },
  userName: { fontSize: 13, color: '#9898b0', fontFamily: "'JetBrains Mono', monospace" },
  logoutBtn: { padding: '5px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' },
  body: { padding: '24px 20px', maxWidth: 1100, margin: '0 auto' },
  greeting: { fontSize: 20, fontWeight: 800, marginBottom: 4 },
  greetName: { color: '#e8c97a' },
  greetSub: { fontSize: 12, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", marginBottom: 22 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 26 },
  statCard: { background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 },
  statLabel: { fontSize: 10, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' },
  statVal: { fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" },
  sectionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: 700 },
  actionBtns: { display: 'flex', gap: 8, alignItems: 'center' },
  joinBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, color: '#4ade80', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  joinBtnActive: { background: 'rgba(74,222,128,0.18)', borderColor: 'rgba(74,222,128,0.45)' },
  newBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#7c6af7', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  newBtnActive: { background: '#6b5ce7', boxShadow: '0 4px 14px rgba(124,106,247,0.4)' },
  createPanel: { background: '#1a1a24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 16, marginBottom: 16 },
  createPanelTitle: { fontSize: 12, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 },
  createRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  createInput: { flex: 2, minWidth: 130, padding: '9px 12px', background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, color: '#f0f0f5', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, boxSizing: 'border-box' },
  langSelect: { padding: '9px 12px', background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, color: '#f0f0f5', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 },
  createGoBtn: { padding: '9px 18px', background: '#4ade80', border: 'none', borderRadius: 9, color: '#052e16', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  joinError: { marginTop: 10, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 },
  joinHint: { marginTop: 10, fontSize: 11, color: '#55556a', fontFamily: "'JetBrains Mono', monospace" },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 },
  roomCard: { background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'all 0.25s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  langBadge: { padding: '3px 9px', borderRadius: 20, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 },
  delBtn: { background: 'transparent', border: 'none', color: '#55556a', cursor: 'pointer', fontSize: 13, transition: 'color 0.2s' },
  cardName: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  cardId: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#55556a', marginBottom: 12 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  avatars: { display: 'flex' },
  miniAvatar: { width: 20, height: 20, borderRadius: '50%', border: '2px solid #111118', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, marginLeft: -5, color: '#fff' },
  cardTime: { fontSize: 11, color: '#55556a', fontFamily: "'JetBrains Mono', monospace" },
  empty: { textAlign: 'center', padding: '48px 20px' },
  emptyIcon: { fontSize: 36, marginBottom: 12, opacity: 0.4 },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: '#9898b0', marginBottom: 6 },
  emptySub: { fontSize: 12, color: '#55556a', fontFamily: "'JetBrains Mono', monospace" },
};
