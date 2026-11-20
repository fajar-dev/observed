/** Readiness includes database connectivity and the application's automatic migrations. */
export class HealthService {
  constructor(private readonly probe: () => Promise<unknown>) {}

  async check(): Promise<{ status: 'ok' | 'unavailable' }> {
    try {
      await this.probe()
      return { status: 'ok' }
    } catch { return { status: 'unavailable' } }
  }
}
