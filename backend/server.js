/**
 * Entry point — load and validate env vars before anything else imports them.
 * dotenv must populate process.env before env.js runs its Zod parse.
 */

import 'dotenv/config'
import { env } from './src/config/env.js'
import app from './src/app.js'
import { logger } from './src/utils/logger.js'

app.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`)
})
