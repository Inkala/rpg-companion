import { useEffect, useRef, useState, type RefObject } from 'react'
import huninLogo from './assets/brand/hunin-logo.svg'
import maraPortrait from './assets/characters/mara-vale-portrait.webp'
import './App.css'

type View = 'landing' | 'reference'
type SectionId = 'actions' | 'features' | 'spells'

type ReferenceItem = {
  id: string
  name: string
  hint: string
  meta: string[]
  opensSheet?: boolean
}

const mara = {
  name: 'Mara Vale',
  identity: 'Human Ranger · Level 3',
  landingIdentity: 'Human Ranger 3',
  supportingIdentity: 'Hunter · Outlander',
  concept:
    'A steady wilderness scout with a clear attack, useful spells, and quick rules reminders.',
  stats: {
    hp: '26 / 26',
    ac: '14',
    speed: '30 ft.',
    initiative: '+3',
    passivePerception: '14',
    proficiency: '+2',
    concentration: 'No concentration',
  },
}

const referenceSections: Record<SectionId, ReferenceItem[]> = {
  actions: [
    {
      id: 'longbow',
      name: 'Longbow',
      hint: 'Reliable ranged attack.',
      meta: ['Action', '+7 to hit', '1d8 + 3 piercing', '150 / 600 ft.'],
    },
    {
      id: 'shortsword',
      name: 'Shortsword',
      hint: 'A close-range backup weapon.',
      meta: ['Action', '+5 to hit', '1d6 + 3 piercing'],
    },
  ],
  features: [
    {
      id: 'archery',
      name: 'Archery',
      hint: '+2 to ranged weapon attack rolls.',
      meta: ['Fighting Style', 'Passive'],
    },
    {
      id: 'colossus-slayer',
      name: 'Colossus Slayer',
      hint: 'Add 1d8 after hitting an already wounded enemy.',
      meta: ['Hunter feature', 'Once per turn'],
      opensSheet: true,
    },
  ],
  spells: [
    {
      id: 'hunters-mark',
      name: "Hunter's Mark",
      hint: 'Mark one creature and add 1d6 damage on weapon hits.',
      meta: ['1st-level spell', 'Bonus Action', 'Concentration', 'Up to 1 hour'],
    },
    {
      id: 'fog-cloud',
      name: 'Fog Cloud',
      hint: 'Create a sphere of heavily obscuring fog.',
      meta: ['1st-level spell', 'Action', 'Concentration', 'Up to 1 hour'],
    },
    {
      id: 'cure-wounds',
      name: 'Cure Wounds',
      hint: 'Restore hit points to a creature you touch.',
      meta: ['1st-level spell', 'Action', 'Instantaneous'],
    },
  ],
}

const sectionLabels: Record<SectionId, string> = {
  actions: 'Actions',
  features: 'Features',
  spells: 'Spells',
}

const futureActionDescription =
  'Planned for a later slice. This control is visible for product context but is not available yet.'

export function App() {
  const [view, setView] = useState<View>('landing')
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    actions: true,
    features: false,
    spells: false,
  })
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const colossusRowRef = useRef<HTMLButtonElement>(null)

  function showReference() {
    setView('reference')
    setOpenSections({ actions: true, features: false, spells: false })
    setIsSheetOpen(false)
  }

  function showLanding() {
    setView('landing')
    setIsSheetOpen(false)
  }

  function toggleSection(sectionId: SectionId) {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }))
  }

  function openColossusSheet() {
    setIsSheetOpen(true)
  }

  function closeColossusSheet() {
    setIsSheetOpen(false)
    window.setTimeout(() => {
      colossusRowRef.current?.focus()
    }, 0)
  }

  return (
    <>
      {view === 'landing' ? (
        <GuestLanding onExploreMara={showReference} />
      ) : (
        <CharacterReference
          openSections={openSections}
          onBack={showLanding}
          onToggleSection={toggleSection}
          onOpenColossusSheet={openColossusSheet}
          colossusRowRef={colossusRowRef}
        />
      )}

      {isSheetOpen ? (
        <ColossusSlayerSheet onClose={closeColossusSheet} />
      ) : null}
    </>
  )
}

function GuestLanding({ onExploreMara }: { onExploreMara: () => void }) {
  return (
    <main className="app-shell landing-page">
      <p id="future-entry-description" className="sr-only">
        {futureActionDescription}
      </p>

      <section className="brand-block" aria-labelledby="landing-title">
        <img className="brand-logo" src={huninLogo} alt="Hunin" />
        <h1 id="landing-title" className="sr-only">
          Hunin
        </h1>
        <p className="brand-tagline">Your party companion.</p>
        <p className="brand-support">
          Create, bring in, and understand a character without decoding the
          whole sheet.
        </p>
      </section>

      <section className="sample-card" aria-labelledby="sample-character-title">
        <div className="sample-card__rule" aria-hidden="true" />
        <div className="sample-card__identity">
          <img
            className="portrait portrait--landing"
            src={maraPortrait}
            alt="Portrait of Mara Vale"
          />
          <div>
            <p className="eyebrow">Sample character</p>
            <h2 id="sample-character-title" className="character-name">
              {mara.name}
            </h2>
            <p className="identity-line">{mara.identity}</p>
          </div>
        </div>

        <dl className="landing-stat-strip" aria-label="Mara Vale quick stats">
          <Stat label="HP" value={mara.stats.hp} />
          <Stat label="AC" value={mara.stats.ac} />
          <Stat label="Speed" value={mara.stats.speed} />
        </dl>

        <div className="badge-row" aria-label="Featured abilities">
          <span className="badge badge--neutral">Longbow</span>
          <span className="badge badge--neutral">Colossus Slayer</span>
        </div>

        <p className="preview-note">{mara.concept}</p>

        <button className="button button--primary" onClick={onExploreMara}>
          Explore Mara
        </button>
      </section>

      <section className="start-group" aria-labelledby="start-your-own">
        <h2 id="start-your-own" className="section-kicker">
          Start your own
        </h2>
        <FutureEntryPoint label="Create a character" />
        <FutureEntryPoint label="Add an existing character" />
      </section>

      <nav className="quiet-actions" aria-label="Account actions">
        <FutureEntryPoint label="Sign in" variant="quiet" />
        <FutureEntryPoint label="I have a party invite" variant="quiet" />
      </nav>
    </main>
  )
}

function FutureEntryPoint({
  label,
  variant = 'secondary',
}: {
  label: string
  variant?: 'secondary' | 'quiet'
}) {
  const className =
    variant === 'quiet'
      ? 'future-link'
      : 'button button--secondary future-button'

  return (
    <button
      type="button"
      className={className}
      aria-disabled="true"
      aria-describedby="future-entry-description"
    >
      <span>{label}</span>
      <span className="future-tag" aria-hidden="true">
        Planned
      </span>
    </button>
  )
}

function CharacterReference({
  openSections,
  onBack,
  onToggleSection,
  onOpenColossusSheet,
  colossusRowRef,
}: {
  openSections: Record<SectionId, boolean>
  onBack: () => void
  onToggleSection: (sectionId: SectionId) => void
  onOpenColossusSheet: () => void
  colossusRowRef: RefObject<HTMLButtonElement | null>
}) {
  return (
    <main className="app-shell reference-page">
      <p id="future-entry-description" className="sr-only">
        {futureActionDescription}
      </p>

      <header className="reference-nav">
        <button className="back-button" onClick={onBack}>
          Back
          <span className="sr-only"> to guest landing page</span>
        </button>
        <span className="reference-nav__label" aria-hidden="true">
          Character Reference
        </span>
      </header>

      <section className="reference-summary" aria-labelledby="reference-title">
        <p className="eyebrow">Character Reference</p>
        <h1 id="reference-title">Character Reference</h1>
        <div className="reference-identity">
          <img
            className="portrait portrait--reference"
            src={maraPortrait}
            alt="Portrait of Mara Vale"
          />
          <div>
            <h2 className="character-name reference-character">{mara.name}</h2>
            <p className="identity-line">{mara.identity}</p>
            <p className="supporting-line">{mara.supportingIdentity}</p>
          </div>
        </div>

        <dl className="primary-stats" aria-label="Primary stats">
          <Stat label="HP" value={mara.stats.hp} emphasis="hp" />
          <Stat label="AC" value={mara.stats.ac} emphasis="ac" />
          <Stat label="Speed" value={mara.stats.speed} />
        </dl>

        <p className="status-line">{mara.stats.concentration}</p>

        <dl className="secondary-stats" aria-label="Secondary stats">
          <Stat label="Initiative" value={mara.stats.initiative} />
          <Stat label="Passive Perception" value={mara.stats.passivePerception} />
          <Stat label="Proficiency" value={mara.stats.proficiency} />
        </dl>
      </section>

      <div className="reference-sections">
        {(['actions', 'features', 'spells'] as SectionId[]).map((sectionId) => (
          <ReferenceSection
            key={sectionId}
            sectionId={sectionId}
            isOpen={openSections[sectionId]}
            onToggle={() => onToggleSection(sectionId)}
            onOpenColossusSheet={onOpenColossusSheet}
            colossusRowRef={colossusRowRef}
          />
        ))}
      </div>
    </main>
  )
}

function ReferenceSection({
  sectionId,
  isOpen,
  onToggle,
  onOpenColossusSheet,
  colossusRowRef,
}: {
  sectionId: SectionId
  isOpen: boolean
  onToggle: () => void
  onOpenColossusSheet: () => void
  colossusRowRef: RefObject<HTMLButtonElement | null>
}) {
  const label = sectionLabels[sectionId]
  const items = referenceSections[sectionId]
  const panelId = `${sectionId}-section-panel`

  return (
    <section className="reference-section">
      <button
        type="button"
        className="section-header"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span>
          {label}, {items.length} items
        </span>
        <span className="section-state">{isOpen ? 'Expanded' : 'Collapsed'}</span>
      </button>

      {isOpen ? (
        <div id={panelId} className="section-panel">
          {items.map((item) => (
            <AbilityRow
              key={item.id}
              item={item}
              onOpenColossusSheet={onOpenColossusSheet}
              rowRef={item.id === 'colossus-slayer' ? colossusRowRef : undefined}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function AbilityRow({
  item,
  onOpenColossusSheet,
  rowRef,
}: {
  item: ReferenceItem
  onOpenColossusSheet: () => void
  rowRef?: RefObject<HTMLButtonElement | null>
}) {
  const canOpen = item.opensSheet === true
  const descriptionId = `${item.id}-detail-state`

  return (
    <button
      type="button"
      ref={rowRef}
      className={canOpen ? 'ability-row' : 'ability-row ability-row--future'}
      onClick={canOpen ? onOpenColossusSheet : undefined}
      aria-disabled={canOpen ? undefined : 'true'}
      aria-describedby={canOpen ? undefined : descriptionId}
    >
      <span className="ability-row__main">
        <span className="ability-row__title">{item.name}</span>
        <span className="ability-row__hint">{item.hint}</span>
      </span>
      <span className="ability-row__meta" aria-label={`${item.name} metadata`}>
        {item.meta.map((meta) => (
          <span className={badgeClassName(meta)} key={meta}>
            {meta}
          </span>
        ))}
      </span>
      <span className="ability-row__affordance">
        {canOpen ? 'Quick explanation' : 'Details planned'}
      </span>
      {!canOpen ? (
        <span id={descriptionId} className="sr-only">
          Detail sheet planned for a later slice.
        </span>
      ) : null}
    </button>
  )
}

function ColossusSlayerSheet({ onClose }: { onClose: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || dialogRef.current === null) {
        return
      }

      const focusable = getFocusableElements(dialogRef.current)

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="sheet-layer" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="colossus-sheet-title"
        aria-describedby="colossus-sheet-summary"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
          <div>
            <p className="eyebrow">Quick reference</p>
            <h2 id="colossus-sheet-title">Colossus Slayer</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="sheet-close"
            type="button"
            onClick={onClose}
            aria-label="Close Colossus Slayer quick reference"
          >
            Close
          </button>
        </div>

        <span className="badge badge--feature">Hunter feature</span>

        <p id="colossus-sheet-summary" className="sheet-summary">
          After you hit an enemy that is already wounded, add 1d8 damage.
        </p>

        <dl className="sheet-meta" aria-label="Colossus Slayer details">
          <div>
            <dt>Timing</dt>
            <dd>Once per turn</dd>
          </div>
          <div>
            <dt>Resource</dt>
            <dd>No limited use</dd>
          </div>
        </dl>

        <section className="reminder-block" aria-labelledby="remember-heading">
          <h3 id="remember-heading">Remember</h3>
          <p>The enemy must be below its hit point maximum before the hit.</p>
        </section>

        <div className="details-block">
          <button
            type="button"
            className="details-toggle"
            aria-expanded={isExpanded}
            aria-controls="colossus-more-details"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? 'Hide details' : 'Show more details'}
          </button>

          {isExpanded ? (
            <p id="colossus-more-details" className="details-copy">
              The bonus applies once per turn, not once per attack.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: 'hp' | 'ac'
}) {
  return (
    <div className={emphasis ? `stat stat--${emphasis}` : 'stat'}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function badgeClassName(label: string) {
  if (label === 'Action') {
    return 'badge badge--action'
  }

  if (label === 'Bonus Action') {
    return 'badge badge--bonus'
  }

  if (label === 'Concentration') {
    return 'badge badge--concentration'
  }

  if (label.includes('spell')) {
    return 'badge badge--spell'
  }

  if (label === 'Passive') {
    return 'badge badge--passive'
  }

  return 'badge badge--neutral'
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'))
}
