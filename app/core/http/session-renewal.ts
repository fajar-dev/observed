export type SessionFetcher = <T>(path: string, options?: { method?: 'POST' }) => Promise<T>
export type SessionLock = (action: () => Promise<void>) => Promise<void>

/** One renewal per app, with a browser lock to coordinate shared cookies across tabs. */
export class SessionRenewal {
  private pending?: Promise<void>
  constructor(private readonly fetcher: SessionFetcher, private readonly lock: SessionLock) {}

  renew(): Promise<void> {
    this.pending ??= this.lock(async () => {
      const session = await this.fetcher<{ user: unknown }>('/api/observe/auth/session')
      if (!session.user) await this.fetcher('/api/observe/auth/refresh', { method: 'POST' })
    }).finally(() => { this.pending = undefined })
    return this.pending
  }
}
