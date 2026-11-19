import type { CSSProperties } from 'react';
import type { BookPage, BookSettings } from '../../api/types';
import { PAGE_RATIO } from './layouts';
import { PageView, type PageContext } from './PageView';

const EMPTY_CTX: PageContext = { photoUrl: () => undefined, mapPins: [], visitedRegions: new Set() };

/**
 * A book drawn in 3D: the real cover page on the front, page edges on the side
 * (thicker with more pages), a spine shadow and a floor shadow. It opens a little on hover.
 */
export function Book3D({ page, settings, height, pageCount = 24, photoUrl, ctx, title, style }: {
  page: BookPage | null;
  settings: BookSettings;
  height: number;
  pageCount?: number;
  photoUrl?: string | null;
  ctx?: PageContext;
  title?: string;
  style?: CSSProperties;
}) {
  const width = Math.round(height * PAGE_RATIO[settings.size]);
  const thickness = Math.round(Math.min(26, Math.max(7, 5 + pageCount * 0.45)) * (settings.finish === 'soft' ? 0.7 : 1));
  const pageCtx: PageContext = ctx ?? { ...EMPTY_CTX, photoUrl: (id) => (id && photoUrl ? photoUrl : undefined) };
  const cover: BookPage = page ?? { id: 'empty', layout: 'cover', background: 'green', slots: { title: title ?? 'Untitled' } };

  return (
    <div className="book3d" style={{ width: width + thickness, height: height + 18, ...style }} aria-hidden="true">
      <div className="book3d-inner" style={{ width, height, ['--t' as string]: `${thickness}px` }}>
        <div className="book3d-back" />
        <div className="book3d-pages" style={{ width: thickness, left: width - thickness / 2 }} />
        <div className="book3d-top" style={{ height: thickness, top: -thickness / 2 }} />
        <div className="book3d-front">
          <PageView page={cover} settings={settings} ctx={pageCtx} width={width} />
          <span className="book3d-spine" />
          <span className="book3d-gloss" />
        </div>
      </div>
      <span className="book3d-shadow" style={{ width: width * 0.9 }} />
    </div>
  );
}
