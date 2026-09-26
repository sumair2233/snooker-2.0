import { kv as vercelKv } from "@vercel/kv";

// In-memory fallback cache for development or when Vercel KV environment variables are not configured
const memoryStore = new Map<string, unknown>();

const isVercelKvConfigured = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

export const appKv = {
  async get<T>(key: string): Promise<T | null> {
    if (isVercelKvConfigured) {
      try {
        return await vercelKv.get<T>(key);
      } catch (err) {
        console.warn("Vercel KV get error, falling back to memory store:", err);
      }
    }
    const val = memoryStore.get(key);
    return (val as T) ?? null;
  },

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    if (isVercelKvConfigured) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await vercelKv.set(key, value, opts as any);
        return;
      } catch (err) {
        console.warn("Vercel KV set error, falling back to memory store:", err);
      }
    }
    memoryStore.set(key, value);
  },

  async del(key: string): Promise<void> {
    if (isVercelKvConfigured) {
      try {
        await vercelKv.del(key);
        return;
      } catch (err) {
        console.warn("Vercel KV del error, falling back to memory store:", err);
      }
    }
    memoryStore.delete(key);
  },

  async keys(pattern: string): Promise<string[]> {
    if (isVercelKvConfigured) {
      try {
        return await vercelKv.keys(pattern);
      } catch (err) {
        console.warn("Vercel KV keys error, falling back to memory store:", err);
      }
    }
    const allKeys = Array.from(memoryStore.keys());
    if (pattern === "*") return allKeys;
    const prefix = pattern.replace("*", "");
    return allKeys.filter((k) => k.startsWith(prefix));
  },
};
