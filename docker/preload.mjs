import { configureContainerEnvironment } from './environment.mjs'

try {
  configureContainerEnvironment(process.env)
} catch (error) {
  console.error('Observed container configuration: ' + error.message)
  process.exit(1)
}
