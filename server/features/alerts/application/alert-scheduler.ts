/** One timer per application process; rule-level coordination belongs to the repository. */
export class AlertScheduler {
  private timer?: ReturnType<typeof setInterval>
  private running?: Promise<void>
  private stopped = false

  constructor(private readonly evaluate: () => Promise<unknown>, private readonly reportError: (error: unknown) => void) {}

  start() {
    if (this.timer || this.stopped) return
    this.timer = setInterval(() => {
      void this.run()
    }, 10_000)
    this.timer.unref()
  }

  run(): Promise<void> {
    if (this.stopped) return Promise.resolve()
    this.running ??= Promise.resolve().then(this.evaluate).then(() => {})
      .catch(this.reportError)
      .finally(() => { this.running = undefined })
    return this.running
  }

  async stop() {
    this.stopped = true
    clearInterval(this.timer)
    this.timer = undefined
    await this.running
  }
}
