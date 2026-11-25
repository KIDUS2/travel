import { useEffect, useState } from 'react';
import { getUploadSettings, onUploadSettingsChange } from './settings';

interface NetworkInformationLike extends EventTarget {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
}

function connection(): NetworkInformationLike | undefined {
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

export type Connection = 'offline' | 'wifi' | 'cellular' | 'unknown';

/**
 * Best guess of the current connection. Only Chrome on Android reports wifi vs cellular;
 * other browsers report "unknown", which we treat as allowed so uploads never get stuck.
 */
export function currentConnection(): Connection {
  if (!navigator.onLine) return 'offline';
  const type = connection()?.type;
  if (type === 'wifi' || type === 'ethernet') return 'wifi';
  if (type === 'cellular' || type === 'wimax' || type === 'bluetooth') return 'cellular';
  return 'unknown';
}

export type UploadBlock = null | 'offline' | 'waiting-for-wifi';

export function uploadBlock(override = false): UploadBlock {
  const c = currentConnection();
  if (c === 'offline') return 'offline';
  if (!override && c === 'cellular' && getUploadSettings().policy === 'wifi') return 'waiting-for-wifi';
  return null;
}

export function onNetworkChange(fn: () => void) {
  window.addEventListener('online', fn);
  window.addEventListener('offline', fn);
  const c = connection();
  c?.addEventListener('change', fn);
  const offSettings = onUploadSettingsChange(fn);
  return () => {
    window.removeEventListener('online', fn);
    window.removeEventListener('offline', fn);
    c?.removeEventListener('change', fn);
    offSettings();
  };
}

export function useConnection(): Connection {
  const [c, setC] = useState(currentConnection);
  useEffect(() => onNetworkChange(() => setC(currentConnection())), []);
  return c;
}
