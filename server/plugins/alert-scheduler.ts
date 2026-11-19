import { closeWorkspace, getWorkspace } from '../core/container'

export default defineNitroPlugin((app) => {
  let running: Promise<void> | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  if (process.env.DATABASE_URL && process.env.OBSERVE_SECRET_KEY && process.env.OBSERVE_ALERTS_ENABLED !== 'false') {
    timer = setInterval(() => {
      running ??= getWorkspace().alerts.evaluateDueAlerts()
        .catch(error => console.error('Alert evaluation failed', error.message))
        .finally(() => { running = undefined })
    }, 10_000)
    timer.unref()
  }
  app.hooks.hook('close', async () => {
    if (timer) clearInterval(timer)
    await running
    await closeWorkspace()
  })
})
