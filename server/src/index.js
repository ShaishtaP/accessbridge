import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';

// Load server/.env no matter which folder the command is run from.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const PORT = process.env.PORT || 5000;

try {
  await connectDB(process.env.MONGODB_URI);
} catch (err) {
  console.error(`Could not connect to MongoDB: ${err.message}`);
  console.error('Check the password in MONGODB_URI and the Atlas Network Access list.');
  process.exit(1);
}

createApp().listen(PORT, () => {
  console.log(`AccessBridge API running at http://localhost:${PORT}`);
});
