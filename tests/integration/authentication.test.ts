import { PostgresDatabase } from '~~/server/platform/database/database'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { AuthService, tokenHash } from '~~/server/features/auth/application/auth.service'
import { PostgresAuthenticationRepository } from '~~/server/features/auth/infrastructure/authentication.repository'
import { ScryptPasswordHasher } from '~~/server/features/auth/infrastructure/scrypt-password-hasher'
import { JwtAccessTokens } from '~~/server/features/auth/infrastructure/jwt-access-tokens'

const connection = process.env.TEST_DATABASE_URL
if (!connection) throw new Error('Set TEST_DATABASE_URL to an isolated PostgreSQL database ending in _test')
test('PostgreSQL authentication: setup, sessions, replay, roles, account changes and OAuth linking', async () => {
  if (!new URL(connection!).pathname.endsWith('_test')) throw new Error('Use an isolated database ending in _test')
  const pool = new pg.Pool({ connectionString: connection })
  const database = new PostgresDatabase(connection!)
  const store = new PostgresAuthenticationRepository(database)
  const auth = new AuthService(store, new ScryptPasswordHasher(), new JwtAccessTokens(randomBytes(32).toString('base64')))
  try {
    await pool.query('DROP SCHEMA IF EXISTS observe CASCADE')
    assert.equal((await auth.configuration([])).setupRequired, true)
    const setupInput = { email: 'admin@example.test', name: 'Admin', password: 'administrator-password' }
    const concurrentSetups = await Promise.allSettled([
      auth.setup(setupInput, 'setup-first', 'Test'),
      auth.setup(setupInput, 'setup-second', 'Test')
    ])
    const successful = concurrentSetups.filter(result => result.status === 'fulfilled')
    assert.equal(successful.length, 1)
    assert.equal(concurrentSetups.filter(result => result.status === 'rejected' && result.reason.statusCode === 409).length, 1)
    const admin = (successful[0] as PromiseFulfilledResult<Awaited<ReturnType<AuthService['setup']>>>).value
    assert.equal((await store.listUsers()).length, 1)
    assert.equal(admin.user.role, 'admin')
    assert.equal('passwordHash' in admin.user, false)
    await assert.rejects(auth.setup({ email: 'another@example.test', name: 'Other', password: 'administrator-password' }, 'setup-other', 'Test'))
    assert.equal((await auth.configuration([])).setupRequired, false)
    await assert.rejects(auth.signIn('admin@example.test', 'incorrect', 'bad-login', 'Test'))
    await assert.rejects(auth.signIn('missing@example.test', 'incorrect', 'bad-login', 'Test'))
    const session = await auth.signIn('admin@example.test', 'administrator-password', 'signin', 'Test')
    assert.equal((await auth.authenticate(session.accessToken)).user.id, admin.user.id)
    const rotated = await auth.refresh(session.refreshToken)
    assert.notEqual(rotated.refreshToken, session.refreshToken)
    await assert.rejects(auth.refresh(session.refreshToken))
    await assert.rejects(auth.authenticate(rotated.accessToken))
    await assert.rejects(auth.refresh(rotated.refreshToken))
    const second = await auth.signIn('admin@example.test', 'administrator-password', 'signin', 'Second browser')
    await auth.signOut(second.refreshToken)
    await assert.rejects(auth.authenticate(second.accessToken))
    const concurrent = await auth.signIn('admin@example.test', 'administrator-password', 'signin', 'Parallel')
    const results = await Promise.allSettled([auth.refresh(concurrent.refreshToken), auth.refresh(concurrent.refreshToken)])
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
    const editor = await auth.saveUser({ email: 'editor@example.test', name: 'Editor', role: 'editor', enabled: true, password: 'editor-password-long' }, admin.user.id)
    const editorSession = await auth.signIn(editor.email, 'editor-password-long', 'editor-login', 'Editor')
    await auth.saveUser({ email: editor.email, name: editor.name, role: 'viewer', enabled: true }, admin.user.id, editor.id)
    await assert.rejects(auth.authenticate(editorSession.accessToken))
    const viewerSession = await auth.signIn(editor.email, 'editor-password-long', 'viewer-login', 'Viewer')
    assert.equal((await auth.authenticate(viewerSession.accessToken)).user.role, 'viewer')
    await assert.rejects(auth.updateProfile(editor.id, { name: 'Editor', currentPassword: 'wrong', password: 'replacement-password' }))
    await auth.updateProfile(editor.id, { name: 'Changed', currentPassword: 'editor-password-long', password: 'replacement-password' })
    await assert.rejects(auth.authenticate(viewerSession.accessToken))
    await assert.rejects(auth.signIn(editor.email, 'editor-password-long', 'old-password', 'Test'))
    await auth.signIn(editor.email, 'replacement-password', 'new-password', 'Test')
    await assert.rejects(auth.saveUser({ email: admin.user.email, name: 'Admin', role: 'viewer', enabled: true }, admin.user.id, admin.user.id))
    await assert.rejects(store.deleteUser(admin.user.id, admin.user.id))
    await assert.rejects(store.oauthUser('google', 'unknown-subject', 'unapproved@example.test', 'New', false))
    await assert.rejects(store.oauthUser('google', 'same-email-subject', admin.user.email, 'Impostor', true))
    const linked = await store.oauthUser('google', 'google-subject', admin.user.email, 'Admin Google', false, admin.user.id)
    assert.equal(linked.id, admin.user.id)
    assert.deepEqual(await store.linkedProviders(admin.user.id), ['google'])
    assert.equal((await store.oauthUser('google', 'google-subject', 'changed@example.test', 'Other name', false)).id, admin.user.id)
    await assert.rejects(store.oauthUser('google', 'google-subject', 'changed@example.test', 'Other', false, editor.id))
    const created = await store.oauthUser('microsoft', 'new-subject', 'new@example.test', 'New Microsoft', true)
    assert.equal(created.role, 'viewer')
    assert.equal(created.hasPassword, false)
    await auth.saveUser({ email: editor.email, name: 'Disabled', role: 'viewer', enabled: false }, admin.user.id, editor.id)
    await assert.rejects(auth.signIn(editor.email, 'replacement-password', 'disabled', 'Test'))
    const persisted = await pool.query('SELECT token_hash FROM observe.auth_refresh_tokens')
    assert.ok(persisted.rows.every(row => /^[a-f0-9]{64}$/.test(row.token_hash)))
    assert.ok(persisted.rows.some(row => row.token_hash === tokenHash(admin.refreshToken)))
    for (let i = 0; i < 10; i++) await assert.rejects(auth.signIn('limited@example.test', 'wrong', 'limited', 'Test'))
    await assert.rejects(auth.signIn('limited@example.test', 'wrong', 'limited', 'Test'), (error: unknown) => (error as { statusCode: number }).statusCode === 429)

    // Completion survives restarts and even externally removed users.
    await pool.query('DELETE FROM observe.users')
    const reopenedDatabase = new PostgresDatabase(connection!)
    const reopened = new PostgresAuthenticationRepository(reopenedDatabase)
    try {
      assert.equal(await reopened.isSetupComplete(), true)
    } finally { await reopenedDatabase.close() }
    assert.equal((await auth.configuration([])).setupRequired, false)
    await assert.rejects(auth.setup(setupInput, 'setup-after-delete', 'Test'), (error: unknown) => (error as { statusCode: number }).statusCode === 409)
    // Upgrade an existing installation that predates the completion marker.
    await store.saveUser({ email: 'legacy@example.test', name: 'Existing Admin', role: 'admin', enabled: true }, null)
    await pool.query('DELETE FROM observe.auth_setup')
    const upgradedDatabase = new PostgresDatabase(connection!)
    const upgraded = new PostgresAuthenticationRepository(upgradedDatabase)
    try {
      assert.equal(await upgraded.isSetupComplete(), true)
      assert.equal((await pool.query('SELECT count(*)::integer AS count FROM observe.auth_setup')).rows[0].count, 1)
    } finally { await upgradedDatabase.close() }
  } finally {
    await database.close()
    await pool.end()
  }
})
