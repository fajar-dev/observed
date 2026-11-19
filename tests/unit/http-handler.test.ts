import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isError } from 'h3'
import type { H3Event } from 'h3'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { WorkspaceError } from '~~/server/domain/workspace-error'

test('expected application rejections become handled HTTP errors without losing their status', async () => {
  const handler = defineWorkspaceHandler(() => {
    throw new WorkspaceError({ statusCode: 409, statusMessage: 'Setup is already complete' })
  })
  await assert.rejects(handler({} as H3Event), (error: unknown) => {
    assert.ok(isError(error))
    assert.equal(error.statusCode, 409)
    assert.equal(error.statusMessage, 'Setup is already complete')
    assert.equal(error.unhandled, false)
    return true
  })
})

test('server failures and unexpected exceptions remain reportable', async () => {
  const cause = new Error('Database unavailable')
  const unavailable = defineWorkspaceHandler(() => {
    throw new WorkspaceError({ statusCode: 503, statusMessage: 'Try again shortly', cause })
  })
  await assert.rejects(unavailable({} as H3Event), (error: unknown) => {
    assert.ok(isError(error))
    assert.equal(error.unhandled, true)
    assert.equal(error.cause, cause)
    return true
  })
  const unexpected = defineWorkspaceHandler(() => {
    throw cause
  })
  await assert.rejects(unexpected({} as H3Event), error => error === cause)
})
