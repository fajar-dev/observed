import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'

test('authentication controls fit all supported viewport sizes', async () => {
  const browser = await chromium.launch({ ...launchOptions })
  try {
    const viewports = [[1920, 1080], [1600, 900], [1440, 900], [1366, 768], [1280, 720], [1280, 600], [1024, 768], [1024, 600], [768, 1024], [768, 600], [430, 932], [390, 844], [375, 667], [360, 640], [320, 568], [844, 390], [667, 375], [568, 320], [390, 400], [375, 420]]
    for (const scenario of ['local', 'providers', 'setup']) {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
      await ctx.route('**/api/observe/**', (route) => {
        const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
        if (path === 'auth/session') return route.fulfill({ json: { user: null, canRefresh: false } })
        if (path === 'auth/config') return route.fulfill({ json: { setupRequired: scenario === 'setup', providers: scenario === 'providers' ? ['google', 'microsoft'] : [] } })
        return route.fulfill({ status: 401, json: { statusMessage: 'Authentication required' } })
      })
      const page = await ctx.newPage(), errors = []
      page.on('pageerror', e => errors.push(e.message))
      page.on('console', (message) => {
        if (['warning', 'error'].includes(message.type())) errors.push(message.text())
      })
      await page.goto(baseUrl + '/sign-in', { waitUntil: 'load' })
      await page.getByRole('heading', { name: scenario === 'setup' ? 'Set up your workspace' : 'Welcome back.', exact: true }).waitFor()
      await page.evaluate(() => document.fonts.ready)
      for (const [width, height] of viewports) {
        await page.setViewportSize({ width, height })
        await page.waitForTimeout(70)
        for (const validation of [false, true]) {
          if (validation) await page.getByRole('button', { name: scenario === 'setup' ? 'Create administrator' : 'Sign in', exact: true }).click()
          const result = await page.evaluate(() => {
            const els = [...document.querySelectorAll('.auth-entry input,.auth-entry button,.auth-entry a,.auth-entry label,.auth-entry [role="alert"],#auth-title')].filter(el => el.getBoundingClientRect().height > 0)
            return { width: innerWidth, height: innerHeight, scrollHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, violations: els.flatMap((el) => {
              const r = el.getBoundingClientRect()
              return r.top < 0 || r.bottom > innerHeight + 1 || r.left < 0 || r.right > innerWidth + 1 ? [{ name: el.getAttribute('name') || el.textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right }] : []
            }) }
          })
          assert.ok(result.scrollHeight <= height + 1 && result.scrollWidth <= width + 1, scenario + ' document scroll ' + JSON.stringify(result))
          assert.deepEqual(result.violations, [], scenario + ' ' + width + 'x' + height + ' validation=' + validation)
        }
        await page.evaluate(() => window.scrollTo(0, 999))
        assert.equal(await page.evaluate(() => scrollY), 0)
      }
      const tokens = await page.locator('input[name="email"]').evaluate(el => ({ height: el.getBoundingClientRect().height, radius: getComputedStyle(el).borderRadius, font: getComputedStyle(el).fontFamily, fontSize: getComputedStyle(el).fontSize }))
      assert.equal(tokens.height, 36)
      assert.equal(tokens.radius, '8px')
      assert.ok(tokens.font.includes('Manrope'))
      assert.equal(tokens.fontSize, '14px')
      assert.deepEqual(errors, [])
      await ctx.close()
    }
  } finally { await browser.close() }
})
