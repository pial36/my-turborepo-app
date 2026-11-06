// Domain constants shared by apps/api (validation) and apps/web (UI).
// Enum values must match apps/api/prisma/schema.prisma.
// CommonJS so the Express API can require() it; Next bundles it via transpilePackages.

const ROLES = ['ADMIN', 'MEMBER']

const GOAL_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']

const ACTION_STATUSES = ['TODO', 'DOING', 'DONE']

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']

// per-member permission flags on WorkspaceMember (admins bypass them)
const PERMISSIONS = [
  { key: 'canCreateGoals', label: 'Create Goals' },
  { key: 'canPostAnnouncements', label: 'Post Announcements' },
  { key: 'canInviteMembers', label: 'Invite Members' },
  { key: 'canManageActionItems', label: 'Manage Action Items' },
]

// reactions the API accepts on announcements
const REACTION_EMOJI = ['👍', '🎉', '🔥', '✅', '❤️', '🚀', '👏', '😂', '😮', '😢']

// every action written to the audit log
const AUDIT_ACTIONS = [
  'WORKSPACE_CREATED', 'WORKSPACE_UPDATED',
  'MEMBER_INVITED', 'INVITE_SENT', 'MEMBER_ROLE_CHANGED', 'MEMBER_PERMISSIONS_CHANGED', 'MEMBER_REMOVED',
  'GOAL_CREATED', 'GOAL_UPDATED', 'GOAL_STATUS_CHANGED', 'GOAL_DELETED',
  'ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT_PINNED', 'ANNOUNCEMENT_UNPINNED', 'ANNOUNCEMENT_DELETED',
  'ACTION_ITEM_CREATED', 'ACTION_ITEM_UPDATED', 'ACTION_ITEM_STATUS_CHANGED', 'ACTION_ITEM_DELETED',
]

module.exports = {
  ROLES,
  GOAL_STATUSES,
  ACTION_STATUSES,
  PRIORITIES,
  PERMISSIONS,
  REACTION_EMOJI,
  AUDIT_ACTIONS,
}
