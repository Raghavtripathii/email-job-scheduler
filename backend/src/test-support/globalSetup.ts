import { execSync } from 'node:child_process';
import { assertSafeTestEnv } from './guard';

// runs once before the integration tests and makes sure the test database has all the tables
export default function setup() {
  assertSafeTestEnv();

  try {
    execSync('npx prisma migrate deploy', { stdio: 'pipe' });
  } catch (err) {
    const { stdout, stderr } = err as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(
      `could not prepare the test database. Is mysql running, and does scheduler_test exist?\n${stdout ?? ''}${stderr ?? ''}`,
    );
  }
}
