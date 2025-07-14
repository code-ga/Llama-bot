// Read environment variables
const BASE_URL = process.env.BASE_URL || '';
const API_KEY = process.env.API_KEY || '';
const MODEL_NAME = process.env.MODEL_NAME || '';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';

if (!BASE_URL || !API_KEY || !MODEL_NAME) {
  throw new Error(
    'Please set BASE_URL, API_KEY, MODEL_NAME via env var or code.',
  );
}

export { BASE_URL, API_KEY, MODEL_NAME, DISCORD_TOKEN };