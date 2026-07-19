import { useEffect, useRef, useState } from 'react';
import { Logo } from './Logo';

const LINKS = ['HOME', 'MANIFESTO', 'SERVICES', 'CONTACT'] as const;

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and hands focus back to the burger.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        burger.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <>
      <header className="cy-nav">
        <div className="cy-nav__brand">
          <Logo size={30} />
          <h1 className="cy-nav__wordmark">CYPHERNAUT</h1>
        </div>

        <nav className="cy-nav__pill ia" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link}
              className="cy-nav__link"
              href="#"
              aria-current={link === 'MANIFESTO' ? 'page' : undefined}
              onClick={(e) => e.preventDefault()}
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="cy-nav__right">
          <div className="cy-nav__secure" aria-label="Secure channel, end-to-end encrypted">
            <div className="cy-nav__secure-title">
              SECURE CHANNEL <span className="cy-dot cy-dot--pulse" aria-hidden="true" />
            </div>
            <div className="cy-nav__secure-sub">END-TO-END ENCRYPTED</div>
          </div>
          <button
            ref={burger}
            className="cy-nav__burger ia"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="cy-menu ia" aria-label="Menu" onClick={() => setMenuOpen(false)}>
          <ul className="cy-menu__list">
            {LINKS.map((link) => (
              <li key={link}>
                <a
                  className="cy-menu__link"
                  href="#"
                  aria-current={link === 'MANIFESTO' ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                  }}
                >
                  {link}
                  {link !== 'MANIFESTO' && (
                    <span className="cy-menu__soon" style={{ color: 'var(--grey-3)' }}>
                      TRANSMISSION PENDING
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
