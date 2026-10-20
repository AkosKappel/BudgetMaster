import { m } from '../paraglide/messages.js'

// "Firefox on Windows" from a user agent string, good enough to recognise your own
// devices. Order matters: Edge and Opera also say Chrome, Chrome also says Safari.
const browsers: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const systems: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
]

export function describeDevice(userAgent: string | null | undefined) {
  if (!userAgent) return m.acct_device_unknown()
  const browser = browsers.find(([pattern]) => pattern.test(userAgent))?.[1]
  const system = systems.find(([pattern]) => pattern.test(userAgent))?.[1]
  if (browser && system) return m.acct_device_on({ browser, system })
  return browser ?? system ?? m.acct_device_unknown()
}
