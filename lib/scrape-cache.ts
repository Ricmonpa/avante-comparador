interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ScrapeCache {
  private static instance: ScrapeCache;
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly TTL_MS = 4 * 60 * 60 * 1000; // 4 horas

  private constructor() {}

  static getInstance(): ScrapeCache {
    if (!ScrapeCache.instance) {
      ScrapeCache.instance = new ScrapeCache();
    }
    return ScrapeCache.instance;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.TTL_MS,
    });
  }

  normalizeKey(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }
}

export default ScrapeCache;
