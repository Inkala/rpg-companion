import type { CharacterReferenceStat, HitPoints } from './types';

export function HitPointStat({ hitPoints }: { hitPoints: HitPoints }) {
  const hpStateClass =
    hitPoints.current === hitPoints.max ? 'stat--hp-full' : 'stat--hp-reduced';

  return (
    <div className={`stat stat--hp ${hpStateClass}`}>
      <dt>HP</dt>
      <dd>
        <HitPointValue hitPoints={hitPoints} />
      </dd>
    </div>
  );
}

export function HitPointValue({ hitPoints }: { hitPoints: HitPoints }) {
  if (hitPoints.current === hitPoints.max) {
    return <span className="hp-value hp-value--full">{hitPoints.max}</span>;
  }

  return (
    <span className="hp-value hp-value--split">
      <span className="hp-value__current">{hitPoints.current}</span>
      <span className="hp-value__separator" aria-hidden="true">
        {' '}
        /{' '}
      </span>
      <span className="hp-value__max">{hitPoints.max}</span>
    </span>
  );
}

export function Stat({ label, value, emphasis }: CharacterReferenceStat) {
  return (
    <div className={emphasis ? `stat stat--${emphasis}` : 'stat'}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
