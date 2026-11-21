// checks again and again until the condition is true, for things a worker does in the background
export async function waitFor(check: () => Promise<boolean>, timeoutMs = 10_000) {
  const startedAt = Date.now();
  while (!(await check())) {
    if (Date.now() - startedAt > timeoutMs) throw new Error(`waited ${timeoutMs}ms and it did not happen`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
