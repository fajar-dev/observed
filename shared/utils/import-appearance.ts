// Grafana's classic palette is intentionally separate from the application's theme.
export const grafanaPalette = ['#73bf69', '#f2cc0c', '#5794f2', '#ff9830', '#b877d9', '#f2495c', '#73bfb8', '#faDE2a', '#8ab8ff', '#ffb357']
const colors: Record<string, string> = {
  'green': '#73bf69', 'red': '#f2495c', 'yellow': '#f2cc0c', 'orange': '#ff9830', 'blue': '#5794f2', 'purple': '#b877d9', 'white': '#ffffff', 'black': '#000000',
  'dark-green': '#37872d', 'semi-dark-green': '#56a64b', 'light-green': '#96d98d', 'super-light-green': '#c8f2c2',
  'dark-red': '#c4162a', 'semi-dark-red': '#e02f44', 'light-red': '#ff7383', 'super-light-red': '#ffa6b0',
  'dark-blue': '#1f60c4', 'semi-dark-blue': '#3274d9', 'light-blue': '#8ab8ff', 'super-light-blue': '#c0d8ff',
  'dark-orange': '#fa6400', 'light-orange': '#ffb357', 'dark-yellow': '#e0b400', 'light-yellow': '#ffee52',
  'dark-purple': '#8f3bb8', 'light-purple': '#ca95e5'
}
export function grafanaColor(value: unknown) {
  if (typeof value !== 'string') return undefined
  if (/^#[\da-f]{6}$/i.test(value)) return value
  if (/^#[\da-f]{3}$/i.test(value)) return '#' + [...value.slice(1)].map(char => char + char).join('')
  return colors[value.toLowerCase()]
}
export function grafanaUnit(value: unknown) {
  if (typeof value !== 'string' || !value) return 'none'
  const aliases: Record<string, string> = { percentunit: 'percentRatio', decbytes: 'decimalBytes', Bps: 'bytesPerSecond', gbytes: 'gigabytes', s: 'seconds', ms: 'milliseconds', reqps: 'requests' }
  return (aliases[value] ?? value).slice(0, 80)
}
