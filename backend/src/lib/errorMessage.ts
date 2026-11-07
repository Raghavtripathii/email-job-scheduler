export function errorMessage(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return [...new Set(err.errors.map(errorMessage))].join('; ');
  }
  if (err instanceof Error) {
    const code = (err as { code?: string }).code;
    return err.message || code || err.name;
  }
  return String(err);
}