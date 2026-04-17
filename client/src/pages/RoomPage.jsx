import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { getRoom, saveSession, getRoomSessions, executeCode } from '../services/api';

const LANG_DOTS = {
  javascript: '#f7df15',
  python: '#3572A5',
  cpp: '#f34b7d',
  java: '#b07219'
};

const EMOJIS = {
  all:     ['😀','😂','😍','🤔','😎','🥳','😭','🤯','👍','👎','❤️','🔥','✅','❌','💡','🚀','⚡','🎉','👀','💯','🙈','😤','🤝','👋','✨','💪','🎯','🐦','⚔️','🏰','🐉','📜','🗡️','👑'],
  faces:   ['😀','😂','😍','🤔','😎','🥳','😭','🤯','🙈','😤','😴','🥶','🤑','😏','🤗'],
  hands:   ['👍','👎','👋','🤝','💪','👏','🙏','🤞','✌️','🤟','👌','🤙'],
  objects: ['💡','🚀','⚡','🎉','🎯','📜','⚔️','🏰','🐉','🗡️','👑','🔮'],
  symbols: ['❤️','🔥','✅','❌','💯','✨','⭐','💀','♟️','🌙','☀️','💎'],
};

const QUICK_REACTIONS = ['👍','❤️','🔥','😂','👀','✅'];
const AVATAR_COLORS = ['#7c6af7','#4ade80','#60a5fa','#f472b6','#fbbf24','#fb923c'];

export default function RoomPage() {
  const { roomId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket(token);

  // Editor
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const isRemoteUpdate = useRef(false);
  const restoredCodeRef = useRef(null);
  const saveTimer = useRef(null);

  // Room
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [emojiCat, setEmojiCat] = useState('all');
  const [emojiSearch, setEmojiSearch] = useState('');
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Output
  const [output, setOutput] = useState('');
  const [outputStatus, setOutputStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [saveLabel, setSaveLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // Panel
  const [activePanel, setActivePanel] = useState('chat');

  // ── FETCH ROOM ──────────────────────────────────────
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await getRoom(roomId);
        setRoom(res.data);
        setLanguage(res.data.language);
      } catch {
        navigate('/dashboard');
      }
    };
    fetchRoom();
  }, [roomId, navigate]);

  // ── SOCKET EVENTS ───────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('join-room', { roomId, username: user.username });

    socket.on('room-data', ({ code: c, language: l }) => {
      setCode(c); setLanguage(l);
    });

    socket.on('code-update', ({ code: c }) => {
      isRemoteUpdate.current = true;
      setCode(c);
    });

    socket.on('language-update', ({ language: l }) => setLanguage(l));

    socket.on('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('members-update', ({ members: m }) => setMembers(m));

    socket.on('user-joined', ({ username }) => {
      setMessages(prev => [...prev, { system: true, message: `${username} joined the room`, timestamp: new Date().toISOString() }]);
    });

    socket.on('user-left', ({ username }) => {
      setMessages(prev => [...prev, { system: true, message: `${username} left the room`, timestamp: new Date().toISOString() }]);
    });

    return () => {
      socket.off('room-data'); socket.off('code-update');
      socket.off('language-update'); socket.off('new-message');
      socket.off('members-update'); socket.off('user-joined'); socket.off('user-left');
    };
  }, [socket, roomId, user]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── CODE CHANGE ─────────────────────────────────────
  const handleCodeChange = useCallback((newCode) => {
    if (isRemoteUpdate.current) { isRemoteUpdate.current = false; return; }
    if (restoredCodeRef.current !== null && newCode === restoredCodeRef.current) {
      restoredCodeRef.current = null;
      return;
    }
    restoredCodeRef.current = null;
    setCode(newCode);
    socket?.emit('code-change', { roomId, code: newCode });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      socket?.emit('save-code', { roomId, code: newCode });
    }, 3000);
  }, [socket, roomId]);

  // ── LANGUAGE CHANGE ─────────────────────────────────
  const handleLanguageChange = (e) => {
    const l = e.target.value;
    setLanguage(l);
    socket?.emit('language-change', { roomId, language: l });
  };

  // ── RUN CODE ────────────────────────────────────────
  const handleRun = async () => {
    setRunning(true);
    setOutput('Running...');
    setOutputStatus('');
    setActivePanel('output');
    try {
      const res = await executeCode({ code, language, stdin });
      setOutput(res.data.stdout || res.data.stderr || 'No output');
      setOutputStatus(res.data.status);
    } catch {
      setOutput('Execution failed. Try again.');
      setOutputStatus('Error');
    } finally {
      setRunning(false);
    }
  };

  // ── SAVE SESSION ────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSession({ roomId, code, language, label: saveLabel });
      setSaveLabel('');
      const res = await getRoomSessions(roomId);
      setSessions(res.data);
      setActivePanel('sessions');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── LOAD SESSIONS ───────────────────────────────────
  const handleShowSessions = async () => {
    try {
      const res = await getRoomSessions(roomId);
      setSessions(res.data);
      setActivePanel('sessions');
    } catch (err) { console.error(err); }
  };

  // ── RESTORE ─────────────────────────────────────────
  const handleRestore = (c, l) => {
    // Mark this code value so handleCodeChange ignores the Monaco onChange it triggers
    restoredCodeRef.current = c;
    isRemoteUpdate.current = false;
    setCode(c);
    setLanguage(l);
    // Broadcast to other room members
    socket?.emit('code-change', { roomId, code: c });
    socket?.emit('language-change', { roomId, language: l });
    // Also persist it server-side immediately
    socket?.emit('save-code', { roomId, code: c });
    setActivePanel('chat');
  };

  // ── CHAT ────────────────────────────────────────────
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('chat-message', { roomId, message: chatInput });
    setChatInput('');
    setShowPicker(false);
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // : trigger for emoji
    if (e.key === ':') {
      setTimeout(() => {
        const val = chatInputRef.current?.value || '';
        const lastColon = val.lastIndexOf(':');
        if (lastColon >= 0) {
          const q = val.slice(lastColon + 1);
          if (q.length >= 1) {
            setEmojiSearch(q);
            setShowPicker(true);
          }
        }
      }, 10);
    }
  };

  const insertEmoji = (emoji) => {
    setChatInput(prev => prev + emoji);
    chatInputRef.current?.focus();
  };

  const filteredEmojis = emojiSearch
    ? EMOJIS.all.filter(e => e.includes(emojiSearch))
    : EMOJIS[emojiCat] || EMOJIS.all;

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Cinzel:wght@700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #20202e; border-radius: 4px; }
        .ctrl-btn:hover { background: #1a1a28 !important; color: #f0f0f5 !important; }
        .back-btn:hover { background: rgba(124,106,247,0.18) !important; border-color: rgba(124,106,247,0.45) !important; color: #c4b5fd !important; }
        .tab:hover:not(.active-tab) { background: #141420 !important; color: #9898b0 !important; }
        .member-card:hover { background: #1a1a28 !important; }
        .emoji-btn:hover { background: #1a1a28 !important; }
        .emoji-cat-btn:hover { background: #1a1a28 !important; }
        .reaction-btn:hover { background: #1a1a28 !important; border-color: rgba(255,255,255,0.1) !important; transform: scale(1.12); }
        .restore-btn:hover { opacity: 0.85 !important; }
        .run-btn:hover { opacity: 0.9 !important; box-shadow: 0 3px 12px rgba(124,106,247,0.4) !important; }
        .lang-btn:hover { border-color: #7c6af7 !important; }
        .send-btn:hover { opacity: 0.9 !important; transform: translateY(-1px) !important; }
      `}</style>

      {/* ══ TOP BAR ══ */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <div style={s.logo}>🐦‍⬛ Ravens Code</div>
          <div style={s.logoDivider} />
          <button className="back-btn" style={s.backBtn} onClick={() => navigate('/dashboard')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Dashboard
          </button>
          <div style={s.breadcrumb}>
            <span style={s.breadSep}>/</span>
            <span style={s.breadRoom}>{room?.name || '...'}</span>
            <span style={s.breadId}>#{roomId}</span>
          </div>
        </div>
        <div style={s.topRight}>
          <div style={s.onlinePill}>
            <div style={s.onlineDot} />
            {members.length} online
          </div>
          <div style={s.userChip}>
            <div style={s.userAvatar}>{user?.username?.slice(0,1).toUpperCase()}</div>
            {user?.username}
          </div>
        </div>
      </div>

      {/* ══ BOTTOM BAR ══ */}
      <div style={s.bottomBar}>
        <div style={s.bottomLeft}>
          <button className="lang-btn" style={s.langBtn} onClick={() => {}}>
            <div style={{ ...s.langDot, background: LANG_DOTS[language] || '#888' }} />
            <select
              style={s.langSelect}
              value={language}
              onChange={handleLanguageChange}
            >
              <option value="javascript">javascript</option>
              <option value="python">python</option>
              <option value="cpp">c++</option>
              <option value="java">java</option>
            </select>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#55556a', pointerEvents: 'none' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>

        <div style={s.bottomRight}>
          <input
            style={s.saveLabelInput}
            placeholder="Save label (optional)"
            value={saveLabel}
            onChange={e => setSaveLabel(e.target.value)}
          />

          {/* Save */}
          <button className="ctrl-btn" style={s.ctrlBtn} onClick={handleSave} disabled={saving}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {saving ? 'Saving...' : 'Save'}
          </button>

          {/* History */}
          <button className="ctrl-btn" style={s.ctrlBtn} onClick={handleShowSessions}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            History
          </button>

          <div style={s.vDivider} />

          {/* Stdin toggle */}
          <button
            className="ctrl-btn"
            style={{ ...s.ctrlBtn, ...(showStdin ? { color: '#a78bfa', borderColor: 'rgba(124,106,247,0.35)' } : {}) }}
            onClick={() => setShowStdin(!showStdin)}
            title="Toggle stdin input"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
            stdin
          </button>

          {/* Run */}
          <button className="run-btn" style={s.runBtn} onClick={handleRun} disabled={running}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {running ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* ══ STDIN PANEL ══ */}
      {showStdin && (
        <div style={s.stdinPanel}>
          <div style={s.stdinLabel}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#a78bfa' }}>
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
            stdin
            <span style={s.stdinHint}>// input for cin / input() / Scanner — one value per line</span>
          </div>
          <textarea
            style={s.stdinArea}
            value={stdin}
            onChange={e => setStdin(e.target.value)}
            placeholder={"e.g.\n5\nhello world\n42"}
            rows={3}
            spellCheck={false}
          />
        </div>
      )}

      {/* ══ MAIN ══ */}
      <div style={s.main}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={s.sidebar}>
          <div style={s.sidebarHeader}>Online · {members.length}</div>

          <div style={s.sidebarSection}>
            {members.map((m, i) => (
              <div className="member-card" key={i} style={s.memberCard}>
                <div style={{ ...s.memberAvatar, background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {(m.username || '?').slice(0,1).toUpperCase()}
                  <div style={s.onlineIndicator} />
                </div>
                <div style={s.memberInfo}>
                  <div style={s.memberName}>{m.username}</div>
                  <div style={s.memberTag}>
                    {m.userId === user?._id ? 'you' : 'editor'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={s.sidebarDivider} />

          <div style={s.sidebarSection}>
            <div style={s.sideInfoLabel}>Room Info</div>
            {[
              ['lang', language],
              ['members', (room?.members?.length || 0)],
              ['saves', sessions.length],
            ].map(([k, v]) => (
              <div key={k} style={s.infoRow}>
                <span style={s.infoKey}>{k}</span>
                <span style={s.infoVal}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── EDITOR ── */}
        <div style={s.editorWrap}>
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontFamily: "'JetBrains Mono', monospace",
              fontLigatures: true,
              lineHeight: 22,
              padding: { top: 12 },
            }}
          />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={s.rightPanel}>

          {/* Tabs */}
          <div style={s.tabs}>
            {[
              { id: 'chat', label: 'Chat', icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              )},
              { id: 'output', label: 'Output', icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )},
              { id: 'sessions', label: 'Saves', icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              )},
            ].map(tab => (
              <button
                key={tab.id}
                className="tab"
                style={{
                  ...s.tab,
                  ...(activePanel === tab.id ? s.activeTab : {})
                }}
                onClick={() => tab.id === 'sessions' ? handleShowSessions() : setActivePanel(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── CHAT ── */}
          {activePanel === 'chat' && (
            <div style={s.chatPanel}>
              <div style={s.chatMessages}>
                {messages.map((msg, i) => (
                  msg.system ? (
                    <div key={i} style={s.sysMsg}>— {msg.message} —</div>
                  ) : (
                    <div key={i} style={s.msg}>
                      <div style={s.msgHeader}>
                        <div style={{ ...s.msgAvatar, background: AVATAR_COLORS[members.findIndex(m => m.username === msg.username) % AVATAR_COLORS.length] || '#7c6af7' }}>
                          {(msg.username || '?').slice(0,1).toUpperCase()}
                        </div>
                        <span style={{ ...s.msgUsername, color: AVATAR_COLORS[members.findIndex(m => m.username === msg.username) % AVATAR_COLORS.length] || '#a78bfa' }}>
                          {msg.username}
                        </span>
                        <span style={s.msgTime}>
                          {new Date(msg.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={s.msgText}>{msg.message}</div>
                    </div>
                  )
                ))}
                <div ref={chatEndRef} />
              </div>

              <div style={s.chatBottom}>
                {/* Quick reactions */}
                <div style={s.quickReactions}>
                  {QUICK_REACTIONS.map(e => (
                    <button key={e} className="reaction-btn" style={s.reactionBtn} onClick={() => insertEmoji(e)}>
                      {e}
                    </button>
                  ))}
                </div>

                {/* Emoji picker */}
                {showPicker && (
                  <div style={s.emojiPicker}>
                    <input
                      style={s.emojiSearch}
                      placeholder="Search emoji..."
                      value={emojiSearch}
                      onChange={e => setEmojiSearch(e.target.value)}
                      autoFocus
                    />
                    <div style={s.emojiCats}>
                      {Object.keys(EMOJIS).map(cat => (
                        <button
                          key={cat}
                          className="emoji-cat-btn"
                          style={{ ...s.emojiCatBtn, ...(emojiCat === cat && !emojiSearch ? s.emojiCatActive : {}) }}
                          onClick={() => { setEmojiCat(cat); setEmojiSearch(''); }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div style={s.emojiGrid}>
                      {filteredEmojis.map(e => (
                        <button key={e} className="emoji-btn" style={s.emojiBtn} onClick={() => insertEmoji(e)}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input row */}
                <div style={s.chatInputRow}>
                  <button
                    style={s.emojiToggle}
                    onClick={() => { setShowPicker(!showPicker); setEmojiSearch(''); }}
                    title="Emoji"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  </button>
                  <textarea
                    ref={chatInputRef}
                    style={s.chatInput}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Message..."
                    rows={1}
                  />
                  <button className="send-btn" style={s.sendBtn} onClick={handleSendMessage}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── OUTPUT ── */}
          {activePanel === 'output' && (
            <div style={s.outputPanel}>
              <div style={s.outputHeader}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#4ade80' }}>
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Output
                {outputStatus && (
                  <span style={{ ...s.statusBadge, background: outputStatus === 'Accepted' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: outputStatus === 'Accepted' ? '#4ade80' : '#f87171' }}>
                    {outputStatus}
                  </span>
                )}
              </div>
              <pre style={s.outputBody}>{output || 'Run your code to see output here.'}</pre>
            </div>
          )}

          {/* ── SESSIONS ── */}
          {activePanel === 'sessions' && (
            <div style={s.sessionsPanel}>
              <div style={s.outputHeader}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Version History
              </div>
              <div style={s.sessionList}>
                {sessions.length === 0 ? (
                  <div style={s.emptyState}>No saves yet.</div>
                ) : sessions.map(sess => (
                  <div key={sess._id} style={s.sessionCard}>
                    <div style={s.sessionLabel}>{sess.label || 'Untitled save'}</div>
                    <div style={s.sessionMeta}>{sess.language} · {new Date(sess.createdAt).toLocaleString()}</div>
                    <div style={s.sessionMeta}>by {sess.savedBy?.username}</div>
                    <button className="restore-btn" style={s.restoreBtn} onClick={() => handleRestore(sess.code, sess.language)}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: "'Syne', sans-serif", overflow: 'hidden' },

  // Top bar
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', height: 44, background: '#0f0f17', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontFamily: "'Cinzel', serif", fontSize: 14, color: '#c9a84c', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 7 },
  logoDivider: { width: 1, height: 20, background: 'rgba(255,255,255,0.08)' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'rgba(124,106,247,0.1)', border: '1px solid rgba(124,106,247,0.25)', borderRadius: 7, color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 },
  breadSep: { color: '#55556a' },
  breadRoom: { color: '#9898b0' },
  breadId: { color: '#55556a', fontSize: 11, background: '#1a1a28', padding: '2px 7px', borderRadius: 5 },
  topRight: { display: 'flex', alignItems: 'center', gap: 10 },
  onlinePill: { display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#55556a' },
  onlineDot: { width: 6, height: 6, borderRadius: '50%', background: '#4ade80' },
  userChip: { display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', background: '#1a1a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#9898b0' },
  userAvatar: { width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #7c6af7, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' },

  // Bottom bar
  bottomBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', height: 40, background: '#141420', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, gap: 12 },
  bottomLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  bottomRight: { display: 'flex', alignItems: 'center', gap: 6 },
  langBtn: { display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' },
  langDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  langSelect: { background: 'transparent', border: 'none', color: '#085e12', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' },
  saveLabelInput: { padding: '5px 10px', background: '#1a1a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, color: '#9898b0', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: 'none', width: 160, transition: 'all 0.15s' },
  ctrlBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, background: 'transparent', color: '#9898b0', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' },
  vDivider: { width: 1, height: 18, background: 'rgba(255,255,255,0.08)' },
  runBtn: { display: 'flex', alignItems: 'center', gap: 7, padding: '6px 16px', background: '#7c6af7', border: 'none', borderRadius: 7, color: '#fff', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' },

  // Main layout
  main: { display: 'flex', flex: 1, overflow: 'hidden' },

  // Sidebar
  sidebar: { width: 155, flexShrink: 0, background: '#0f0f17', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  sidebarHeader: { padding: '10px 12px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  sidebarSection: { padding: '10px 10px' },
  memberCard: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, marginBottom: 4, transition: 'background 0.15s', cursor: 'default' },
  memberAvatar: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', position: 'relative', flexShrink: 0 },
  onlineIndicator: { width: 7, height: 7, borderRadius: '50%', background: '#4ade80', border: '2px solid #0f0f17', position: 'absolute', bottom: -1, right: -1 },
  memberInfo: { minWidth: 0 },
  memberName: { fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  memberTag: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#55556a' },
  sidebarDivider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 10px' },
  sideInfoLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  infoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 5 },
  infoKey: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#55556a' },
  infoVal: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#9898b0' },

  // Editor
  editorWrap: { flex: 1, overflow: 'hidden' },

  // Right panel
  rightPanel: { width: 290, flexShrink: 0, background: '#0f0f17', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' },
  tabs: { display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 },
  tab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 4px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#55556a', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, transition: 'all 0.15s' },
  activeTab: { color: '#a78bfa', borderBottomColor: '#7c6af7' },

  // Chat
  chatPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatMessages: { flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 10 },
  sysMsg: { textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#55556a', padding: '2px 0' },
  msg: { display: 'flex', flexDirection: 'column', gap: 3 },
  msgHeader: { display: 'flex', alignItems: 'center', gap: 6 },
  msgAvatar: { width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 },
  msgUsername: { fontSize: 12, fontWeight: 700 },
  msgTime: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#55556a', marginLeft: 'auto' },
  msgText: { fontSize: 13, color: '#9898b0', lineHeight: 1.5, paddingLeft: 26, wordBreak: 'break-word' },
  chatBottom: { flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' },
  quickReactions: { display: 'flex', gap: 4, padding: '6px 8px' },
  reactionBtn: { background: '#1a1a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s', lineHeight: 1 },
  emojiPicker: { padding: 8, background: '#141420', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  emojiSearch: { width: '100%', padding: '6px 10px', background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f0f5', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none', marginBottom: 8, boxSizing: 'border-box' },
  emojiCats: { display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' },
  emojiCatBtn: { padding: '3px 8px', background: '#1a1a28', border: 'none', borderRadius: 6, color: '#55556a', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' },
  emojiCatActive: { background: '#7c6af7', color: '#fff' },
  emojiGrid: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, maxHeight: 100, overflowY: 'auto' },
  emojiBtn: { background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'background 0.1s', lineHeight: 1 },
  chatInputRow: { display: 'flex', gap: 6, padding: 8, alignItems: 'flex-end' },
  emojiToggle: { background: 'transparent', border: 'none', color: '#55556a', cursor: 'pointer', padding: '8px 4px', flexShrink: 0, transition: 'color 0.15s', display: 'flex', alignItems: 'center' },
  chatInput: { flex: 1, padding: '8px 10px', background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f0f0f5', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none', resize: 'none', lineHeight: 1.4, maxHeight: 80, overflowY: 'auto' },
  sendBtn: { padding: '8px 10px', background: '#7c6af7', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Output
  outputPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  outputHeader: { padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#55556a', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 },
  statusBadge: { padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 },
  outputBody: { flex: 1, padding: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#4ec9b0', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6 },

  // Stdin panel
  stdinPanel: { background: '#0f0f17', borderBottom: '1px solid rgba(124,106,247,0.2)', padding: '8px 16px', flexShrink: 0 },
  stdinLabel: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#a78bfa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' },
  stdinHint: { color: '#55556a', textTransform: 'none', letterSpacing: 'normal', fontSize: 10, marginLeft: 4 },
  stdinArea: { width: '100%', padding: '8px 12px', background: '#1a1a28', border: '1px solid rgba(124,106,247,0.2)', borderRadius: 8, color: '#c4b5fd', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box', minHeight: 60, maxHeight: 160 },

  // Sessions panel
  sessionsPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  sessionList: { flex: 1, overflowY: 'auto', padding: 8 },
  sessionCard: { background: '#141420', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, marginBottom: 8 },
  sessionLabel: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  sessionMeta: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#55556a', marginBottom: 2 },
  restoreBtn: { marginTop: 8, padding: '4px 12px', background: '#7c6af7', border: 'none', borderRadius: 6, color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: 'pointer', transition: 'opacity 0.15s' },
  emptyState: { padding: 20, color: '#55556a', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 },
};