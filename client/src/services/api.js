import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL || 'http://localhost:5000/api'
});

// Automatically attaches token to every API call
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If any request gets 401, token is expired — log user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

//AUTH
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

//ROOMS
export const createRoom = (data) => api.post('/rooms', data);
export const getMyRooms = () => api.get('/rooms/my');
export const getRoom = (roomId) => api.get(`/rooms/${roomId}`);
export const joinRoom = (roomId) => api.post(`/rooms/${roomId}/join`);
export const deleteRoom = (roomId) => api.delete(`/rooms/${roomId}`);
export const changeLanguage = (roomId, language) =>
  api.patch(`/rooms/${roomId}/language`, { language });

//SESSIONS 
export const saveSession = (data) => api.post('/sessions', data);
export const getRoomSessions = (roomId) => api.get(`/sessions/room/${roomId}`);
export const deleteSession = (sessionId) => api.delete(`/sessions/${sessionId}`);

//EXECUTE
export const executeCode = (data) => api.post('/execute', data);

export default api;