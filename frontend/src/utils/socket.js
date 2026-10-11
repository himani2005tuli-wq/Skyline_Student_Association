import { io } from 'socket.io-client';
import { getStoredToken } from '@/api/client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = getStoredToken();
    const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const backendUrl = rawBackendUrl.trim().replace(/\/+$/, '');

    socket = io(backendUrl || window.location.origin, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      const currentToken = getStoredToken();
      if (currentToken) {
        socket.emit('authenticate', currentToken);
      }
    });
  }
  return socket;
}

export function updateSocketAuth() {
  if (socket && socket.connected) {
    const token = getStoredToken();
    socket.emit('authenticate', token);
  }
}

export function subscribeToNotifications(callback) {
  const s = getSocket();
  const handler = (data) => {
    if (callback) callback(data);
  };

  s.on('notification:new', handler);

  return () => {
    s.off('notification:new', handler);
  };
}

export default getSocket;
