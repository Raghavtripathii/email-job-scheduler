// stops the tests if they are pointed at real data, it checks the urls the app code will really use
export function assertSafeTestEnv() {
  const databaseName = new URL(process.env.DATABASE_URL ?? 'mysql://nowhere').pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    throw new Error(`the test database name must end with _test, got "${databaseName}"`);
  }

  const redisDb = new URL(process.env.REDIS_URL ?? 'redis://nowhere').pathname.slice(1);
  if (!redisDb || redisDb === '0') {
    throw new Error('the test redis url needs its own db number, like redis://localhost:6379/15');
  }
}
