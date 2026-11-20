import { AlertScheduler } from '~~/server/features/alerts/application/alert-scheduler'
import { closeWorkspace, getWorkspace } from '~~/server/bootstrap/workspace'

export default defineNitroPlugin((app) => {
  const scheduler = new AlertScheduler(
    () => getWorkspace().alerts.evaluateDueAlerts(),
    error => console.error('Alert evaluation failed', error instanceof Error ? error.message : 'Unknown error')
  )
  scheduler.start()
  app.hooks.hook('close', async () => {
    await scheduler.stop()
    await closeWorkspace()
  })
})
