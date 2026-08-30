export interface SavedDefaultLineProfile {
  midpoint: number;
  rawText: string;
  updatedAt: string;
}

export const DEFAULT_LINE_PROFILES_KEY = 'totaledge.default-line-profiles';
export const ACTIVE_DEFAULT_PROFILE_KEY = 'totaledge.active-default-line-profile';

export function readSavedProfiles(storage: Storage = localStorage): SavedDefaultLineProfile[] {
  try {
    const raw = storage.getItem(DEFAULT_LINE_PROFILES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const profiles: SavedDefaultLineProfile[] = parsed
      .filter((value): value is Partial<SavedDefaultLineProfile> => !!value && typeof value === 'object')
      .map((profile) => ({
        midpoint: Number(profile.midpoint),
        rawText: typeof profile.rawText === 'string' ? profile.rawText.trim() : '',
        updatedAt: typeof profile.updatedAt === 'string' ? profile.updatedAt : new Date().toISOString(),
      }))
      .filter((profile) => Number.isFinite(profile.midpoint) && profile.midpoint > 0 && profile.rawText.length > 0);

    return profiles.sort((a, b) => a.midpoint - b.midpoint);
  } catch {
    return [];
  }
}

export function upsertSavedProfile(profile: SavedDefaultLineProfile, storage: Storage = localStorage): SavedDefaultLineProfile[] {
  const midpoint = Number(profile.midpoint);
  const rawText = typeof profile.rawText === 'string' ? profile.rawText.trim() : '';

  if (!Number.isFinite(midpoint) || midpoint <= 0 || !rawText) {
    return readSavedProfiles(storage);
  }

  const nextProfiles = readSavedProfiles(storage)
    .filter((item) => item.midpoint !== midpoint);

  const savedProfile: SavedDefaultLineProfile = {
    midpoint,
    rawText,
    updatedAt: profile.updatedAt || new Date().toISOString(),
  };

  const profiles = [...nextProfiles, savedProfile]
    .sort((a, b) => a.midpoint - b.midpoint)
    .slice(-8);

  storage.setItem(DEFAULT_LINE_PROFILES_KEY, JSON.stringify(profiles));
  return profiles;
}

export function removeSavedProfile(midpoint: number, storage: Storage = localStorage): SavedDefaultLineProfile[] {
  const profiles = readSavedProfiles(storage)
    .filter((profile) => profile.midpoint !== Number(midpoint));

  storage.setItem(DEFAULT_LINE_PROFILES_KEY, JSON.stringify(profiles));
  return profiles;
}

export function setActiveProfile(midpoint: number, storage: Storage = localStorage): void {
  storage.setItem(ACTIVE_DEFAULT_PROFILE_KEY, String(Number(midpoint)));
}

export function getActiveProfile(storage: Storage = localStorage): SavedDefaultLineProfile | null {
  const raw = storage.getItem(ACTIVE_DEFAULT_PROFILE_KEY);
  if (!raw) {
    return null;
  }

  const midpoint = Number(raw);
  if (!Number.isFinite(midpoint)) {
    return null;
  }

  const profiles = readSavedProfiles(storage);
  return profiles.find((profile) => profile.midpoint === midpoint) ?? null;
}
