// @ts-expect-error - config.local.ts must be created from config.local.example.ts
import localUser from '../config.local';
import cleanupUser from './cleanupUser';

async function globalTeardown() {
  try {
    await cleanupUser(localUser);
  } catch (error) {
    console.error('Error:', error);
  }
}

export default globalTeardown;
