import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { Logo } from '../../ui/chrome/Logo';
import { AsciiGlitchRipple } from '../../ui/fx/AsciiGlitchRipple';

gsap.registerPlugin(CustomEase);

/**
 * Sterling Gate — kinetic full-screen navigation.
 *
 * VENDORED and themed for CYPHERNAUT. The upstream snippet ships only its
 * markup + GSAP timelines; every class it references was undefined, so the
 * layout lives in styles/sterling-nav.css and the two are a matched pair.
 *
 * Site-specific changes:
 *  - Purple/indigo/pink ambient shapes recoloured to protocol green.
 *  - The demo's "click me" affordance replaced by the secure-channel status
 *    the old nav carried, so no site chrome is lost in the swap.
 *  - Menu labels are this site's IA, and each one is an AsciiGlitchRipple —
 *    the same character-scramble the HUD and footer use.
 *  - The dead `.arrow-line` block is removed (its own comment notes the arrow
 *    no longer exists in the markup, and it queried `document` globally rather
 *    than the scoped container).
 */

interface MenuEntry {
  label: string;
  shape: number;
}

const MENU: MenuEntry[] = [
  { label: 'HOME', shape: 1 },
  { label: 'MANIFESTO', shape: 2 },
  { label: 'PROTOCOL', shape: 3 },
  { label: 'DOSSIERS', shape: 4 },
  { label: 'CONTACT', shape: 5 },
];

export function SterlingGateNav() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Shape hover wiring — one ambient SVG per menu row.
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      if (!gsap.parseEase('main')) {
        CustomEase.create('main', '0.65, 0.01, 0.05, 0.99');
      }
    } catch {
      // CustomEase unavailable — the timelines below name their own eases,
      // so nothing depends on "main" existing.
    }

    const ctx = gsap.context(() => {
      const menuItems = containerRef.current!.querySelectorAll('.menu-list-item[data-shape]');
      const shapesContainer = containerRef.current!.querySelector('.ambient-background-shapes');
      const cleanups: Array<() => void> = [];

      menuItems.forEach((item) => {
        const shapeIndex = item.getAttribute('data-shape');
        const shape = shapesContainer?.querySelector(`.bg-shape-${shapeIndex}`);
        if (!shape) return;

        const shapeEls = shape.querySelectorAll('.shape-element');

        const onEnter = () => {
          shapesContainer?.querySelectorAll('.bg-shape').forEach((s) => s.classList.remove('active'));
          shape.classList.add('active');
          gsap.fromTo(
            shapeEls,
            { scale: 0.5, opacity: 0, rotation: -10 },
            {
              scale: 1,
              opacity: 1,
              rotation: 0,
              duration: 0.6,
              stagger: 0.08,
              ease: 'back.out(1.7)',
              overwrite: 'auto',
            }
          );
        };

        const onLeave = () => {
          gsap.to(shapeEls, {
            scale: 0.8,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => shape.classList.remove('active'),
            overwrite: 'auto',
          });
        };

        item.addEventListener('mouseenter', onEnter);
        item.addEventListener('mouseleave', onLeave);
        // Upstream stashed this on the node as `_cleanup`; a local list keeps
        // the DOM clean and survives the same revert.
        cleanups.push(() => {
          item.removeEventListener('mouseenter', onEnter);
          item.removeEventListener('mouseleave', onLeave);
        });
      });

      return () => cleanups.forEach((fn) => fn());
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Open / close timeline.
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const navWrap = containerRef.current!.querySelector('.nav-overlay-wrapper');
      const menu = containerRef.current!.querySelector('.menu-content');
      const overlay = containerRef.current!.querySelector('.overlay');
      const bgPanels = containerRef.current!.querySelectorAll('.backdrop-layer');
      const menuLinks = containerRef.current!.querySelectorAll('.nav-link');
      const fadeTargets = containerRef.current!.querySelectorAll('[data-menu-fade]');

      const menuButton = containerRef.current!.querySelector('.nav-close-btn');
      const menuButtonTexts = menuButton?.querySelectorAll('p');
      const menuButtonIcon = menuButton?.querySelector('.menu-button-icon');

      const tl = gsap.timeline({ defaults: { ease: 'main', duration: 0.7 } });

      if (isMenuOpen) {
        navWrap?.setAttribute('data-nav', 'open');

        tl.set(navWrap, { display: 'block' })
          .set(menu, { xPercent: 0 }, '<')
          .fromTo(menuButtonTexts!, { yPercent: 0 }, { yPercent: -100, stagger: 0.2 })
          .fromTo(menuButtonIcon!, { rotate: 0 }, { rotate: 315 }, '<')
          .fromTo(overlay!, { autoAlpha: 0 }, { autoAlpha: 1 }, '<')
          .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, '<')
          .fromTo(
            menuLinks,
            { yPercent: 140, rotate: 10 },
            { yPercent: 0, rotate: 0, stagger: 0.05 },
            '<+=0.35'
          );

        if (fadeTargets.length) {
          tl.fromTo(
            fadeTargets,
            { autoAlpha: 0, yPercent: 50 },
            { autoAlpha: 1, yPercent: 0, stagger: 0.04, clearProps: 'all' },
            '<+=0.2'
          );
        }
      } else {
        navWrap?.setAttribute('data-nav', 'closed');

        // MIRROR of the open, played back-to-front.
        //
        // Upstream closed by sliding the whole panel out (menu -> xPercent 120)
        // — but the OPEN never moves the panel at all: it staggers the three
        // backdrop layers in and lifts the links behind their masks. So the
        // close threw away every piece of choreography the open had just built
        // and replaced it with one flat slide. That asymmetry is the whole
        // reason it read as cheap next to the opening.
        //
        // Now it unwinds in reverse order (links out from the BOTTOM up, then
        // the layers back out on a reversed stagger, then the overlay), which
        // is the same motion language running backwards. Slightly quicker than
        // the open, as a dismissal should be.
        if (fadeTargets.length) {
          tl.to(fadeTargets, {
            autoAlpha: 0,
            yPercent: 50,
            stagger: { each: 0.03, from: 'end' },
            duration: 0.3,
          });
        }

        tl.to(
          menuLinks,
          {
            yPercent: 140,
            rotate: 10,
            stagger: { each: 0.045, from: 'end' },
            duration: 0.5,
          },
          fadeTargets.length ? '<' : 0
        )
          .to(
            bgPanels,
            { xPercent: 101, stagger: { each: 0.1, from: 'end' }, duration: 0.5 },
            '<+=0.18'
          )
          .to(overlay!, { autoAlpha: 0, duration: 0.45 }, '<+=0.12')
          .to(menuButtonTexts!, { yPercent: 0, stagger: 0.12 }, '<')
          .to(menuButtonIcon!, { rotate: 0 }, '<')
          // The panel itself never moved, so nothing to reset — but the next
          // open re-asserts every from-state via fromTo regardless.
          .set(navWrap, { display: 'none' });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isMenuOpen]);

  // Escape closes.
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div ref={containerRef} className="cy-sgnav">
      <div className="site-header-wrapper">
        <header className="header">
          <div className="container is--full">
            <nav className="nav-row">
              <a href="#" aria-label="Cyphernaut home" className="nav-logo-row">
                <Logo size={22} />
                <span className="nav-wordmark">CYPHERNAUT</span>
              </a>
              <div className="nav-row__right">
                {/* Was the demo's "click me" — carries the old nav's
                    secure-channel status instead so the swap loses nothing. */}
                <div className="nav-toggle-label" aria-hidden="true">
                  <span className="toggle-text">CORE // v2.4</span>
                  <i className="nav-status-dot" />
                </div>

                <button
                  type="button"
                  className="nav-close-btn"
                  onClick={toggleMenu}
                  aria-expanded={isMenuOpen}
                  aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  <div className="menu-button-text" aria-hidden="true">
                    <p className="p-large">Menu</p>
                    <p className="p-large">Close</p>
                  </div>
                  <div className="icon-wrap">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="100%"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="menu-button-icon"
                      aria-hidden="true"
                    >
                      <path d="M7.33333 16L7.33333 -3.2055e-07L8.66667 -3.78832e-07L8.66667 16L7.33333 16Z" fill="currentColor" />
                      <path d="M16 8.66667L-2.62269e-07 8.66667L-3.78832e-07 7.33333L16 7.33333L16 8.66667Z" fill="currentColor" />
                      <path d="M6 7.33333L7.33333 7.33333L7.33333 6C7.33333 6.73637 6.73638 7.33333 6 7.33333Z" fill="currentColor" />
                      <path d="M10 7.33333L8.66667 7.33333L8.66667 6C8.66667 6.73638 9.26362 7.33333 10 7.33333Z" fill="currentColor" />
                      <path d="M6 8.66667L7.33333 8.66667L7.33333 10C7.33333 9.26362 6.73638 8.66667 6 8.66667Z" fill="currentColor" />
                      <path d="M10 8.66667L8.66667 8.66667L8.66667 10C8.66667 9.26362 9.26362 8.66667 10 8.66667Z" fill="currentColor" />
                    </svg>
                  </div>
                </button>
              </div>
            </nav>
          </div>
        </header>
      </div>

      <section className="fullscreen-menu-container">
        <div data-nav="closed" className="nav-overlay-wrapper">
          <div className="overlay" onClick={closeMenu} />
          <nav className="menu-content" aria-label="Main menu">
            <div className="menu-bg">
              <div className="backdrop-layer first" />
              <div className="backdrop-layer second" />
              <div className="backdrop-layer" />

              {/* Ambient shapes — recoloured from the upstream indigo/violet/pink
                  to the protocol green ramp. */}
              <div className="ambient-background-shapes" aria-hidden="true">
                <svg className="bg-shape bg-shape-1" viewBox="0 0 400 400" fill="none">
                  <circle className="shape-element" cx="80" cy="120" r="40" fill="rgba(176,245,70,0.15)" />
                  <circle className="shape-element" cx="300" cy="80" r="60" fill="rgba(110,154,47,0.14)" />
                  <circle className="shape-element" cx="200" cy="300" r="80" fill="rgba(176,245,70,0.08)" />
                  <circle className="shape-element" cx="350" cy="280" r="30" fill="rgba(176,245,70,0.16)" />
                </svg>

                <svg className="bg-shape bg-shape-2" viewBox="0 0 400 400" fill="none">
                  <path className="shape-element" d="M0 200 Q100 100, 200 200 T 400 200" stroke="rgba(176,245,70,0.18)" strokeWidth="60" fill="none" />
                  <path className="shape-element" d="M0 280 Q100 180, 200 280 T 400 280" stroke="rgba(110,154,47,0.16)" strokeWidth="40" fill="none" />
                </svg>

                <svg className="bg-shape bg-shape-3" viewBox="0 0 400 400" fill="none">
                  <circle className="shape-element" cx="50" cy="50" r="8" fill="rgba(176,245,70,0.3)" />
                  <circle className="shape-element" cx="150" cy="50" r="8" fill="rgba(110,154,47,0.32)" />
                  <circle className="shape-element" cx="250" cy="50" r="8" fill="rgba(176,245,70,0.26)" />
                  <circle className="shape-element" cx="350" cy="50" r="8" fill="rgba(110,154,47,0.3)" />
                  <circle className="shape-element" cx="100" cy="150" r="12" fill="rgba(176,245,70,0.22)" />
                  <circle className="shape-element" cx="200" cy="150" r="12" fill="rgba(110,154,47,0.26)" />
                  <circle className="shape-element" cx="300" cy="150" r="12" fill="rgba(176,245,70,0.24)" />
                  <circle className="shape-element" cx="50" cy="250" r="10" fill="rgba(110,154,47,0.3)" />
                  <circle className="shape-element" cx="150" cy="250" r="10" fill="rgba(176,245,70,0.28)" />
                  <circle className="shape-element" cx="250" cy="250" r="10" fill="rgba(110,154,47,0.3)" />
                  <circle className="shape-element" cx="350" cy="250" r="10" fill="rgba(176,245,70,0.26)" />
                  <circle className="shape-element" cx="100" cy="350" r="6" fill="rgba(176,245,70,0.3)" />
                  <circle className="shape-element" cx="200" cy="350" r="6" fill="rgba(110,154,47,0.3)" />
                  <circle className="shape-element" cx="300" cy="350" r="6" fill="rgba(176,245,70,0.28)" />
                </svg>

                <svg className="bg-shape bg-shape-4" viewBox="0 0 400 400" fill="none">
                  <path className="shape-element" d="M100 100 Q150 50, 200 100 Q250 150, 200 200 Q150 250, 100 200 Q50 150, 100 100" fill="rgba(176,245,70,0.12)" />
                  <path className="shape-element" d="M250 200 Q300 150, 350 200 Q400 250, 350 300 Q300 350, 250 300 Q200 250, 250 200" fill="rgba(110,154,47,0.12)" />
                </svg>

                <svg className="bg-shape bg-shape-5" viewBox="0 0 400 400" fill="none">
                  <line className="shape-element" x1="0" y1="100" x2="300" y2="400" stroke="rgba(176,245,70,0.15)" strokeWidth="30" />
                  <line className="shape-element" x1="100" y1="0" x2="400" y2="300" stroke="rgba(110,154,47,0.14)" strokeWidth="25" />
                  <line className="shape-element" x1="200" y1="0" x2="400" y2="200" stroke="rgba(176,245,70,0.1)" strokeWidth="20" />
                </svg>
              </div>
            </div>

            <div className="menu-content-wrapper">
              <ul className="menu-list">
                {MENU.map((entry) => (
                  <li className="menu-list-item" data-shape={entry.shape} key={entry.label}>
                    <a href="#" className="nav-link" onClick={(e) => e.preventDefault()}>
                      {/* The site's character-scramble, on every row. */}
                      <AsciiGlitchRipple
                        as="p"
                        className="nav-link-text"
                        dur={820}
                        spread={1.25}
                      >
                        {entry.label}
                      </AsciiGlitchRipple>
                      <div className="nav-link-hover-bg" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </section>
    </div>
  );
}

export default SterlingGateNav;
