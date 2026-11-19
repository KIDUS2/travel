import { useId } from 'react';

/**
 * The Teguwaz mark: a traveler's trail winding across a highland-green tile
 * to a destination pin, with a flag stripe at the base.
 */
export function TeguwazMark({ size = 44, title }: { size?: number; title?: string }) {
  const clip = `tg-clip-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <clipPath id={clip}><rect width="48" height="48" rx="12" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="48" height="48" fill="#0B3D23" />
        <path d="M0 34 L12 26 L20 31 L31 20 L48 30 V48 H0 Z" fill="#145C33" />
        <rect y="43" width="16" height="5" fill="#078930" />
        <rect x="16" y="43" width="16" height="5" fill="#FCDD09" />
        <rect x="32" y="43" width="16" height="5" fill="#DA121A" />
      </g>
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="11.25" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <path d="M9 37 C16 37 15 28 22 28 S29 17 35 15" fill="none" stroke="#FCDD09" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="0.1 5.4" />
      <circle cx="9" cy="37" r="2.6" fill="#FCDD09" />
      <path d="M36 6.5c-3.6 0-6.5 2.8-6.5 6.3 0 4.6 6.5 10.7 6.5 10.7s6.5-6.1 6.5-10.7c0-3.5-2.9-6.3-6.5-6.3z" fill="#DA121A" stroke="#fff" strokeWidth="1.4" />
      <circle cx="36" cy="12.8" r="2.3" fill="#fff" />
    </svg>
  );
}

export function TeguwazLogo({ size = 44, light = true }: { size?: number; light?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <TeguwazMark size={size} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: size * 0.48, color: light ? '#fff' : 'var(--ink)', letterSpacing: '-0.01em' }}>Teguwaz</span>
        <span style={{ fontFamily: 'var(--font-am-serif)', fontSize: size * 0.32, color: light ? 'var(--flag-yellow)' : 'var(--green-600)' }}>ተጓዥ</span>
      </span>
    </span>
  );
}
