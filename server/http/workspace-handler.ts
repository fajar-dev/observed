import { createError, defineEventHandler } from 'h3'
import type { EventHandler, EventHandlerRequest, EventHandlerResponse } from 'h3'
import { WorkspaceError } from '~~/server/domain/workspace-error'

/** Translate application failures at the transport boundary; unexpected faults remain visible. */
export function defineWorkspaceHandler<Request extends EventHandlerRequest, Response extends EventHandlerResponse>(handler: EventHandler<Request, Response>) {
  return defineEventHandler<Request, Promise<Response>>(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      if (!(error instanceof WorkspaceError)) throw error
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.statusMessage,
        data: error.data,
        cause: error.cause,
        unhandled: error.statusCode >= 500
      })
    }
  })
}
