import type { Privacy } from '../../api/types';

export const PRIVACY_LABEL: Record<Privacy, { en: string; am: string; hint: string }> = {
  PRIVATE: { en: 'Only me', am: 'ለእኔ ብቻ', hint: 'Private: never shared, never posted. Just your memory.' },
  FAMILY: { en: 'Family', am: 'ቤተሰብ', hint: 'Shared with your family circle only.' },
  PUBLIC: { en: 'Public', am: 'ለሁሉም', hint: 'Anyone with your Teguwaz profile link can see it.' },
};

export const PRIVACY_ORDER: Privacy[] = ['PRIVATE', 'FAMILY', 'PUBLIC'];
