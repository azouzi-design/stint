import { isMac } from './startOverlay'

// The latest builds (GitHub Releases: `latest/download` always serves the newest release).
const RELEASES = 'https://github.com/azouzi-design/stint/releases/latest/download'
export const isWindows = typeof navigator !== 'undefined' && /Win/.test(navigator.platform || navigator.userAgent)
export const DOWNLOADS = {
  mac: { url: `${RELEASES}/Stint-mac.dmg`, label: 'Download for Mac' },
  windows: { url: `${RELEASES}/Stint-windows.exe`, label: 'Download for Windows' },
}
/** The desktop app for this computer, or null (not Mac/Windows). */
export const DOWNLOAD = isMac ? DOWNLOADS.mac : isWindows ? DOWNLOADS.windows : null
