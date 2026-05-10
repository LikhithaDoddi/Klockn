import { createLogger, format, transports } from 'winston'

const isProduction = process.env.NODE_ENV === 'production'

export const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction
    ? format.combine(format.timestamp(), format.json())
    : format.combine(format.colorize(), format.simple()),
  transports: [new transports.Console()],
})
