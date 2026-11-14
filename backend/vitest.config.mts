import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.int.test.ts'],
    environment: 'node',
    // set before any file is loaded, so config/env.ts does not stop the process and the
    // tests never read the real .env
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://root:rootpass@localhost:3307/scheduler_test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:4000/api/auth/google/callback',
      MAIL_TRANSPORT: 'memory',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/scripts/**', 'src/server.ts', 'src/worker.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});