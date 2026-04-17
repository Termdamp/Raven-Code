<div align="center">

# 🐦‍⬛ Ravens Code

### A real-time collaborative code editor for developers
</div>

---

## What is Ravens Code?

Ravens Code is a full-stack collaborative coding platform where multiple developers can write, run, and discuss code together in real time — like Google Docs, but for code.

- **Hop into a room** → your editor syncs instantly with everyone else's
- **Run code** → output appears without leaving the page
- **Save snapshots** → restore any previous version in one click
- **Chat alongside** → with emoji reactions, no context switching needed

---

## Features

### 🔄 Real-time Collaboration
- Keystroke-level sync across all participants via **Socket.IO**
- Live language switching — everyone's syntax highlighting updates instantly
- Presence indicators showing who's currently in the room
- Debounced DB writes (3s idle) to keep MongoDB from being hammered

### ⚡ Code Execution
- Run **JavaScript, Python, C++, and Java** directly in the browser
- **stdin support** — feed input to your program before running
- Live output panel with pass/fail status badges
- Powered by **JDoodle API** sandbox execution

### 🏠 Room Management
- Create named rooms with a language preset
- Join any room via 6-character room ID
- Owner-only delete with soft-delete (sessions preserved)
- Dashboard showing all your rooms, sorted by activity

### 💾 Version History
- Save named snapshots of your code at any point
- Full session history per room with timestamps and author
- One-click restore — broadcasts the restored code to all participants instantly

### 💬 Chat
- Persistent in-room chat stored in MongoDB
- Quick emoji reactions bar
- Emoji picker with category filters and search
- System messages for join/leave events

### 🔐 Authentication
- JWT-based auth with bcrypt password hashing
- Token auto-attached to every API request via Axios interceptors
- Auto-logout on token expiry (401 handling)
- Passwords never returned in any query (`toJSON` override)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Monaco Editor, Socket.IO Client, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Real-time | Socket.IO |
| Auth | JWT, bcrypt |
| Code Execution | JDoodle API |
| Fonts | JetBrains Mono, Cinzel, Syne (Google Fonts) |

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- JDoodle API credentials ([free tier](https://www.jdoodle.com/compiler-api))

### 1. Clone the repo

```bash
git clone https://github.com/your-username/ravens-code.git
cd ravens-code
```

### 2. Set up the server

```bash
cd server
npm install
```

Create a `.env` file in `/server`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ravens-code
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:3000
JDOODLE_CLIENT_ID=your_jdoodle_client_id
JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret
```

```bash
npm run dev
```

### 3. Set up the client

```bash
cd client
npm install
```

Create a `.env` file in `/client`:

```env
REACT_APP_SERVER_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

```bash
npm start
```

App runs at `http://localhost:3000`.

---

## Project Structure

```
ravens-code/
├── client/                        # React frontend
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx    # Global auth state
│       ├── hooks/
│       │   └── useSocket.js       # Socket.IO connection hook
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── DashboardPage.jsx
│       │   └── RoomPage.jsx       # Main editor + chat + output
│       └── services/
│           └── api.js             # Axios instance + all API calls
│
└── server/                        # Node.js backend
    ├── config/
    │   └── db.js                  # MongoDB connection
    ├── controllers/
    │   ├── authController.js
    │   ├── roomController.js
    │   ├── sessionController.js
    │   └── executeController.js
    ├── middleware/
    │   └── authMiddleware.js      # JWT verification
    ├── models/
    │   ├── User.js
    │   ├── Room.js
    │   └── Session.js
    ├── routes/
    │   ├── auth.js
    │   ├── rooms.js
    │   ├── sessions.js
    │   └── execute.js
    ├── services/
    │   └── judge0Service.js       # JDoodle integration + starter code
    ├── socket/
    │   └── socketHandler.js       # All Socket.IO event logic
    └── index.js                   # Entry point
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Get current user |

### Rooms
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/rooms` | Create a new room |
| `GET` | `/api/rooms/my` | Get all rooms for current user |
| `GET` | `/api/rooms/:roomId` | Get single room |
| `POST` | `/api/rooms/:roomId/join` | Join a room |
| `DELETE` | `/api/rooms/:roomId` | Delete room (owner only) |
| `PATCH` | `/api/rooms/:roomId/language` | Change room language |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions` | Save a code snapshot |
| `GET` | `/api/sessions/room/:roomId` | Get all snapshots for a room |
| `DELETE` | `/api/sessions/:sessionId` | Delete a snapshot |

### Execute
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/execute` | Run code (body: `{ code, language, stdin }`) |

---

## Socket Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId, username }` | Join a room's socket channel |
| `code-change` | `{ roomId, code }` | Broadcast a code update |
| `save-code` | `{ roomId, code }` | Persist code to DB (debounced) |
| `language-change` | `{ roomId, language }` | Switch language for all |
| `chat-message` | `{ roomId, message }` | Send a chat message |
| `cursor-move` | `{ roomId, position }` | Broadcast cursor position |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `room-data` | `{ code, language }` | Initial state on join |
| `code-update` | `{ code }` | Incoming code from another user |
| `language-update` | `{ language }` | Language changed by another user |
| `new-message` | `{ username, message, timestamp }` | New chat message |
| `members-update` | `{ members }` | Updated online members list |
| `user-joined` | `{ username }` | Someone entered the room |
| `user-left` | `{ username }` | Someone left the room |

---

## Supported Languages

| Language | Runtime |
|---|---|
| JavaScript | Node.js 18 |
| Python | Python 3 |
| C++ | C++17 |
| Java | Java 17 |

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

---

## License

[MIT](LICENSE)

---

<div align="center">
Built with ☕ at IIT Guwahati Coding Club
</div>
