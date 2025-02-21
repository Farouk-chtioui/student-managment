interface CachedGroup {
  id: string;
  name: string;
  feePerSession: number;
  description?: string;
  schedule: Array<{ day: string; time: string }>;
  deletedAt?: string;
  paymentHistory: {
    feePerSession: number;
    startDate: string;
    endDate: string;
  }[];
}

class GroupCache {
  private static readonly CACHE_KEY = 'deleted_groups_cache';

  static saveDeletedGroup(group: CachedGroup): void {
    const cache = this.getCache();
    const existingGroup = cache[group.id];

    const paymentHistory = existingGroup?.paymentHistory || [];
    paymentHistory.push({
      feePerSession: group.feePerSession,
      startDate: existingGroup?.deletedAt || new Date().toISOString(),
      endDate: new Date().toISOString()
    });

    cache[group.id] = {
      ...group,
      deletedAt: new Date().toISOString(),
      paymentHistory
    };

    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  static getDeletedGroup(groupId: string): CachedGroup | null {
    const cache = this.getCache();
    return cache[groupId] || null;
  }

  static getFeeForDate(groupId: string, date: string): number {
    const group = this.getDeletedGroup(groupId);
    if (!group) return 0;

    // If the group exists in cache, find the applicable fee for the given date
    const applicableFee = group.paymentHistory
      .find(history => 
        new Date(date) >= new Date(history.startDate) &&
        new Date(date) <= new Date(history.endDate)
      );

    return applicableFee?.feePerSession || group.feePerSession;
  }

  private static getCache(): Record<string, CachedGroup> {
    const cached = localStorage.getItem(this.CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  }
}

export default GroupCache;
