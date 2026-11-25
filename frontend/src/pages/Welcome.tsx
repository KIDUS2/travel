import { signIn } from '../auth/keycloak';
import { TeguwazLogo } from '../components/TeguwazLogo';
import { config } from '../config';

const PILLARS = [
  { am: 'ትዝታ', title: 'Keep every moment', text: 'Photos, notes and places from each trip, private unless you choose to share.' },
  { am: 'ካርታ', title: 'See how far you have gone', text: 'Your map fills in as you travel: regions of Ethiopia first, then the world.' },
  { am: 'መጽሐፍ', title: 'Turn a trip into a book', text: 'Design a photo book page by page and keep it on your shelf.' },
  { am: 'ስቱዲዮ', title: 'Grow your channels', text: 'YouTube, TikTok and Instagram numbers in one place, for creators.' },
];

/** The first page a visitor sees: what Teguwaz is, and how to get in. */
export function Welcome() {
  const go = (fn: () => Promise<void>) => () => {
    if (config.demoMode) {
      window.location.assign('/');
      return;
    }
    void fn();
  };

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-inner">
          <TeguwazLogo />
          <h1 className="am-serif welcome-title">ጉዞህን አስታውስ።<span>Remember every journey.</span></h1>
          <p className="welcome-lead">
            Teguwaz (ተጓዥ, "traveler") keeps your travel memories, maps where you have been, and turns trips into books. Made in Ethiopia, for travelers everywhere.
          </p>
          <div className="welcome-actions">
            {config.googleSignIn || config.demoMode ? (
              <button type="button" className="btn welcome-google" onClick={go(signIn.google)}>
                <span className="welcome-g" aria-hidden="true">G</span>Continue with Google
              </button>
            ) : null}
            <button type="button" className="btn btn-yellow" onClick={go(signIn.register)}>Create a free account</button>
            <button type="button" className="btn btn-ghost-dark" onClick={go(signIn.email)}>Sign in with email</button>
          </div>
          <p className="welcome-fine">Free to use. Your private memories are never shown to anyone else.</p>
        </div>
        <div className="tibeb" />
      </div>
      <section className="welcome-pillars" aria-label="What you can do">
        {PILLARS.map((p) => (
          <article key={p.title} className="card card-pad welcome-pillar">
            <span className="am welcome-pillar-am">{p.am}</span>
            <h2>{p.title}</h2>
            <p className="muted">{p.text}</p>
          </article>
        ))}
      </section>
      <footer className="welcome-footer muted small">
        <span>© {new Date().getFullYear()} Teguwaz · ተጓዥ</span>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </footer>
    </div>
  );
}
