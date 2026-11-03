'use client';

import { useEffect } from 'react';
import { connectSocket, joinWorkspace, leaveWorkspace, attachSocketListeners, disconnectSocket } from '@/lib/socket';
import useAnnouncementStore from '@/stores/announcementStore';
import useGoalStore from '@/stores/goalStore';
import useActionStore from '@/stores/actionStore';
import useNotificationStore from '@/stores/notificationStore';
import useWorkspaceStore from '@/stores/workspaceStore';

export function useSocket(workspaceId) {
  const { socketAddAnnouncement, socketUpdateReaction, socketAddComment } = useAnnouncementStore();
  const { socketUpdateGoal, socketAddUpdate } = useGoalStore();
  const { socketUpdateItem } = useActionStore();
  const { addNotification, setOnlineMembers, socketAddMember } = useNotificationStore();
  const { socketAddMember: wsAddMember } = useWorkspaceStore();

  useEffect(() => {
    if (!workspaceId) return;

    const socket = connectSocket();

    const onConnect = () => {
      joinWorkspace(workspaceId);
    };

    socket.on('connect', onConnect);
    // If already connected, join immediately
    if (socket.connected) joinWorkspace(workspaceId);

    const cleanup = attachSocketListeners({
      onAnnouncementNew: (announcement) => {
        socketAddAnnouncement(announcement);
      },

      onReactionUpdated: ({ announcementId, action, emoji, userId }) => {
        socketUpdateReaction(announcementId, action, emoji, userId);
      },

      onCommentNew: ({ announcementId, comment }) => {
        socketAddComment(announcementId, comment);
      },

      onGoalStatusChanged: ({ goalId, status }) => {
        socketUpdateGoal({ id: goalId, status });
      },

      onGoalUpdatePosted: ({ goalId, update }) => {
        socketAddUpdate(goalId, update);
      },

      // { actionItemId, status }
      onActionItemStatusChanged: ({ actionItemId, status }) => {
        socketUpdateItem({ id: actionItemId, status });
      },

      // { workspaceId, userIds }
      onMembersOnline: ({ userIds }) => {
        setOnlineMembers(userIds);
      },

      onMemberInvited: (member) => {
        wsAddMember?.(member);
      },

      onNotificationNew: (notification) => {
        addNotification(notification);
      },
    });

    return () => {
      socket.off('connect', onConnect);
      cleanup();
      leaveWorkspace(workspaceId);
    };
  }, [workspaceId]);
}
