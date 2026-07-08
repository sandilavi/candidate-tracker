import { config } from 'dotenv';
import path from 'path';

// Load variables from .env.test
config({ path: path.resolve(__dirname, '../.env.test') });
