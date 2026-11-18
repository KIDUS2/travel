import type { ReactNode } from 'react';

export function PageHeader({ title, am, subtitle, eyebrow, actions }: {
  title: string;
  am: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="stack" style={{ gap: 6 }}>
        {eyebrow ? <span className="muted" style={{ fontSize: 14 }}>{eyebrow}</span> : null}
        <h1 className="page-title">
          {title} <span className="am-serif">{am}</span>
        </h1>
        {subtitle ? <p className="muted" style={{ margin: 0, fontSize: 16 }}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="pills">{actions}</div> : null}
    </header>
  );
}

export function SampleNote({ children = 'Sample data. This screen connects to the backend in a later feature.' }: { children?: ReactNode }) {
  return <p className="muted small" style={{ margin: 0 }}>{children}</p>;
}
