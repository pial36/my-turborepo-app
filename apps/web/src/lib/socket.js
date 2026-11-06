import { io } from 'socket.io-client';

let socket = null;

// Auth is the httpOnly accessToken cookie, sent with the handshake via withCredentials.
// No URL by default: same origin, proxied to the API by next.config.mjs rewrites.
// NEXT_PUBLIC_SOCKET_URL connects straight to the API instead (cross-site cookies).
export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

// Join a workspace room — backend validates membership
export const joinWorkspace = (workspaceId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('workspace:join', workspaceId);
  }
};

export const leaveWorkspace = (workspaceId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('workspace:leave', workspaceId);
  }
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
};
