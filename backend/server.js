import 'dotenv/config';
import app from './src/app.js';
import { logger } from './src/utils/logger.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
