import PocketBase from 'pocketbase';

// Create a globally unique PocketBase instance
// This prevents multiple instances in dev mode due to HMR
const globalForPocketBase = global as unknown as { pb: PocketBase };

export const pb = globalForPocketBase.pb || new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

if (process.env.NODE_ENV !== 'production') globalForPocketBase.pb = pb;

// Disable auto-cancellation globally for easier dev (optional)
pb.autoCancellation(false);
