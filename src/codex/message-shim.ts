/** Build the portable user-message shape consumed by host adapters. */
export function createUserMessage<T extends object>(message: T): T & { role: 'user' } {
  return { role: 'user', ...message }
}
