import { useEffect, useRef, type CSSProperties, type DragEvent } from 'react';
import type { BookPage, BookSettings } from '../../api/types';
import { Icon } from '../../components/Icon';
import { WorldCoverageMap, type CoveragePin } from '../../components/WorldCoverageMap';
import { PAGE_RATIO } from './layouts';

/** All pages are laid out at this width, then scaled to whatever size they are shown at. */
export const BASE_W = 560;
export const MEDIA_MIME = 'application/x-teguwaz-media';

export interface PageContext {
  photoUrl: (mediaId: string | undefined) => string | undefined;
  mapPins: CoveragePin[];
  visitedRegions: Set<string>;
}

interface Props {
  page: BookPage;
  settings: BookSettings;
  ctx: PageContext;
  width: number;
  editable?: boolean;
  selected?: boolean;
  selectedSlot?: string | null;
  pageNumber?: number;
  onSelect?: () => void;
  onSlotSelect?: (slot: string) => void;
  onText?: (slot: string, value: string) => void;
  onPhoto?: (slot: string, mediaId: string | null) => void;
}

const BG: Record<BookPage['background'], { background: string; color: string; muted: string; accent: string }> = {
  white: { background: '#FFFFFF', color: '#1D1A14', muted: '#5E5648', accent: '#06742A' },
  cream: { background: '#F8F1E1', color: '#1D1A14', muted: '#5E5648', accent: '#06742A' },
  green: { background: '#0B3D23', color: '#FFFFFF', muted: '#CFE0D4', accent: '#FCDD09' },
  tibeb: { background: '#FFFFFF', color: '#1D1A14', muted: '#5E5648', accent: '#06742A' },
};

export function PageView(props: Props) {
  const { page, settings, width, editable = false, selected = false, pageNumber, onSelect } = props;
  const height = BASE_W / PAGE_RATIO[settings.size];
  const scale = width / BASE_W;
  const theme = BG[page.background];

  return (
    <div
      onClick={onSelect}
      style={{
        width, height: height * scale, flex: 'none', position: 'relative', overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px #FCDD09, 0 10px 28px rgba(29,26,20,0.25)' : '0 6px 18px rgba(29,26,20,0.18)',
        borderRadius: 2, cursor: onSelect ? 'pointer' : undefined,
      }}
    >
      <div style={{
        width: BASE_W, height, transform: `scale(${scale})`, transformOrigin: 'top left',
        background: theme.background, color: theme.color, position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif',
      }}>
        {page.background === 'tibeb' ? <div className="tibeb" style={{ flex: 'none' }} /> : null}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: page.layout === 'full-photo' || page.layout === 'cover' ? 0 : 28, gap: 12 }}>
          <LayoutBody {...props} theme={theme} innerHeight={height} />
        </div>
        {page.background === 'tibeb' ? <div className="tibeb" style={{ flex: 'none' }} /> : null}
        {pageNumber != null && page.layout !== 'cover' ? (
          <span style={{ position: 'absolute', bottom: page.background === 'tibeb' ? 18 : 8, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: theme.muted }}>{pageNumber}</span>
        ) : null}
      </div>
      {editable ? null : <div style={{ position: 'absolute', inset: 0 }} />}
    </div>
  );
}

function LayoutBody(p: Props & { theme: typeof BG.white; innerHeight: number }) {
  const { page, theme } = p;
  const s = page.slots;
  const photo = (slot: string, style?: CSSProperties) => <PhotoSlot slot={slot} {...p} style={style} />;
  const text = (slot: string, style: CSSProperties, placeholder: string, multiline = false) => (
    <TextSlot slot={slot} value={s[slot] ?? ''} placeholder={placeholder} style={style} multiline={multiline} {...p} />
  );
  const head: CSSProperties = { fontFamily: "'Space Grotesk', 'Noto Sans Ethiopic', sans-serif", fontWeight: 700, color: theme.color };

  switch (page.layout) {
    case 'cover':
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {photo('p1', { flex: 1, minHeight: 0 })}
          <div style={{ padding: '18px 26px 22px', display: 'flex', flexDirection: 'column', gap: 4, background: page.background === 'green' ? '#0B3D23' : undefined }}>
            {text('kicker', { fontFamily: "'Noto Serif Ethiopic', serif", fontSize: 15, fontWeight: 700, color: theme.accent }, 'Small line above the title')}
            {text('title', { ...head, fontSize: 34, lineHeight: 1.1 }, 'Book title')}
            {text('subtitle', { fontSize: 13, color: theme.muted }, 'Your name · date')}
          </div>
        </div>
      );
    case 'title':
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, textAlign: 'center', alignItems: 'stretch' }}>
          {text('kicker', { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.muted, textAlign: 'center' }, 'Dates or a short line')}
          {text('title', { ...head, fontSize: 36, lineHeight: 1.1, textAlign: 'center' }, 'Chapter title')}
          <div style={{ width: 60, height: 4, margin: '4px auto', background: 'linear-gradient(90deg,#078930 0 33%,#FCDD09 33% 66%,#DA121A 66%)' }} />
          {text('body', { fontSize: 14, lineHeight: 1.6, color: theme.muted, textAlign: 'center' }, 'A few words about this journey', true)}
        </div>
      );
    case 'full-photo':
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {photo('p1', { flex: 1, minHeight: 0 })}
          <div style={{ padding: '10px 24px 26px' }}>{text('caption', { fontSize: 13, color: theme.muted, textAlign: 'center' }, 'Add a caption')}</div>
        </div>
      );
    case 'photo-text':
      return (
        <div style={{ flex: 1, display: 'flex', gap: 18, minHeight: 0 }}>
          {photo('p1', { flex: '1.2 1 0', minWidth: 0 })}
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, minHeight: 0 }}>
            {text('heading', { ...head, fontSize: 22, lineHeight: 1.15 }, 'Heading')}
            {text('meta', { fontSize: 11, color: theme.accent, fontWeight: 600 }, 'Place · date')}
            {text('body', { fontSize: 12.5, lineHeight: 1.6, color: theme.color, flex: 1 }, 'Tell the story of this place…', true)}
          </div>
        </div>
      );
    case 'two-photos':
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
            {photo('p1', { flex: 1, minWidth: 0 })}
            {photo('p2', { flex: 1, minWidth: 0 })}
          </div>
          {text('caption', { fontSize: 13, color: theme.muted, textAlign: 'center' }, 'Add a caption')}
        </div>
      );
    case 'grid-3':
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
            {photo('p1', { flex: '2 1 0', minWidth: 0 })}
            <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              {photo('p2', { flex: 1, minHeight: 0 })}
              {photo('p3', { flex: 1, minHeight: 0 })}
            </div>
          </div>
          {text('caption', { fontSize: 13, color: theme.muted, textAlign: 'center' }, 'Add a caption')}
        </div>
      );
    case 'story':
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', padding: '0 20px' }}>
          {text('heading', { ...head, fontSize: 24, lineHeight: 1.2, textAlign: 'center' }, 'Heading')}
          {text('body', { fontSize: 14, lineHeight: 1.75, textAlign: 'center', color: theme.color, minHeight: 120 }, 'Write anything: a letter, a list, a memory…', true)}
        </div>
      );
    case 'map':
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
          {text('heading', { ...head, fontSize: 22, textAlign: 'center' }, 'Map title')}
          {text('body', { fontSize: 12, color: theme.muted, textAlign: 'center' }, 'A line about where you went')}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxHeight: '100%' }}>
              <WorldCoverageMap scope="ethiopia" visitedCountryIds={new Set(['231'])} visitedRegionCodes={p.ctx.visitedRegions} pins={p.ctx.mapPins} caption={false} />
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function PhotoSlot({ slot, page, ctx, editable, selectedSlot, onSlotSelect, onPhoto, onSelect, style }: Props & { slot: string; style?: CSSProperties }) {
  const mediaId = page.slots[slot];
  const url = ctx.photoUrl(mediaId);
  const active = editable && selectedSlot === slot;

  function onDrop(e: DragEvent) {
    const id = e.dataTransfer.getData(MEDIA_MIME);
    if (!id) return;
    e.preventDefault();
    onSelect?.();
    onPhoto?.(slot, id);
  }

  return (
    <div
      onClick={(e) => { if (!editable) return; e.stopPropagation(); onSelect?.(); onSlotSelect?.(slot); }}
      onDragOver={editable ? (e) => { if (e.dataTransfer.types.includes(MEDIA_MIME)) e.preventDefault(); } : undefined}
      onDrop={editable ? onDrop : undefined}
      role={editable ? 'button' : undefined}
      aria-label={editable ? (url ? 'Photo box: tap to replace' : 'Empty photo box: drop a photo here') : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={editable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(); onSlotSelect?.(slot); } } : undefined}
      style={{
        position: 'relative', background: url ? `#D9CFBC url("${url}") center / cover no-repeat` : '#EDE6D6',
        outline: active ? '3px solid #FCDD09' : undefined, outlineOffset: -3,
        display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
      }}
    >
      {!url ? (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#8A7D63', fontSize: 12, textAlign: 'center', padding: 8 }}>
          <Icon name="photo" size={26} />
          {editable ? 'Drop a photo here' : ''}
        </span>
      ) : null}
      {editable && url && active ? (
        <button type="button" aria-label="Remove photo" onClick={(e) => { e.stopPropagation(); onPhoto?.(slot, null); }}
          style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', border: 0, background: 'rgba(29,26,20,0.8)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </div>
  );
}

function TextSlot({ slot, value, placeholder, style, multiline, editable, onText, onSelect, onSlotSelect, selectedSlot }: Props & {
  slot: string; value: string; placeholder: string; style: CSSProperties; multiline: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!multiline && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value, multiline]);

  if (!editable) {
    if (!value) return null;
    return <div style={{ whiteSpace: 'pre-line', overflow: 'hidden', ...style }}>{value}</div>;
  }
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      rows={1}
      onFocus={() => { onSelect?.(); onSlotSelect?.(slot); }}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onText?.(slot, e.target.value)}
      style={{
        display: 'block', width: '100%', border: 0, background: selectedSlot === slot ? 'rgba(252,221,9,0.14)' : 'transparent',
        resize: 'none', padding: 2, margin: 0, outline: 'none', overflow: 'hidden', borderRadius: 4, font: 'inherit',
        boxShadow: selectedSlot === slot ? 'inset 0 0 0 1px rgba(183,133,26,0.6)' : undefined,
        minHeight: multiline ? 60 : undefined,
        ...style,
      }}
    />
  );
}
