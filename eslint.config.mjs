// @ts-check
import semanticUi from './tooling/eslint/semantic-ui.mjs'
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultAttributes } from 'eslint-plugin-better-tailwindcss/api/defaults'

export default withNuxt(
  betterTailwindcss.configs['correctness-error'],
  { files: ['app/**/*.vue', 'app/**/*.ts'], plugins: { 'semantic-ui': semanticUi }, rules: { 'semantic-ui/semantic-sizes': 'error' } },
  {
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', {
        ignore: ['^(kiosk-exit|workspace-content|workspace-dashboard|workspace-management|toolbar|surface|query-code|content-panel|content-panel-header|content-panel-body|content-panel-list|content-row|content-row-main|content-row-details|content-row-actions|content-row-heading|content-panel-footer|content-toolbar|content-toolbar-actions|dashboard-variables|dashboard-variable|panel-editor-body|panel-surface|panel-heading|panel-body|panel-drag-handle|metric-value|stat-label|query-chart|chart-plot|chart-legend|query-visualization|visualization-table|stat-grid|gauge-grid)$', '^grid-stack(?:-item|-item-content)?$', '^auth-(layout|brand|theme|story|story-content|eyebrow|headline|story-description|illustration|diagram-soft|diagram-node|diagram-label|features|entry|form-container|form-content|form|form-setup|field-password|submit|providers|provider-prefix|form-heading|form-title|form-description)$']
      }]
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
        attributes: [
          ...getDefaultAttributes(),
          ['^v-bind:ui$', [{ match: 'objectValues' }]]
        ]
      }
    }
  }
)
