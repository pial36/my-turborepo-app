// OpenAPI path definitions for every route not documented with @swagger JSDoc.
// Kept in one place (instead of comments on each handler) so it is easy to keep
// in sync with src/routes. Merged into the spec in lib/swagger.js.
const {
  ROLES, GOAL_STATUSES, ACTION_STATUSES, PRIORITIES, PERMISSIONS, REACTION_EMOJI, AUDIT_ACTIONS
} = require('@teamhub/shared')

const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const int = { type: 'integer' }
const str = { type: 'string' }
const date = { type: 'string', format: 'date-time' }

const pathParam = (name, description) => ({ name, in: 'path', required: true, schema: int, description })
const query = (name, schema, description) => ({ name, in: 'query', required: false, schema, description })

const json = (schema) => ({ content: { 'application/json': { schema } } })
const ok = (description, schema) => ({ description, ...(schema && json({ type: 'object', properties: { success: { type: 'boolean' }, data: schema } })) })
const err = { $ref: '#/components/responses/Error' }

const body = (properties, required = []) => ({
  required: true,
  ...json({ type: 'object', properties, ...(required.length && { required }) })
})

// op(tag, summary, { params, body, response, status, description })
const op = (tag, summary, o = {}) => ({
  tags: [tag],
  summary,
  ...(o.description && { description: o.description }),
  ...(o.params && { parameters: o.params }),
  ...(o.body && { requestBody: o.body }),
  responses: {
    [o.status || 200]: o.response || ok('OK'),
    400: err,
    401: err,
    403: err,
    ...(o.notFound && { 404: err })
  }
})

const ws = pathParam('workspaceId', 'Workspace id')
const wsId = pathParam('id', 'Workspace id')
const id = (what) => pathParam('id', `${what} id`)

const goalBody = {
  title: str,
  dueDate: { ...date, nullable: true },
  status: { type: 'string', enum: GOAL_STATUSES },
  ownerId: { ...int, description: 'Must be a workspace member; defaults to the caller' }
}
const itemBody = {
  title: str,
  priority: { type: 'string', enum: PRIORITIES },
  status: { type: 'string', enum: ACTION_STATUSES },
  dueDate: { ...date, nullable: true },
  goalId: { ...int, nullable: true, description: 'Goal in the same workspace' },
  assigneeId: { ...int, nullable: true, description: 'Member of the same workspace' }
}
const permissionBody = Object.fromEntries(PERMISSIONS.map((p) => [p.key, { type: 'boolean', description: p.label }]))

module.exports = {
  // ─── auth ───
  '/api/auth/refresh': {
    post: op('Auth', 'Rotate the access + refresh cookies', { description: 'Uses the refreshToken cookie.' })
  },
  '/api/auth/logout': {
    post: op('Auth', 'Clear the auth cookies')
  },
  '/api/auth/profile': {
    put: op('Auth', 'Update display name', { body: body({ name: str }, ['name']), response: ok('Updated user', ref('User')) })
  },
  '/api/auth/avatar': {
    put: op('Auth', 'Upload avatar (multipart field "avatar", image ≤ 2MB)', {
      body: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } } },
      response: ok('Updated user', ref('User'))
    })
  },

  // ─── workspaces ───
  '/api/workspaces': {
    get: op('Workspaces', "List the caller's workspaces", { response: ok('Workspaces', { type: 'array', items: ref('Workspace') }) }),
    post: op('Workspaces', 'Create a workspace (caller becomes ADMIN)', {
      status: 201,
      body: body({ name: str, description: str, accentColor: { ...str, example: '#6366f1' } }, ['name']),
      response: ok('Created', ref('Workspace'))
    })
  },
  '/api/workspaces/{id}': {
    get: op('Workspaces', 'Get a workspace with members', { params: [wsId], response: ok('Workspace', ref('Workspace')), notFound: true }),
    put: op('Workspaces', 'Update name / description / accent colour (admin)', {
      params: [wsId], body: body({ name: str, description: str, accentColor: str }), response: ok('Updated', ref('Workspace'))
    }),
    delete: op('Workspaces', 'Delete a workspace and everything in it (admin)', { params: [wsId] })
  },
  '/api/workspaces/{id}/invite': {
    post: op('Workspaces', 'Invite by email (canInviteMembers)', {
      status: 201,
      description: 'Existing users are added immediately. Unknown emails get a pending invite (`pending: true`) that is accepted when they register.',
      params: [wsId], body: body({ email: { ...str, format: 'email' } }, ['email'])
    })
  },
  '/api/workspaces/{id}/invites': {
    get: op('Workspaces', 'List pending invites (admin)', { params: [wsId] })
  },
  '/api/workspaces/{id}/invites/{inviteId}': {
    delete: op('Workspaces', 'Cancel a pending invite (admin)', { params: [wsId, pathParam('inviteId', 'Invite id')], notFound: true })
  },
  '/api/workspaces/{id}/members': {
    get: op('Workspaces', 'List members (for @mention autocomplete)', { params: [wsId], response: ok('Users', { type: 'array', items: ref('User') }) })
  },
  '/api/workspaces/{id}/members/{userId}': {
    delete: op('Workspaces', 'Remove a member (admin; never the last admin)', { params: [wsId, pathParam('userId', 'User id')], notFound: true })
  },
  '/api/workspaces/{id}/members/{userId}/role': {
    put: op('Workspaces', 'Change role (admin; never demote the last admin)', {
      params: [wsId, pathParam('userId', 'User id')], body: body({ role: { type: 'string', enum: ROLES } }, ['role']), notFound: true
    })
  },
  '/api/workspaces/{id}/members/{userId}/permissions': {
    put: op('Workspaces', 'Set permission flags (admin) — Advanced RBAC', { params: [wsId, pathParam('userId', 'User id')], body: body(permissionBody) })
  },

  // ─── goals ───
  '/api/goals/workspace/{workspaceId}': {
    get: op('Goals', 'List goals with milestones and action items', { params: [ws], response: ok('Goals', { type: 'array', items: ref('Goal') }) }),
    post: op('Goals', 'Create a goal (canCreateGoals)', { status: 201, params: [ws], body: body(goalBody, ['title']), response: ok('Created', ref('Goal')) })
  },
  '/api/goals/{id}': {
    get: op('Goals', 'Get a goal with milestones, items and activity feed', { params: [id('Goal')], response: ok('Goal', ref('Goal')), notFound: true }),
    put: op('Goals', 'Update a goal (owner or admin)', { params: [id('Goal')], body: body(goalBody), response: ok('Updated', ref('Goal')), notFound: true }),
    delete: op('Goals', 'Delete a goal (owner or admin)', { params: [id('Goal')], notFound: true })
  },
  '/api/goals/status/{id}': {
    put: op('Goals', 'Change goal status (any member; broadcast live)', {
      params: [id('Goal')], body: body({ status: { type: 'string', enum: GOAL_STATUSES } }, ['status']), notFound: true
    })
  },
  '/api/goals/{id}/updates': {
    post: op('Goals', 'Post a progress update to the activity feed', { status: 201, params: [id('Goal')], body: body({ content: str }, ['content']), notFound: true })
  },
  '/api/goals/{id}/milestones': {
    post: op('Goals', 'Add a milestone', {
      status: 201, params: [id('Goal')], body: body({ title: str, progress: { ...int, minimum: 0, maximum: 100 } }, ['title']), notFound: true
    })
  },
  '/api/goals/milestones/{milestoneId}': {
    put: op('Goals', 'Update milestone title / progress (0-100)', {
      params: [pathParam('milestoneId', 'Milestone id')], body: body({ title: str, progress: { ...int, minimum: 0, maximum: 100 } }), notFound: true
    }),
    delete: op('Goals', 'Delete a milestone', { params: [pathParam('milestoneId', 'Milestone id')], notFound: true })
  },

  // ─── action items ───
  '/api/action-items/workspace/{workspaceId}': {
    get: op('Action items', 'List action items', { params: [ws], response: ok('Items', { type: 'array', items: ref('ActionItem') }) }),
    post: op('Action items', 'Create an action item (canManageActionItems)', { status: 201, params: [ws], body: body(itemBody, ['title']), response: ok('Created', ref('ActionItem')) })
  },
  '/api/action-items/{id}': {
    put: op('Action items', 'Update (creator/admin; assignee may change status only)', { params: [id('Action item')], body: body(itemBody), response: ok('Updated', ref('ActionItem')), notFound: true }),
    delete: op('Action items', 'Delete (creator or admin)', { params: [id('Action item')], notFound: true })
  },
  '/api/action-items/{id}/status': {
    put: op('Action items', 'Change status (creator, assignee or admin)', {
      params: [id('Action item')], body: body({ status: { type: 'string', enum: ACTION_STATUSES } }, ['status']), notFound: true
    })
  },

  // ─── announcements ───
  '/api/announcements/workspace/{workspaceId}': {
    get: op('Announcements', 'List announcements (pinned first) with reactions and comments', { params: [ws], response: ok('Announcements', { type: 'array', items: ref('Announcement') }) }),
    post: op('Announcements', 'Publish a rich-text announcement (canPostAnnouncements)', {
      status: 201, params: [ws], description: 'HTML is sanitized server-side.',
      body: body({ content: { ...str, example: '<p>Hello <strong>team</strong></p>' } }, ['content']), response: ok('Created', ref('Announcement'))
    })
  },
  '/api/announcements/{id}': {
    delete: op('Announcements', 'Delete (author or admin)', { params: [id('Announcement')], notFound: true })
  },
  '/api/announcements/{id}/pin': {
    put: op('Announcements', 'Pin / unpin (admin)', { params: [id('Announcement')], body: body({ pinned: { type: 'boolean' } }), notFound: true })
  },
  '/api/announcements/{id}/reactions': {
    post: op('Announcements', 'Toggle an emoji reaction', {
      params: [id('Announcement')], body: body({ emoji: { type: 'string', enum: REACTION_EMOJI } }, ['emoji']), notFound: true
    })
  },
  '/api/announcements/{id}/comments': {
    post: op('Announcements', 'Comment; @Handle mentions notify workspace members', {
      status: 201, params: [id('Announcement')], body: body({ content: { ...str, example: 'Nice work @JaneSmith' } }, ['content']), notFound: true
    })
  },
  '/api/announcements/upload': {
    post: op('Announcements', 'Upload an attachment to Cloudinary (multipart field "file", ≤ 10MB)', {
      status: 201,
      body: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }
    })
  },

  // ─── analytics ───
  '/api/analytics/{workspaceId}': {
    get: op('Analytics', 'Dashboard stats', {
      params: [ws],
      response: ok('Stats', {
        type: 'object',
        properties: {
          totalGoals: int, completedThisWeek: int, overdueCount: int, overdueGoals: int, overdueActionItems: int,
          totalActionItems: int, completedActionItems: int,
          goalsByStatus: { type: 'array', items: { type: 'object', properties: { status: str, _count: { type: 'object', properties: { status: int } } } } }
        }
      })
    })
  },
  '/api/analytics/{workspaceId}/export': {
    get: op('Analytics', 'Export goals and action items as CSV', {
      params: [ws], response: { description: 'CSV file', content: { 'text/csv': { schema: str } } }
    })
  },

  // ─── notifications ───
  '/api/notifications': {
    get: op('Notifications', "The caller's notifications, newest first")
  },
  '/api/notifications/read-all': {
    put: op('Notifications', 'Mark all as read')
  },
  '/api/notifications/{id}/read': {
    put: op('Notifications', 'Mark one as read (own notifications only)', { params: [id('Notification')], notFound: true })
  },
  '/api/notifications/{id}': {
    delete: op('Notifications', 'Delete one (own notifications only)', { params: [id('Notification')], notFound: true })
  },

  // ─── audit log ───
  '/api/audit-logs/{workspaceId}': {
    get: op('Audit log', 'Filterable, append-only audit timeline (admin) — Audit log feature', {
      params: [
        ws,
        query('action', { type: 'string', enum: AUDIT_ACTIONS }, 'Filter by action'),
        query('userId', int, 'Filter by actor'),
        query('from', { type: 'string', format: 'date' }, 'From date (inclusive)'),
        query('to', { type: 'string', format: 'date' }, 'To date (inclusive)')
      ]
    })
  },
  '/api/audit-logs/{workspaceId}/export': {
    get: op('Audit log', 'Export the filtered audit log as CSV (admin)', {
      params: [ws, query('action', str), query('userId', int), query('from', str), query('to', str)],
      response: { description: 'CSV file', content: { 'text/csv': { schema: str } } }
    })
  }
}
