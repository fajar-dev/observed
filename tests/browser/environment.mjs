import { existsSync } from 'node:fs'

export const baseUrl = process.env.BROWSER_BASE_URL || 'http://localhost:3000'
const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const launchOptions = { headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : existsSync(localChrome) ? { executablePath: localChrome } : { channel: 'chrome' }) }
