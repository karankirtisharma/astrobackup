import { Logo } from './chrome/Logo';
import { DOSSIERS, MANIFESTO_LINES } from '../config/content';

/**
 * The static record. When WebGL2 is absent, dies twice, or the hardware is
 * hopeless, the experience's CONTENT survives as a flat classified document —
 * only the interactivity is lost.
 */
export function Fallback() {
  return (
    <main className="cy-fallback">
      <div style={{ color: 'var(--text-hi)' }}>
        <Logo size={56} />
      </div>
      <h1 className="cy-fallback__title">CYPHERNAUT</h1>
      <p className="cy-fallback__note">
        SIGNAL LOST — SWITCHING TO STATIC RECORD. THE MANIFESTO SURVIVES.
      </p>

      <div className="cy-fallback__doc">
        {(['cypherpunk', 'astronaut'] as const).map((side) => {
          const d = DOSSIERS[side];
          return (
            <section key={side} className="cy-section">
              <h2 className="cy-section__title">{`${d.title} ${d.subtitle}`}</h2>
              <div className="cy-section__rule" />
              {d.identity.map((f) => (
                <div className="cy-field" key={f.label}>
                  <span className="cy-field__label">{f.label}</span>
                  <span className={`cy-field__value${f.accent ? ' cy-field__value--accent' : ''}`}>
                    {f.value}
                  </span>
                </div>
              ))}
            </section>
          );
        })}
        <section className="cy-section">
          <h2 className="cy-section__title">CORE DECLARATION v2.4</h2>
          <div className="cy-section__rule" />
          {MANIFESTO_LINES.map((line, i) => (
            <p className="cy-mission__statement" key={i}>
              {line}
            </p>
          ))}
        </section>
      </div>
    </main>
  );
}
