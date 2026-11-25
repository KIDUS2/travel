import { useEffect, useState } from 'react';
import { api } from '../api/api';
import type { Privacy } from '../api/types';

let cached: Privacy | null = null;
let pending: Promise<Privacy> | null = null;

/** The traveler's chosen visibility for new memories (Account → Privacy). Falls back to private. */
export function loadDefaultPrivacy(): Promise<Privacy> {
  if (cached) return Promise.resolve(cached);
  pending ??= api.privacySettings().then((s) => (cached = s.defaultPrivacy)).catch(() => 'PRIVATE' as Privacy).finally(() => { pending = null; });
  return pending;
}

export function rememberDefaultPrivacy(p: Privacy) {
  cached = p;
}

/** Calls `apply` once with the default, unless the form already has an explicit value. */
export function useDefaultPrivacy(apply: (p: Privacy) => void, skip = false) {
  const [done, setDone] = useState(skip);
  useEffect(() => {
    if (done) return;
    let live = true;
    void loadDefaultPrivacy().then((p) => { if (live) { apply(p); setDone(true); } });
    return () => { live = false; };
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
}
