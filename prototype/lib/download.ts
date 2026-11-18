import { isMac } from './startOverlay'

// The latest builds (GitHub Releases: `latest/download` always serves the newest release).
const RELEASES = 'https://github.com/azouzi-design/stint/releases/latest/download'
const isWindows = typeof navigator !== 'undefined' && /Win/.test(navigator.platform || navigator.userAgent)
/** The desktop app for this computer, or null (not Mac/Windows). */
export const DOWNLOAD = isMac
  ? { url: `${RELEASES}/Stint-mac.dmg`, label: 'Download for Mac' }
  : isWindows
    ? { url: `${RELEASES}/Stint-windows.exe`, label: 'Download for Windows' }
    : null
