import type { Privacy } from '../../api/types';

export const PRIVACY_LABEL: Record<Privacy, { en: string; am: string; hint: string }> = {
  PRIVATE: { en: 'Only me', am: 'ለእኔ ብቻ', hint: 'Private: never shared, never posted. Just your memory.' },
  FAMILY: { en: 'Family', am: 'ቤተሰብ', hint: 'People in the trip you shared it with can see it.' },
  PUBLIC: { en: 'Public', am: 'ለሁሉም', hint: 'Fine to share beyond your family. Trip members can see it.' },
};

export const PRIVACY_ORDER: Privacy[] = ['PRIVATE', 'FAMILY', 'PUBLIC'];
