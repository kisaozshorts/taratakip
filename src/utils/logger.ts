export const Logger = {
  info(message: string, meta?: any) {
    const timestamp = new Date().toISOString()
    console.log(
      `🔵 [INFO] [${timestamp}] ${message}`,
      meta ? `\nMeta: ${JSON.stringify(meta, null, 2)}` : ''
    )
  },
  warn(message: string, meta?: any) {
    const timestamp = new Date().toISOString()
    console.warn(
      `🟡 [WARN] [${timestamp}] ${message}`,
      meta ? `\nMeta: ${JSON.stringify(meta, null, 2)}` : ''
    )
  },
  error(message: string, error?: any) {
    const timestamp = new Date().toISOString()
    console.error(
      `🔴 [ERROR] [${timestamp}] ${message}`,
      error instanceof Error ? `\nStack: ${error.stack}` : `\nDetails: ${JSON.stringify(error, null, 2)}`
    )
  },
}
