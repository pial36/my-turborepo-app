'use client';

import { useEffect } from 'react';
import { connectSocket, joinWorkspace, leaveWorkspace } from '@/lib/socket';
import useAnnouncementStore from '@/stores/announcementStore';
import useGoalStore from '@/stores/goalStore';
import useActionStore from '@/stores/actionStore';
import useNotificationStore from '@/stores/notificationStore';
import useWorkspaceStore from '@/stores/workspaceStore';

// Every event below is emitted by the API after a successful write.
// Handlers read store actions via getState() so they never go stale.
const handlers = {
  'announcement:new': (a) => useAnnouncementStore.getState().socketAddAnnouncement(a),
  'announcement:deleted': ({ announcementId }) =>
    useAnnouncementStore.getState().socketRemoveAnnouncement(announcementId),
  'announcement:pinned': ({ announcementId, pinned }) =>
    useAnnouncementStore.getState().socketSetPinned(announcementId, pinned),
  'reaction:updated': ({ announcementId, action, emoji, userId }) =>
    useAnnouncementStore.getState().socketUpdateReaction(announcementId, action, emoji, userId),
  'comment:new': ({ announcementId, comment }) =>
    useAnnouncementStore.getState().socketAddComment(announcementId, comment),

  'goal:created': (goal) => useGoalStore.getState().socketAddGoal(goal),
  'goal:statusChanged': ({ goalId, status }) =>
    useGoalStore.getState().socketUpdateGoal({ id: goalId, status }),
  'goal:updatePosted': ({ goalId, update }) => useGoalStore.getState().socketAddUpdate(goalId, update),

  'actionItem:created': (item) => useActionStore.getState().socketAddItem(item),
  'actionItem:updated': (item) => useActionStore.getState().socketUpdateItem(item),
  'actionItem:deleted': ({ actionItemId }) => useActionStore.getState().socketRemoveItem(actionItemId),

  'members:online': ({ userIds }) => useNotificationStore.getState().setOnlineMembers(userIds),
  'member:invited': (payload) => useWorkspaceStore.getState().socketAddMember(payload),
  'workspace:updated': (ws) => useWorkspaceStore.getState().socketUpdateWorkspace(ws),

  'notification:new': (n) => useNotificationStore.getState().addNotification(n),
};

export function useSocket(workspaceId) {
  useEffect(() => {
    if (!workspaceId) return;

    const socket = connectSocket();

    // (re)join the room on every connect, including automatic reconnects
    const onConnect = () => joinWorkspace(workspaceId);
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);

    return () => {
      socket.off('connect', onConnect);
      for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
      leaveWorkspace(workspaceId);
    };
  }, [workspaceId]);
}
