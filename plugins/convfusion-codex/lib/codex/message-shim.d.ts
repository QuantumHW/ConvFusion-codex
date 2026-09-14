/** Build the portable user-message shape consumed by host adapters. */
export declare function createUserMessage<T extends object>(message: T): T & {
    role: 'user';
};
//# sourceMappingURL=message-shim.d.ts.map