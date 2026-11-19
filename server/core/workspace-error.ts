export interface WorkspaceFailure {
  statusCode: number
  statusMessage: string
  data?: { message: string }
}

/** Application failures carry transport-neutral status metadata for HTTP adapters. */
export class WorkspaceError extends Error {
  readonly statusCode: number
  readonly statusMessage: string
  readonly data?: { message: string }

  constructor(failure: WorkspaceFailure) {
    super(failure.statusMessage)
    this.name = 'WorkspaceError'
    this.statusCode = failure.statusCode
    this.statusMessage = failure.statusMessage
    this.data = failure.data
  }
}
