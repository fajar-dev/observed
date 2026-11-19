import type { Clock } from '~~/server/domain/ports'

export class SystemClock implements Clock {
  now() {
    return new Date()
  }
}
