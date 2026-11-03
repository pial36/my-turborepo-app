import { io } from 'socket.io-client';

let socket = null;

// Auth is the httpOnly accessToken cookie, sent with the handshake via withCredentials
export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
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

// ─── Attach all workspace-level listeners ───────────────────
// Call once when entering the dashboard. Returns a cleanup fn.
export const attachSocketListeners = ({
  onAnnouncementNew,
  onReactionUpdated,
  onCommentNew,
  onGoalStatusChanged,
  onActionItemStatusChanged,
  onGoalUpdatePosted,
  onMembersOnline,
  onMemberInvited,
  onNotificationNew,
}) => {
  const s = getSocket();

  // Backend emits: 'announcement:new'
  if (onAnnouncementNew) s.on('announcement:new', onAnnouncementNew);
  // Backend emits: 'reaction:updated'
  if (onReactionUpdated) s.on('reaction:updated', onReactionUpdated);
  // Backend emits: 'comment:new'
  if (onCommentNew) s.on('comment:new', onCommentNew);
  // Backend emits: 'goal:statusChanged'  { goalId, status }
  if (onGoalStatusChanged) s.on('goal:statusChanged', onGoalStatusChanged);
  // Backend emits: 'actionItem:statusChanged'  { actionItemId, status }
  if (onActionItemStatusChanged) s.on('actionItem:statusChanged', onActionItemStatusChanged);
  // Backend emits: 'goal:updatePosted'  { goalId, update }
  if (onGoalUpdatePosted) s.on('goal:updatePosted', onGoalUpdatePosted);
  // Backend emits: 'members:online'  { workspaceId, userIds }
  if (onMembersOnline) s.on('members:online', onMembersOnline);
  // Backend emits: 'member:invited'
  if (onMemberInvited) s.on('member:invited', onMemberInvited);
  // Backend emits: 'notification:new'
  if (onNotificationNew) s.on('notification:new', onNotificationNew);

  // Return cleanup
  return () => {
    s.off('announcement:new', onAnnouncementNew);
    s.off('reaction:updated', onReactionUpdated);
    s.off('comment:new', onCommentNew);
    s.off('goal:statusChanged', onGoalStatusChanged);
    s.off('actionItem:statusChanged', onActionItemStatusChanged);
    s.off('goal:updatePosted', onGoalUpdatePosted);
    s.off('members:online', onMembersOnline);
    s.off('member:invited', onMemberInvited);
    s.off('notification:new', onNotificationNew);
  };
};
