import { ASTRONAUT_BENTO as A } from '../../config/content';
import { TypeLabel, CountUp, FieldRow } from './primitives';
import { Card, ArtSlot, IdentityChip } from './Card';
import { SkullArt, SuitArt, PlanetArt } from './art';

/**
 * The astronaut dossier — seven modules mirroring the cypherpunk board's
 * grammar in mission language. Left column carries identity and telemetry,
 * right column the log and the suit.
 */
export function AstronautBody() {
  return (
    <div className="cy-bento">
      <div className="cy-bento__col">
        <Card className="cy-card--identity">
          <IdentityChip />
          {A.identity.map((f) => (
            <FieldRow key={f.label} {...f} />
          ))}
        </Card>

        <Card title="VITALS" className="cy-card--vitals">
          <div className="cy-bio">
            <ArtSlot name="skull" className="cy-bio__art" fallback={<SkullArt />} />
            <div className="cy-bio__stats">
              {A.vitals.map((v) => (
                <div className="cy-bio__row" key={v.label} data-anim="fade">
                  <span className="cy-field__label">{v.label}</span>
                  <span className="cy-bio__figure num">
                    <TypeLabel text={v.value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="cy-card__foot" data-anim="fade">
            <span className="cy-field__label">SCAN QUALITY</span>
            <span className="cy-field__value cy-field__value--accent num">
              <CountUp to={A.scanQuality} decimals={1} suffix="%" />
            </span>
          </div>
        </Card>

        <Card title="ENVIRONMENT" className="cy-card--env">
          <div className="cy-meta-rows cy-meta-rows--lg">
            {A.environment.map((r) => (
              <div className="row" key={r.label} data-anim="fade">
                <span>{r.label}</span>
                <b>{r.value}</b>
              </div>
            ))}
          </div>
        </Card>

        <Card title="MISSION PROFILE" className="cy-card--profile">
          <div className="cy-profile">
            <ArtSlot name="planet" className="cy-profile__art" fallback={<PlanetArt />} />
            <ul className="cy-profile__words">
              {A.profileWords.map((w) => (
                <li key={w} data-anim="fade">
                  <TypeLabel text={w} />
                </li>
              ))}
            </ul>
          </div>
          <div className="cy-card__foot cy-card__foot--stack" data-anim="fade">
            <span className="cy-field__label">STATUS</span>
            <span className="cy-field__value">
              {A.profileStatus}
              <span className="cy-dot" aria-hidden="true" />
            </span>
          </div>
        </Card>
      </div>

      <div className="cy-bento__col">
        <Card title="MISSION LOG" className="cy-card--log">
          <div className="cy-log">
            {A.missionLog.map((b) => (
              <div className="cy-log__block" key={b.label}>
                <span className="cy-log__label" data-anim="fade">
                  {b.label}
                </span>
                {b.lines.map((l) => (
                  <div className="cy-log__line" key={l} data-anim="fade">
                    <TypeLabel text={l} />
                  </div>
                ))}
                {b.bullets && (
                  <ul className="cy-log__bullets">
                    {b.bullets.map((l) => (
                      <li key={l} data-anim="fade">
                        <TypeLabel text={l} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="SUIT DIAGNOSTICS" className="cy-card--suit">
          <div className="cy-suit">
            <ArtSlot name="suit" className="cy-suit__art" fallback={<SuitArt />} />
            <div className="cy-suit__stats">
              {A.suitStats.map((s) => (
                <div className="row" key={s.label} data-anim="fade">
                  <span>{s.label}</span>
                  <b>{s.value}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="cy-meta-rows cy-suit__meta">
            {A.suitMeta.map((s) => (
              <div className="row" key={s.label} data-anim="fade">
                <span>{s.label}</span>
                <b>{s.value}</b>
              </div>
            ))}
          </div>
        </Card>

        <Card title="X-RAY SCAN" className="cy-card--xray">
          <div className="cy-suit">
            <ArtSlot
              name="suit-xray"
              className="cy-suit__art"
              fallback={<SuitArt wire />}
            />
            <div className="cy-xray__meta">
              {A.xray.map((x) => (
                <div className="cy-xray__block" key={x.label}>
                  <span className="cy-field__label" data-anim="fade">
                    {x.label}
                  </span>
                  {x.lines.map((l) => (
                    <div className="cy-xray__line" key={l} data-anim="fade">
                      <TypeLabel text={l} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
