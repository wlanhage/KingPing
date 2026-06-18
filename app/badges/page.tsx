import { BADGES } from '@/lib/badges/badge-definitions';

const RARITY_ORDER = ['mythical', 'legendary', 'epic', 'rare', 'common'] as const;
const RARITY_LABEL: Record<string, string> = {
  mythical: 'Mytiska',
  legendary: 'Legendariska',
  epic: 'Episka',
  rare: 'Sällsynta',
  common: 'Vanliga',
};
const RARITY_TAG: Record<string, string> = {
  mythical: 'Mytisk',
  legendary: 'Legendarisk',
  epic: 'Episk',
  rare: 'Sällsynt',
  common: 'Vanlig',
};

export const metadata = { title: 'Utmärkelser' };

export default function BadgesPage() {
  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>Utmärkelser</h1>
        <p className='subtitle'>Alla {BADGES.length} bragder en riddare kan förtjäna i riket.</p>
      </section>

      {RARITY_ORDER.map((rarity) => {
        const items = BADGES.filter((b) => b.rarity === rarity);
        if (!items.length) return null;
        return (
          <section key={rarity} className='badge-codex-group'>
            <h2 className={`badge-codex-title rarity-text-${rarity}`}>
              {RARITY_LABEL[rarity]} <span>· {items.length}</span>
            </h2>
            <div className='badge-codex-grid'>
              {items.map((b) => (
                <article key={b.id} className={`badge-codex-card rarity-accent-${rarity}`}>
                  <div className={`badge-codex-medallion rarity-${rarity}`} aria-hidden>{b.emoji}</div>
                  <div className='badge-codex-body'>
                    <h3 className='badge-codex-name'>{b.name}</h3>
                    <span className={`badge-codex-rarity rarity-text-${rarity}`}>{RARITY_TAG[rarity]}</span>
                    <p className='badge-codex-desc'>{b.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
