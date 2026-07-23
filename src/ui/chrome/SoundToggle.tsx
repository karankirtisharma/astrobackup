import { useEffect, useState } from 'react';
import { isSoundOn, onSoundChange, setSoundOn, unlockAudio } from '../../audio/engine';
import { cue } from '../../audio/cues';

/**
 * Sound on/off. Always visible, never a surprise — the one control a visitor
 * reaches for first if audio is not welcome.
 *
 * The bars animate only while sound is ON, so the control states its own value
 * without needing a label.
 */
export function SoundToggle() {
  const [on, setOn] = useState(isSoundOn);

  useEffect(() => onSoundChange(setOn), []);

  return (
    <button
      type="button"
      className={`cy-sound${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
      title={on ? 'Sound on' : 'Sound off'}
      onClick={() => {
        // The click IS the gesture the browser needs, so unlock first —
        // otherwise turning sound on does nothing until some later click.
        unlockAudio();
        const next = !on;
        setSoundOn(next);
        if (next) cue.click();
      }}
    >
      <span className="cy-sound__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
