import { describe, expect, it } from 'vitest';
import { getActiveProfile, readSavedProfiles, removeSavedProfile, setActiveProfile, upsertSavedProfile } from './LineProfileStorage';

describe('LineProfileStorage', () => {
  it('keeps multiple midpoint profiles without overwriting earlier entries', () => {
    const storage = new StorageMock();

    upsertSavedProfile({ midpoint: 43, rawText: 'TEX', updatedAt: '2024-01-01' }, storage);
    upsertSavedProfile({ midpoint: 44, rawText: 'KC', updatedAt: '2024-01-02' }, storage);

    const profiles = readSavedProfiles(storage);

    expect(profiles.map((profile) => profile.midpoint)).toEqual([43, 44]);
    expect(profiles[0].rawText).toBe('TEX');
    expect(profiles[1].rawText).toBe('KC');
  });

  it('replaces the saved profile when the same midpoint is stored again', () => {
    const storage = new StorageMock();

    upsertSavedProfile({ midpoint: 43, rawText: 'old text', updatedAt: '2024-01-01' }, storage);
    upsertSavedProfile({ midpoint: 43, rawText: 'new text', updatedAt: '2024-01-03' }, storage);

    const profiles = readSavedProfiles(storage);

    expect(profiles).toHaveLength(1);
    expect(profiles[0].rawText).toBe('new text');
  });

  it('tracks which saved midpoint is active', () => {
    const storage = new StorageMock();

    upsertSavedProfile({ midpoint: 43, rawText: 'a', updatedAt: '2024-01-01' }, storage);
    upsertSavedProfile({ midpoint: 44, rawText: 'b', updatedAt: '2024-01-02' }, storage);
    setActiveProfile(44, storage);

    expect(getActiveProfile(storage)?.midpoint).toBe(44);

    removeSavedProfile(44, storage);
    expect(getActiveProfile(storage)).toBeNull();
  });
});

class StorageMock implements Storage {
  private store = new Map<string, string>();
  public readonly length: number;

  constructor() {
    this.length = 0;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}
