/**
 * Integration tests: Express app + real PostgreSQL.
 *
 *   DATABASE_URL=postgresql://.../teamhub_test npm test
 *
 * The suite WIPES every table, so it refuses to run unless the database
 * name contains "test".
 */
const request = require('supertest')

const DB_URL = process.env.DATABASE_URL || ''
if (!/test/i.test(DB_URL.split('/').pop() || '')) {
  throw new Error('Refusing to run: DATABASE_URL must point at a database whose name contains "test"')
}

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret'

// never send real email from tests
jest.mock('../src/lib/mailer', () => ({ sendMail: jest.fn().mockResolvedValue({}) }))

const { app, io } = require('../src/app')
const prisma = require('../src/lib/prisma')

const PASSWORD = 'Passw0rd!'

const wipe = async () => {
  // children first; auditLog is append-only for UPDATE, DELETE is allowed
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.reaction.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.actionItem.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.goalUpdate.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.workspaceInvite.deleteMany(),
    prisma.workspaceMember.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

// registers a user and returns a cookie-carrying agent
const signUp = async (name, email) => {
  const agent = request.agent(app)
  const res = await agent.post('/api/auth/register').send({ name, email, password: PASSWORD })
  expect(res.status).toBe(201)
  return { agent, user: res.body.data }
}

let alice, bob, carol, mallory   // alice: admin, bob + carol: members, mallory: outsider
let workspace, otherWorkspace

beforeAll(async () => {
  await wipe()
  ;[alice, bob, carol, mallory] = await Promise.all([
    signUp('Alice Admin', 'alice@test.dev'),
    signUp('Bob Builder', 'bob@test.dev'),
    signUp('Carol Coder', 'carol@test.dev'),
    signUp('Mallory Outsider', 'mallory@test.dev'),
  ])

  workspace = (await alice.agent.post('/api/workspaces')
    .send({ name: 'Team', description: 'd', accentColor: '#6366f1' })).body.data
  otherWorkspace = (await mallory.agent.post('/api/workspaces').send({ name: 'Elsewhere' })).body.data

  for (const { user } of [bob, carol]) {
    const res = await alice.agent.post(`/api/workspaces/${workspace.id}/invite`).send({ email: user.email })
    expect(res.status).toBe(201)
  }
  // let bob create goals
  await alice.agent.put(`/api/workspaces/${workspace.id}/members/${bob.user.id}/permissions`)
    .send({ canCreateGoals: true, canManageActionItems: true })
})

afterAll(async () => {
  io.close()
  await prisma.$disconnect()
})

describe('auth', () => {
  test('sets httpOnly cookies and /me returns the user without the password', async () => {
    const agent = request.agent(app)
    const res = await agent.post('/api/auth/login').send({ email: 'alice@test.dev', password: PASSWORD })
    expect(res.status).toBe(200)
    const cookies = res.headers['set-cookie'].join(';')
    expect(cookies).toMatch(/accessToken=.*HttpOnly/)
    expect(res.body.data.password).toBeUndefined()

    const me = await agent.get('/api/auth/me')
    expect(me.body.data.email).toBe('alice@test.dev')
  })

  test('rejects requests without a session', async () => {
    const res = await request(app).get('/api/workspaces')
    expect(res.status).toBe(401)
  })

  test('profile update only changes the name', async () => {
    const res = await bob.agent.put('/api/auth/profile')
      .send({ name: 'Bob B.', password: 'plaintext', email: 'hijack@test.dev' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Bob B.')
    expect(res.body.data.email).toBe('bob@test.dev')

    const login = await request(app).post('/api/auth/login').send({ email: 'bob@test.dev', password: PASSWORD })
    expect(login.status).toBe(200)
    await bob.agent.put('/api/auth/profile').send({ name: 'Bob Builder' })
  })
})

describe('workspace isolation', () => {
  let goal, announcement

  beforeAll(async () => {
    goal = (await alice.agent.post(`/api/goals/workspace/${workspace.id}`).send({ title: 'Ship v1' })).body.data
    announcement = (await alice.agent.post(`/api/announcements/workspace/${workspace.id}`)
      .send({ content: '<p>Hello team</p>' })).body.data
  })

  test.each([
    ['get goal', (a) => a.get(`/api/goals/${goal.id}`)],
    ['edit goal', (a) => a.put(`/api/goals/${goal.id}`).send({ title: 'pwned' })],
    ['delete goal', (a) => a.delete(`/api/goals/${goal.id}`)],
    ['post goal update', (a) => a.post(`/api/goals/${goal.id}/updates`).send({ content: 'x' })],
    ['add milestone', (a) => a.post(`/api/goals/${goal.id}/milestones`).send({ title: 'x' })],
    ['change goal status', (a) => a.put(`/api/goals/status/${goal.id}`).send({ status: 'COMPLETED' })],
    ['react', (a) => a.post(`/api/announcements/${announcement.id}/reactions`).send({ emoji: '👍' })],
    ['comment', (a) => a.post(`/api/announcements/${announcement.id}/comments`).send({ content: 'x' })],
    ['delete announcement', (a) => a.delete(`/api/announcements/${announcement.id}`)],
    ['list goals', (a) => a.get(`/api/goals/workspace/${workspace.id}`)],
  ])('outsider cannot %s', async (_, call) => {
    const res = await call(mallory.agent)
    expect(res.status).toBe(403)
  })

  test('goal is unchanged after the outsider attempts', async () => {
    const res = await alice.agent.get(`/api/goals/${goal.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Ship v1')
  })

  test('members cannot edit a goal they do not own; the owner can', async () => {
    expect((await carol.agent.put(`/api/goals/${goal.id}`).send({ title: 'nope' })).status).toBe(403)
    expect((await alice.agent.put(`/api/goals/${goal.id}`).send({ title: 'Ship v1.0' })).status).toBe(200)
  })

  test('goal owner must be a workspace member', async () => {
    const res = await alice.agent.put(`/api/goals/${goal.id}`).send({ ownerId: mallory.user.id })
    expect(res.status).toBe(400)
  })

  test('a goal cannot be moved to another workspace', async () => {
    await alice.agent.put(`/api/goals/${goal.id}`).send({ workspaceId: otherWorkspace.id })
    const stored = await prisma.goal.findUnique({ where: { id: goal.id } })
    expect(stored.workspaceId).toBe(workspace.id)
  })

  test('milestone progress is clamped to 0-100', async () => {
    const m = (await bob.agent.post(`/api/goals/${goal.id}/milestones`).send({ title: 'M1', progress: 250 })).body.data
    expect(m.progress).toBe(100)
  })
})

describe('announcements', () => {
  test('members without permission cannot post', async () => {
    const res = await carol.agent.post(`/api/announcements/workspace/${workspace.id}`).send({ content: '<p>hi</p>' })
    expect(res.status).toBe(403)
  })

  test('rich text is sanitized before it is stored', async () => {
    const res = await alice.agent.post(`/api/announcements/workspace/${workspace.id}`)
      .send({ content: '<p onclick="x()">Hi <strong>all</strong><script>alert(1)</script></p><img src=x onerror=alert(1)>' })
    expect(res.status).toBe(201)
    expect(res.body.data.content).toBe('<p>Hi <strong>all</strong></p>')
  })

  test('empty rich text is rejected', async () => {
    const res = await alice.agent.post(`/api/announcements/workspace/${workspace.id}`).send({ content: '<p></p>' })
    expect(res.status).toBe(400)
  })

  test('@mention notifies workspace members only', async () => {
    const ann = (await alice.agent.post(`/api/announcements/workspace/${workspace.id}`)
      .send({ content: '<p>Standup</p>' })).body.data
    const res = await bob.agent.post(`/api/announcements/${ann.id}/comments`)
      .send({ content: 'ping @CarolCoder and @MalloryOutsider' })
    expect(res.status).toBe(201)

    const carolNotifs = await prisma.notification.findMany({ where: { userId: carol.user.id } })
    const malloryNotifs = await prisma.notification.findMany({ where: { userId: mallory.user.id } })
    expect(carolNotifs).toHaveLength(1)
    expect(malloryNotifs).toHaveLength(0)
  })

  test('users cannot read or delete other users\' notifications', async () => {
    const [n] = await prisma.notification.findMany({ where: { userId: carol.user.id } })
    expect((await bob.agent.put(`/api/notifications/${n.id}/read`)).status).toBe(404)
    expect((await bob.agent.delete(`/api/notifications/${n.id}`)).status).toBe(404)
    expect((await carol.agent.put(`/api/notifications/${n.id}/read`)).status).toBe(200)
  })
})

describe('action items', () => {
  let item

  beforeAll(async () => {
    const res = await alice.agent.post(`/api/action-items/workspace/${workspace.id}`)
      .send({ title: 'Write docs', priority: 'HIGH', assigneeId: carol.user.id })
    expect(res.status).toBe(201)
    item = res.body.data
  })

  test('assignee can move their card but not edit other fields', async () => {
    expect((await carol.agent.put(`/api/action-items/${item.id}`).send({ status: 'DOING' })).status).toBe(200)
    expect((await carol.agent.put(`/api/action-items/${item.id}`).send({ title: 'x' })).status).toBe(403)
  })

  test('other members cannot change it', async () => {
    expect((await bob.agent.put(`/api/action-items/${item.id}/status`).send({ status: 'DONE' })).status).toBe(403)
  })

  test('assignee must belong to the workspace', async () => {
    const res = await alice.agent.post(`/api/action-items/workspace/${workspace.id}`)
      .send({ title: 'x', assigneeId: mallory.user.id })
    expect(res.status).toBe(400)
  })

  test('goal must belong to the workspace', async () => {
    const foreignGoal = (await mallory.agent.post(`/api/goals/workspace/${otherWorkspace.id}`)
      .send({ title: 'theirs' })).body.data
    const res = await alice.agent.post(`/api/action-items/workspace/${workspace.id}`)
      .send({ title: 'x', goalId: foreignGoal.id })
    expect(res.status).toBe(400)
  })

  test('completedAt is set when an item is marked DONE', async () => {
    await carol.agent.put(`/api/action-items/${item.id}/status`).send({ status: 'DONE' })
    const stored = await prisma.actionItem.findUnique({ where: { id: item.id } })
    expect(stored.completedAt).not.toBeNull()
  })
})

describe('analytics', () => {
  test('counts items completed this week, including items without a goal', async () => {
    const res = await alice.agent.get(`/api/analytics/${workspace.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.completedThisWeek).toBe(1)
  })

  test('CSV export escapes commas and survives unassigned items', async () => {
    await alice.agent.post(`/api/action-items/workspace/${workspace.id}`).send({ title: 'Plan, then ship' })
    const res = await alice.agent.get(`/api/analytics/${workspace.id}/export`)
    expect(res.status).toBe(200)
    expect(res.text).toContain('"Plan, then ship"')
  })
})

describe('RBAC and invites', () => {
  test('the last admin cannot be demoted or removed', async () => {
    const demote = await alice.agent.put(`/api/workspaces/${workspace.id}/members/${alice.user.id}/role`)
      .send({ role: 'MEMBER' })
    expect(demote.status).toBe(400)
    const remove = await alice.agent.delete(`/api/workspaces/${workspace.id}/members/${alice.user.id}`)
    expect(remove.status).toBe(400)
  })

  test('roles are validated', async () => {
    const res = await alice.agent.put(`/api/workspaces/${workspace.id}/members/${bob.user.id}/role`)
      .send({ role: 'OWNER' })
    expect(res.status).toBe(400)
  })

  test('members cannot change permissions', async () => {
    const res = await bob.agent.put(`/api/workspaces/${workspace.id}/members/${bob.user.id}/permissions`)
      .send({ canInviteMembers: true })
    expect(res.status).toBe(403)
  })

  test('inviting an unknown email creates a pending invite accepted on sign-up', async () => {
    const invite = await alice.agent.post(`/api/workspaces/${workspace.id}/invite`).send({ email: 'Dave@Test.dev' })
    expect(invite.status).toBe(201)
    expect(invite.body.pending).toBe(true)

    const { agent } = await signUp('Dave', 'dave@test.dev')
    const list = await agent.get('/api/workspaces')
    expect(list.body.data.map((w) => w.id)).toContain(workspace.id)
    expect(await prisma.workspaceInvite.count()).toBe(0)
  })
})

describe('audit log', () => {
  test('records changes and is admin-only', async () => {
    const res = await alice.agent.get(`/api/audit-logs/${workspace.id}?action=MEMBER_INVITED`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
    expect((await bob.agent.get(`/api/audit-logs/${workspace.id}`)).status).toBe(403)
  })

  test('rows cannot be updated, even directly in the database', async () => {
    const [row] = await prisma.auditLog.findMany({ take: 1 })
    await expect(
      prisma.auditLog.update({ where: { id: row.id }, data: { action: 'TAMPERED' } })
    ).rejects.toThrow(/immutable/)
  })
})
