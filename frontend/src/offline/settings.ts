/** Per-device upload settings, kept in this browser only. */
export type UploadPolicy = 'any' | 'wifi';

export interface UploadSettings {
  policy: UploadPolicy;
  /** Shrink photos to 2048 px before upload: about 5–10× less mobile data. */
  dataSaver: boolean;
}

const KEY = 'teguwaz.uploadSettings';
const DEFAULTS: UploadSettings = { policy: 'any', dataSaver: true };
const listeners = new Set<() => void>();

export function getUploadSettings(): UploadSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<UploadSettings>) };
  } catch {
    return DEFAULTS;
  }
}

export function setUploadSettings(patch: Partial<UploadSettings>) {
  const next = { ...getUploadSettings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  listeners.forEach((l) => l());
}

export function onUploadSettingsChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
