import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL?.replace('/api', '')
  || 'http://localhost:5000';
// Socket connects to root URL, not /api

export const useSocket = (token) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return;

    const s = io(SOCKET_URL, {
      auth: { token }
    });

    s.on('connect', () => console.log('Socket connected'));
    s.on('connect_error', (err) => console.error('Socket error:', err.message));

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token]);

  return socket;
};