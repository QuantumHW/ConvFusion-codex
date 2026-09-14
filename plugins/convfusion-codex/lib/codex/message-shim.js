/** Build the portable user-message shape consumed by host adapters. */
export function createUserMessage(message) {
    return { role: 'user', ...message };
}
//# sourceMappingURL=message-shim.js.map