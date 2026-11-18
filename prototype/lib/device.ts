/**
 * Phones and tablets: focus sessions are computer-only. They can't start one; a session running on
 * the computer shows as a counter, without controls. By device, not window width: a narrow window
 * on a computer still runs sessions. iPads report themselves as Macs, hence the touch check.
 */
export const isPhoneOrTablet =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
