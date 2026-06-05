/**
 * Generates an idempotency key string based on the user's actor and the target route.
 * Real hashing (SHA-256) of the body is done on the backend. Here we just create a unique seed.
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
