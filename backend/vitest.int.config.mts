import { defineConfig } from 'vitest/config';

// settings for the integration tests: a mysql database and a redis db of their own,
// so the tests can never touch the data you use while developing
const env = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'mysql://root:rootpass@localhost:3307/scheduler_test',
  REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15',
  ELASTICSEARCH_URL: 'http://localhost:9200',
  JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:4000/api/auth/google/callback',
  MAIL_TRANSPORT: 'memory',
  // no pause between sends, the tests would crawl otherwise
  MIN_DELAY_BETWEEN_EMAILS_MS: '0',
  WORKER_CONCURRENCY: '5',
  MAX_EMAILS_PER_HOUR_PER_SENDER: '100',
};

// the setup step runs outside the test workers, so it gets the same values this way
Object.assign(process.env, env);

export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    environment: 'node',
    globalSetup: ['./src/test-support/globalSetup.ts'],
    env,
    // all files share one mysql database and one redis db, so they run one after the other
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
