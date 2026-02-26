export const logger = {
  info: (message, data = null) => {
    console.log(
      `[INFO] ${new Date().toISOString()} - ${message}`,

      data || ''
    )
  },

  error: (message, error = null) => {
    console.error(
      `[ERROR] ${new Date().toISOString()} - ${message}`,

      error || ''
    )
  },

  warn: message => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`)
  }
}
